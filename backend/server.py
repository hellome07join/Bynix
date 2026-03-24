from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Header
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
import jwt
import random
import httpx
import socketio
import asyncio
import base64
from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContent

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT Configuration
SECRET_KEY = os.environ.get("JWT_SECRET", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Socket.IO for WebSocket
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=True,
    engineio_logger=True
)
socket_app = socketio.ASGIApp(sio, socketio_path='socket.io')
app.mount('/ws', socket_app)

# ============= Models =============

class User(BaseModel):
    user_id: str
    email: EmailStr
    name: str
    picture: Optional[str] = None
    chart_picture: Optional[str] = None  # Separate picture for chart background
    demo_balance: float = 10000.0
    real_balance: float = 0.0
    # Separate balance tracking for withdrawal rules
    deposit_balance: float = 0.0  # Amount deposited
    bonus_balance: float = 0.0    # Bonus received (not withdrawable)
    profit_balance: float = 0.0   # Profit from trades (withdrawable)
    has_withdrawn: bool = False   # If user has ever withdrawn, bonus is forfeited
    is_admin: bool = False
    created_at: datetime

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    country: Optional[str] = None
    country_flag: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserSession(BaseModel):
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime

class Trade(BaseModel):
    trade_id: str
    user_id: str
    asset: str  # e.g., "BTC/USD"
    trade_type: str  # "call" or "put"
    amount: float
    entry_price: float
    exit_price: Optional[float] = None
    duration: int  # in seconds
    payout_percentage: float = 80.0
    status: str = "pending"  # pending, won, lost
    profit_loss: float = 0.0
    account_type: str = "demo"  # demo or real
    created_at: datetime
    settled_at: Optional[datetime] = None

class TradeCreate(BaseModel):
    asset: str
    trade_type: str
    amount: float
    duration: int
    entry_price: float
    account_type: str = "demo"

class Asset(BaseModel):
    asset_id: str
    symbol: str  # e.g., "BTC/USD"
    name: str
    category: str  # crypto, forex, stocks
    payout_percentage: float = 80.0
    is_active: bool = True

class Transaction(BaseModel):
    transaction_id: str
    user_id: str
    type: str  # deposit, withdrawal
    amount: float
    status: str = "pending"  # pending, completed, rejected
    currency: str = "USDT"  # USDT, BTC, ETH, LTC
    network: str = "TRC-20"  # TRC-20, Bitcoin, ERC20, Litecoin
    crypto_address: Optional[str] = None
    txn_hash: Optional[str] = None
    account_type: str = "real"
    created_at: datetime
    completed_at: Optional[datetime] = None

class DepositRequest(BaseModel):
    amount: float

class WithdrawalRequest(BaseModel):
    amount: float
    crypto_address: str

class OTPVerification(BaseModel):
    email: EmailStr
    otp: str

class PasswordReset(BaseModel):
    email: EmailStr
    otp: str
    new_password: str

class TradeSettle(BaseModel):
    exit_price: float

# Chart Data Models
class ChartTick(BaseModel):
    time: int
    open: float
    high: float
    low: float
    close: float

class ChartDataRequest(BaseModel):
    symbol: str
    ticks: List[ChartTick]

class ChartDataResponse(BaseModel):
    symbol: str
    ticks: List[ChartTick]
    last_updated: datetime

# Notification Models
class Notification(BaseModel):
    notification_id: str
    user_id: str
    title: str
    message: str
    type: str  # trade, deposit, withdrawal, system, promo
    is_read: bool = False
    data: Optional[dict] = None
    created_at: datetime

class NotificationCreate(BaseModel):
    title: str
    message: str
    type: str = "system"
    data: Optional[dict] = None

# ============= Helper Functions =============

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def generate_otp() -> str:
    return str(random.randint(100000, 999999))

def generate_crypto_address() -> str:
    """Generate a mock cryptocurrency address"""
    return "0x" + "".join(random.choices("0123456789abcdef", k=40))

async def get_current_user(authorization: Optional[str] = Header(None), request: Request = None) -> User:
    """Get current user from session token (cookie or header)"""
    token = None
    
    # Try to get from cookie first
    if request:
        token = request.cookies.get("session_token")
    
    # Fallback to Authorization header
    if not token and authorization:
        if authorization.startswith("Bearer "):
            token = authorization.replace("Bearer ", "")
        else:
            token = authorization
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        # Check if it's a JWT token
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get("sub")
            if not user_id:
                raise HTTPException(status_code=401, detail="Invalid token")
        except jwt.InvalidTokenError:
            # If not JWT, treat as session token from OAuth
            session_doc = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
            if not session_doc:
                raise HTTPException(status_code=401, detail="Session not found")
            
            # Check expiry
            expires_at = session_doc["expires_at"]
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at < datetime.now(timezone.utc):
                raise HTTPException(status_code=401, detail="Session expired")
            
            user_id = session_doc["user_id"]
        
        # Get user from database
        user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        if not user_doc:
            raise HTTPException(status_code=401, detail="User not found")
        
        return User(**user_doc)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

# ============= Authentication Routes =============

@api_router.post("/auth/signup")
async def signup(user: UserCreate):
    """Register a new user with email and password"""
    # Check if user exists
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    hashed_password = hash_password(user.password)
    otp = generate_otp()
    
    # Generate unique account ID (incremental starting from 10000001)
    last_user = await db.users.find_one(
        {"account_id": {"$exists": True}},
        sort=[("account_id", -1)]
    )
    if last_user and last_user.get("account_id"):
        try:
            account_id = int(last_user["account_id"]) + 1
        except:
            account_id = 10000001
    else:
        account_id = 10000001
    
    new_user = {
        "user_id": user_id,
        "account_id": str(account_id),
        "email": user.email,
        "name": user.name,
        "full_name": user.name,
        "nickname": None,
        "country": user.country,
        "country_flag": user.country_flag or "🌍",
        "password": hashed_password,
        "picture": None,
        "demo_balance": 10000.0,
        "real_balance": 0.0,
        "bonus_balance": 0.0,
        "is_admin": False,
        "is_verified": False,
        "otp": otp,
        "otp_created_at": datetime.now(timezone.utc),
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.users.insert_one(new_user)
    
    # In production, send OTP via email
    # For now, return it in response (ONLY FOR DEVELOPMENT)
    return {
        "message": "User created successfully. Please verify your email.",
        "user_id": user_id,
        "account_id": str(account_id),
        "otp": otp  # Remove this in production
    }

@api_router.post("/auth/verify-otp")
async def verify_otp(verification: OTPVerification):
    """Verify OTP and activate account"""
    user_doc = await db.users.find_one({"email": verification.email})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_doc.get("is_verified"):
        raise HTTPException(status_code=400, detail="User already verified")
    
    if user_doc.get("otp") != verification.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    # Check OTP expiry (10 minutes)
    otp_created = user_doc.get("otp_created_at")
    if isinstance(otp_created, str):
        otp_created = datetime.fromisoformat(otp_created)
    if otp_created.tzinfo is None:
        otp_created = otp_created.replace(tzinfo=timezone.utc)
    
    if datetime.now(timezone.utc) - otp_created > timedelta(minutes=10):
        raise HTTPException(status_code=400, detail="OTP expired")
    
    # Mark as verified
    await db.users.update_one(
        {"email": verification.email},
        {"$set": {"is_verified": True}, "$unset": {"otp": "", "otp_created_at": ""}}
    )
    
    # Create JWT token
    access_token = create_access_token(data={"sub": user_doc["user_id"]})
    
    return {
        "message": "Email verified successfully",
        "access_token": access_token,
        "token_type": "bearer"
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    """Login with email and password"""
    user_doc = await db.users.find_one({"email": credentials.email})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(credentials.password, user_doc["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not user_doc.get("is_verified", False):
        raise HTTPException(status_code=401, detail="Please verify your email first")
    
    # Create JWT token
    access_token = create_access_token(data={"sub": user_doc["user_id"]})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "user_id": user_doc["user_id"],
            "email": user_doc["email"],
            "name": user_doc["name"],
            "demo_balance": user_doc["demo_balance"],
            "real_balance": user_doc["real_balance"]
        }
    }

@api_router.post("/auth/request-password-reset")
async def request_password_reset(email: EmailStr):
    """Request password reset OTP"""
    user_doc = await db.users.find_one({"email": email})
    if not user_doc:
        # Don't reveal if email exists
        return {"message": "If email exists, OTP has been sent"}
    
    otp = generate_otp()
    await db.users.update_one(
        {"email": email},
        {"$set": {"reset_otp": otp, "reset_otp_created_at": datetime.now(timezone.utc)}}
    )
    
    # In production, send OTP via email
    return {"message": "OTP sent to email", "otp": otp}  # Remove otp in production

@api_router.post("/auth/reset-password")
async def reset_password(reset: PasswordReset):
    """Reset password with OTP"""
    user_doc = await db.users.find_one({"email": reset.email})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_doc.get("reset_otp") != reset.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    # Check OTP expiry
    otp_created = user_doc.get("reset_otp_created_at")
    if isinstance(otp_created, str):
        otp_created = datetime.fromisoformat(otp_created)
    if otp_created.tzinfo is None:
        otp_created = otp_created.replace(tzinfo=timezone.utc)
    
    if datetime.now(timezone.utc) - otp_created > timedelta(minutes=10):
        raise HTTPException(status_code=400, detail="OTP expired")
    
    # Update password
    hashed_password = hash_password(reset.new_password)
    await db.users.update_one(
        {"email": reset.email},
        {"$set": {"password": hashed_password}, "$unset": {"reset_otp": "", "reset_otp_created_at": ""}}
    )
    
    return {"message": "Password reset successfully"}

# REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
@api_router.get("/auth/google/session")
async def google_session(session_id: str = Header(None, alias="X-Session-ID")):
    """Exchange session_id for user data (OAuth callback)"""
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session_id")
    
    try:
        # Call Emergent Auth API
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
            
            session_data = response.json()
        
        # Check if user exists
        user_doc = await db.users.find_one({"email": session_data["email"]}, {"_id": 0})
        
        if user_doc:
            # Update existing user
            user_id = user_doc["user_id"]
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {"name": session_data["name"], "picture": session_data["picture"]}}
            )
        else:
            # Create new user
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            new_user = {
                "user_id": user_id,
                "email": session_data["email"],
                "name": session_data["name"],
                "picture": session_data["picture"],
                "demo_balance": 10000.0,
                "real_balance": 0.0,
                "is_admin": False,
                "is_verified": True,
                "created_at": datetime.now(timezone.utc)
            }
            await db.users.insert_one(new_user)
        
        # Store session
        session_token = session_data["session_token"]
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        
        await db.user_sessions.insert_one({
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": expires_at,
            "created_at": datetime.now(timezone.utc)
        })
        
        # Get updated user
        user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password": 0})
        
        return {
            "session_token": session_token,
            "user": user_doc
        }
    
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Failed to authenticate: {str(e)}")

@api_router.get("/auth/me")
async def get_me(authorization: Optional[str] = Header(None), request: Request = None):
    """Get current user info"""
    user = await get_current_user(authorization, request)
    
    # Get user document to fetch all balance fields
    user_doc = await db.users.find_one({"user_id": user.user_id})
    if user_doc:
        deposit_balance = user_doc.get("deposit_balance", 0)
        bonus_balance = user_doc.get("bonus_balance", 0)
        profit_balance = user_doc.get("profit_balance", 0)
        has_withdrawn = user_doc.get("has_withdrawn", False)
    else:
        deposit_balance = 0
        bonus_balance = 0
        profit_balance = 0
        has_withdrawn = False
    
    # Total balance in account (includes bonus + real_balance for backward compatibility)
    # If new balance fields are 0, use real_balance as fallback
    if deposit_balance == 0 and bonus_balance == 0 and profit_balance == 0:
        total_balance = user.real_balance
    else:
        total_balance = deposit_balance + bonus_balance + profit_balance
    
    # Available for withdrawal (deposit + profit only, no bonus, or real_balance for old users)
    if deposit_balance == 0 and profit_balance == 0:
        withdrawable_balance = user.real_balance
    else:
        withdrawable_balance = deposit_balance + profit_balance
    
    return {
        "user_id": user.user_id,
        "email": user.email,
        "name": user.name,
        "picture": user.picture,
        "chart_picture": user_doc.get("chart_picture") if user_doc else None,
        "demo_balance": user.demo_balance,
        "real_balance": user.real_balance,
        "deposit_balance": deposit_balance,
        "bonus_balance": bonus_balance,
        "profit_balance": profit_balance,
        "total_balance": total_balance,
        "withdrawable_balance": withdrawable_balance,
        "has_withdrawn": has_withdrawn,
        "is_admin": user.is_admin
    }

@api_router.post("/auth/logout")
async def logout(request: Request):
    """Logout user"""
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    return {"message": "Logged out successfully"}

# ============= Trading Routes =============

@api_router.get("/assets")
async def get_assets():
    """Get all tradeable assets"""
    # Create default assets if none exist
    count = await db.assets.count_documents({})
    if count == 0:
        default_assets = [
            {"asset_id": str(uuid.uuid4()), "symbol": "BTC/USD", "name": "Bitcoin", "category": "crypto", "payout_percentage": 80.0, "is_active": True},
            {"asset_id": str(uuid.uuid4()), "symbol": "ETH/USD", "name": "Ethereum", "category": "crypto", "payout_percentage": 80.0, "is_active": True},
            {"asset_id": str(uuid.uuid4()), "symbol": "EUR/USD", "name": "Euro/Dollar", "category": "forex", "payout_percentage": 75.0, "is_active": True},
            {"asset_id": str(uuid.uuid4()), "symbol": "GBP/USD", "name": "Pound/Dollar", "category": "forex", "payout_percentage": 75.0, "is_active": True},
            {"asset_id": str(uuid.uuid4()), "symbol": "AAPL", "name": "Apple Inc.", "category": "stocks", "payout_percentage": 70.0, "is_active": True},
        ]
        await db.assets.insert_many(default_assets)
    
    assets = await db.assets.find({"is_active": True}, {"_id": 0}).to_list(100)
    return assets

@api_router.post("/trades")
async def create_trade(trade: TradeCreate, authorization: Optional[str] = Header(None), request: Request = None):
    """Place a new trade"""
    user = await get_current_user(authorization, request)
    
    # Get user document to check bonus_balance
    user_doc = await db.users.find_one({"user_id": user.user_id})
    bonus_balance = user_doc.get("bonus_balance", 0) if user_doc else 0
    
    if trade.account_type == "demo":
        # Demo account - simple balance check
        if user.demo_balance < trade.amount:
            raise HTTPException(status_code=400, detail="Insufficient balance")
        
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$inc": {"demo_balance": -trade.amount}}
        )
        deducted_from_real = 0
        deducted_from_bonus = 0
    else:
        # Real account - use real_balance first, then bonus_balance
        total_available = user.real_balance + bonus_balance
        if total_available < trade.amount:
            raise HTTPException(status_code=400, detail="Insufficient balance")
        
        # Calculate how much to deduct from each balance
        deducted_from_real = min(user.real_balance, trade.amount)
        deducted_from_bonus = trade.amount - deducted_from_real
        
        # Update balances
        update_fields = {}
        if deducted_from_real > 0:
            update_fields["real_balance"] = -deducted_from_real
        if deducted_from_bonus > 0:
            update_fields["bonus_balance"] = -deducted_from_bonus
        
        if update_fields:
            await db.users.update_one(
                {"user_id": user.user_id},
                {"$inc": update_fields}
            )
    
    # For DEMO accounts only: Predetermine outcome for 90% win rate
    # For REAL accounts: Use actual price movement (no manipulation)
    predetermined_outcome = None
    
    if trade.account_type == "demo":
        # Check if there's already an active demo trade for consistency
        existing_active_trade = await db.trades.find_one({
            "user_id": user.user_id,
            "status": "pending",
            "account_type": "demo"
        }, sort=[("created_at", -1)])
        
        if existing_active_trade and existing_active_trade.get("predetermined_outcome"):
            predetermined_outcome = existing_active_trade["predetermined_outcome"]
        else:
            # Demo: 90% win rate to encourage users
            win_probability = 0.90
            predetermined_won = random.random() < win_probability
            predetermined_outcome = "won" if predetermined_won else "lost"
    # Real account: predetermined_outcome stays None - will use actual price
    
    # Create trade
    trade_id = f"trade_{uuid.uuid4().hex[:12]}"
    new_trade = {
        "trade_id": trade_id,
        "user_id": user.user_id,
        "asset": trade.asset,
        "trade_type": trade.trade_type,
        "amount": trade.amount,
        "entry_price": trade.entry_price,
        "exit_price": None,
        "duration": trade.duration,
        "payout_percentage": 80.0,
        "status": "pending",
        "profit_loss": 0.0,
        "account_type": trade.account_type,
        "predetermined_outcome": predetermined_outcome,  # None for real accounts
        "deducted_from_real": deducted_from_real if trade.account_type == "real" else 0,
        "deducted_from_bonus": deducted_from_bonus if trade.account_type == "real" else 0,
        "created_at": datetime.now(timezone.utc),
        "expires_at": datetime.now(timezone.utc) + timedelta(seconds=trade.duration),
        "settled_at": None
    }
    
    await db.trades.insert_one(new_trade)
    
    return {"trade_id": trade_id, "message": "Trade placed successfully"}

@api_router.get("/trades")
async def get_trades(authorization: Optional[str] = Header(None), request: Request = None, limit: int = 50):
    """Get user's trade history"""
    user = await get_current_user(authorization, request)
    
    trades = await db.trades.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return trades

@api_router.get("/trades/history")
async def get_trade_history(
    authorization: Optional[str] = Header(None), 
    request: Request = None, 
    limit: int = 50,
    account_type: Optional[str] = None
):
    """Get user's formatted trade history for display"""
    user = await get_current_user(authorization, request)
    
    # Build query filter
    query_filter = {"user_id": user.user_id}
    if account_type and account_type in ["demo", "real"]:
        query_filter["account_type"] = account_type
    
    trades = await db.trades.find(
        query_filter,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Format trades for frontend display
    formatted_trades = []
    for trade in trades:
        created_at = trade.get("created_at")
        if created_at:
            # Calculate time ago
            now = datetime.now(timezone.utc)
            if isinstance(created_at, str):
                created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            elif isinstance(created_at, datetime) and created_at.tzinfo is None:
                # Make timezone-naive datetime timezone-aware (assume UTC)
                created_at = created_at.replace(tzinfo=timezone.utc)
            diff = now - created_at
            if diff.days > 0:
                time_ago = f"{diff.days}d ago"
            elif diff.seconds >= 3600:
                time_ago = f"{diff.seconds // 3600}h ago"
            elif diff.seconds >= 60:
                time_ago = f"{diff.seconds // 60}m ago"
            else:
                time_ago = f"{diff.seconds}s ago"
        else:
            time_ago = "just now"
            
        formatted_trades.append({
            "trade_id": trade.get("trade_id"),
            "asset": trade.get("asset", "EUR/USD OTC"),
            "type": trade.get("trade_type", "call"),
            "entry_price": trade.get("entry_price", 0),
            "exit_price": trade.get("exit_price", 0),
            "amount": trade.get("amount", 0),
            "profit_loss": trade.get("profit_loss", 0),
            "status": trade.get("status", "pending"),
            "account_type": trade.get("account_type", "demo"),
            "time_ago": time_ago,
            "created_at": str(created_at) if created_at else None
        })
    
    return {"trades": formatted_trades}

@api_router.get("/trades/stats")
async def get_trade_stats(authorization: Optional[str] = Header(None), request: Request = None, limit: int = 500):
    """Get user's trading statistics"""
    user = await get_current_user(authorization, request)
    
    # Optimized query with projection to only fetch needed fields
    all_trades = await db.trades.find(
        {"user_id": user.user_id}, 
        {"_id": 0, "status": 1, "profit_loss": 1}
    ).limit(limit).to_list(limit)
    
    total_trades = len(all_trades)
    won_trades = len([t for t in all_trades if t.get("status") == "won"])
    lost_trades = len([t for t in all_trades if t.get("status") == "lost"])
    total_profit = sum(t.get("profit_loss", 0) for t in all_trades)
    win_rate = (won_trades / total_trades * 100) if total_trades > 0 else 0
    
    return {
        "total_trades": total_trades,
        "won_trades": won_trades,
        "lost_trades": lost_trades,
        "total_profit": total_profit,
        "win_rate": win_rate
    }

@api_router.post("/trades/{trade_id}/settle")
async def settle_trade(trade_id: str, settle_data: TradeSettle, authorization: Optional[str] = Header(None), request: Request = None):
    """Settle a trade - Demo uses predetermined outcome, Real uses actual price"""
    user = await get_current_user(authorization, request)
    
    trade = await db.trades.find_one({"trade_id": trade_id, "user_id": user.user_id})
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    
    if trade["status"] != "pending":
        raise HTTPException(status_code=400, detail="Trade already settled")
    
    entry_price = trade["entry_price"]
    trade_type = trade["trade_type"]
    exit_price = settle_data.exit_price
    
    # Determine win/loss based on account type
    predetermined_outcome = trade.get("predetermined_outcome")
    
    if predetermined_outcome:
        # DEMO account: Use predetermined outcome (90% win rate)
        won = predetermined_outcome == "won"
        
        # Adjust exit price to match predetermined outcome for visual consistency
        price_diff = abs(exit_price - entry_price)
        if price_diff == 0:
            price_diff = entry_price * 0.0001
        
        if trade_type == "call":
            if won:
                exit_price = entry_price + price_diff if exit_price <= entry_price else exit_price
            else:
                exit_price = entry_price - price_diff if exit_price > entry_price else exit_price
        else:  # put
            if won:
                exit_price = entry_price - price_diff if exit_price >= entry_price else exit_price
            else:
                exit_price = entry_price + price_diff if exit_price < entry_price else exit_price
    else:
        # REAL account: Use ACTUAL price movement (like demo account's natural behavior)
        # CALL wins if price goes UP, PUT wins if price goes DOWN
        if trade_type == "call":
            won = exit_price > entry_price
        else:  # put
            won = exit_price < entry_price
        
        # If price is exactly same, it's a loss
        if exit_price == entry_price:
            won = False
    
    status = "won" if won else "lost"
    profit_loss = trade["amount"] * (trade["payout_percentage"] / 100) if won else -trade["amount"]
    
    # Update trade
    await db.trades.update_one(
        {"trade_id": trade_id},
        {"$set": {
            "exit_price": exit_price,
            "status": status,
            "profit_loss": profit_loss,
            "settled_at": datetime.now(timezone.utc)
        }}
    )
    
    # Update user balance
    if trade["account_type"] == "demo":
        # Demo account - simple balance update
        if won:
            payout = trade["amount"] + profit_loss
            await db.users.update_one(
                {"user_id": user.user_id},
                {"$inc": {"demo_balance": payout}}
            )
    else:
        # Real account - profits go to real_balance (withdrawable)
        if won:
            # Payout = original amount + profit
            payout = trade["amount"] + profit_loss
            # ALL winnings go to real_balance (withdrawable)
            await db.users.update_one(
                {"user_id": user.user_id},
                {"$inc": {"real_balance": payout}}
            )
        # If lost, the amount was already deducted when trade was placed
    
    return {"message": "Trade settled", "status": status, "profit_loss": profit_loss, "exit_price": exit_price, "entry_price": entry_price}

# ============= Wallet Routes =============

@api_router.post("/wallet/deposit")
async def request_deposit(deposit: DepositRequest, authorization: Optional[str] = Header(None), request: Request = None):
    """Request crypto deposit (mock)"""
    user = await get_current_user(authorization, request)
    
    # Generate mock deposit address
    crypto_address = generate_crypto_address()
    transaction_id = f"txn_{uuid.uuid4().hex[:12]}"
    
    new_transaction = {
        "transaction_id": transaction_id,
        "user_id": user.user_id,
        "type": "deposit",
        "amount": deposit.amount,
        "status": "pending",
        "crypto_address": crypto_address,
        "txn_hash": None,
        "account_type": "real",
        "created_at": datetime.now(timezone.utc),
        "completed_at": None
    }
    
    await db.transactions.insert_one(new_transaction)
    
    return {
        "transaction_id": transaction_id,
        "crypto_address": crypto_address,
        "amount": deposit.amount,
        "message": "Send crypto to this address"
    }

@api_router.post("/wallet/withdraw")
async def request_withdrawal(withdrawal: WithdrawalRequest, authorization: Optional[str] = Header(None), request: Request = None):
    """Request withdrawal"""
    user = await get_current_user(authorization, request)
    
    if user.real_balance < withdrawal.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    transaction_id = f"txn_{uuid.uuid4().hex[:12]}"
    
    new_transaction = {
        "transaction_id": transaction_id,
        "user_id": user.user_id,
        "type": "withdrawal",
        "amount": withdrawal.amount,
        "status": "pending",
        "crypto_address": withdrawal.crypto_address,
        "txn_hash": None,
        "account_type": "real",
        "created_at": datetime.now(timezone.utc),
        "completed_at": None
    }
    
    await db.transactions.insert_one(new_transaction)
    
    # Deduct from balance (pending approval)
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$inc": {"real_balance": -withdrawal.amount}}
    )
    
    return {"transaction_id": transaction_id, "message": "Withdrawal request submitted"}

@api_router.get("/wallet/transactions")
async def get_transactions(authorization: Optional[str] = Header(None), request: Request = None):
    """Get user's transaction history with summary stats"""
    user = await get_current_user(authorization, request)
    
    # Fetch from transactions collection
    transactions = await db.transactions.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Also fetch from deposits collection (NOWPayments deposits)
    deposits = await db.deposits.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Merge deposits into transactions format
    for dep in deposits:
        tx = {
            "transaction_id": dep.get("payment_id") or dep.get("transaction_id"),
            "user_id": dep.get("user_id"),
            "type": "deposit",
            "amount": dep.get("amount", 0),
            "status": dep.get("status", "pending"),
            "currency": dep.get("pay_currency", "USDT"),
            "network": dep.get("network", "TRC20"),
            "crypto_address": dep.get("pay_address"),
            "created_at": dep.get("created_at"),
            "bonus_amount": dep.get("bonus_amount", 0),
            "total_credit": dep.get("total_credit", dep.get("amount", 0))
        }
        # Only add if not already in transactions
        if not any(t.get("transaction_id") == tx["transaction_id"] for t in transactions):
            transactions.append(tx)
    
    # Sort all by created_at descending
    transactions.sort(key=lambda x: x.get("created_at") or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    
    # Calculate summary statistics
    total_deposits = 0
    total_deposit_amount = 0.0
    total_withdrawals = 0
    total_withdrawal_amount = 0.0
    
    for tx in transactions:
        if tx.get("type") == "deposit":
            total_deposits += 1
            if tx.get("status") in ["completed", "confirmed", "finished"]:
                total_deposit_amount += tx.get("amount", 0)
        elif tx.get("type") == "withdrawal":
            total_withdrawals += 1
            if tx.get("status") == "completed":
                total_withdrawal_amount += tx.get("amount", 0)
    
    return {
        "transactions": transactions,
        "summary": {
            "total_deposits": total_deposits,
            "total_deposit_amount": total_deposit_amount,
            "total_withdrawals": total_withdrawals,
            "total_withdrawal_amount": total_withdrawal_amount
        }
    }

# ============= Notification Routes =============

@api_router.get("/notifications")
async def get_notifications(authorization: Optional[str] = Header(None), request: Request = None):
    """Get user's notifications"""
    user = await get_current_user(authorization, request)
    
    notifications = await db.notifications.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    
    # Count unread
    unread_count = await db.notifications.count_documents({
        "user_id": user.user_id,
        "is_read": False
    })
    
    return {
        "notifications": notifications,
        "unread_count": unread_count
    }

@api_router.post("/notifications/read/{notification_id}")
async def mark_notification_read(notification_id: str, authorization: Optional[str] = Header(None), request: Request = None):
    """Mark a notification as read"""
    user = await get_current_user(authorization, request)
    
    result = await db.notifications.update_one(
        {"notification_id": notification_id, "user_id": user.user_id},
        {"$set": {"is_read": True}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"success": True}

@api_router.post("/notifications/read-all")
async def mark_all_notifications_read(authorization: Optional[str] = Header(None), request: Request = None):
    """Mark all notifications as read"""
    user = await get_current_user(authorization, request)
    
    await db.notifications.update_many(
        {"user_id": user.user_id, "is_read": False},
        {"$set": {"is_read": True}}
    )
    
    return {"success": True}

@api_router.delete("/notifications/{notification_id}")
async def delete_notification(notification_id: str, authorization: Optional[str] = Header(None), request: Request = None):
    """Delete a notification"""
    user = await get_current_user(authorization, request)
    
    result = await db.notifications.delete_one(
        {"notification_id": notification_id, "user_id": user.user_id}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"success": True}

# Helper function to create notifications
async def create_notification(user_id: str, title: str, message: str, notif_type: str, data: dict = None):
    """Create a notification for a user"""
    notification = {
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "title": title,
        "message": message,
        "type": notif_type,
        "is_read": False,
        "data": data,
        "created_at": datetime.now(timezone.utc)
    }
    await db.notifications.insert_one(notification)
    return notification

# ============= Leaderboard Routes =============

@api_router.get("/leaderboard")
async def get_leaderboard():
    """Get top traders leaderboard for last 24 hours"""
    # Calculate the time 24 hours ago
    time_24h_ago = datetime.now(timezone.utc) - timedelta(hours=24)
    
    # Aggregate trades to get profit/loss per user in last 24 hours
    pipeline = [
        {
            "$match": {
                "settled_at": {"$gte": time_24h_ago},
                "status": {"$in": ["won", "lost"]},
            }
        },
        {
            "$group": {
                "_id": "$user_id",
                "total_profit": {"$sum": "$profit_loss"},
                "total_trades": {"$sum": 1},
                "won_trades": {
                    "$sum": {"$cond": [{"$eq": ["$status", "won"]}, 1, 0]}
                },
                "total_volume": {"$sum": "$amount"},
            }
        },
        {
            "$sort": {"total_profit": -1}  # Sort by profit descending (highest profit first, then losses)
        },
        {
            "$limit": 100
        }
    ]
    
    results = await db.trades.aggregate(pipeline).to_list(100)
    
    # Fetch user details for each result
    leaderboard = []
    for i, result in enumerate(results):
        user = await db.users.find_one(
            {"user_id": result["_id"]},
            {"_id": 0, "user_id": 1, "name": 1, "full_name": 1, "nickname": 1, "account_id": 1, "country": 1, "country_flag": 1}
        )
        
        if user:
            win_rate = (result["won_trades"] / result["total_trades"] * 100) if result["total_trades"] > 0 else 0
            # Use nickname if set, otherwise use ID: {account_id}
            display_name = user.get("nickname")
            if not display_name:
                account_id = user.get("account_id", result['_id'][-8:])
                display_name = f"ID: {account_id}"
            leaderboard.append({
                "rank": i + 1,
                "user_id": result["_id"],
                "name": display_name,
                "country": user.get("country", "Unknown"),
                "country_flag": user.get("country_flag", "🌍"),
                "profit": round(result["total_profit"], 2),
                "is_profit": result["total_profit"] >= 0,  # True for profit, False for loss
                "total_trades": result["total_trades"],
                "win_rate": round(win_rate, 1),
                "volume": round(result["total_volume"], 2),
            })
    
    return {
        "leaderboard": leaderboard,
        "total_traders": len(leaderboard),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

@api_router.get("/leaderboard/my-stats")
async def get_my_leaderboard_stats(authorization: Optional[str] = Header(None), request: Request = None):
    """Get current user's leaderboard stats and position"""
    user = await get_current_user(authorization, request)
    
    # Get user's profile for nickname and country
    user_doc = await db.users.find_one(
        {"user_id": user.user_id},
        {"nickname": 1, "account_id": 1, "country": 1, "country_flag": 1, "name": 1, "full_name": 1}
    )
    
    # Determine display name (nickname or ID: account_id)
    display_name = user_doc.get("nickname") if user_doc else None
    if not display_name:
        account_id = user_doc.get("account_id") if user_doc else None
        if account_id:
            display_name = f"ID: {account_id}"
        else:
            display_name = user_doc.get("full_name") or user_doc.get("name") or user.name
    
    country_flag = user_doc.get("country_flag", "🌍") if user_doc else "🌍"
    
    # Calculate the time 24 hours ago
    time_24h_ago = datetime.now(timezone.utc) - timedelta(hours=24)
    
    # Get user's stats for last 24 hours
    user_stats_pipeline = [
        {
            "$match": {
                "user_id": user.user_id,
                "settled_at": {"$gte": time_24h_ago},
                "status": {"$in": ["won", "lost"]},
            }
        },
        {
            "$group": {
                "_id": "$user_id",
                "total_profit": {"$sum": "$profit_loss"},
                "total_trades": {"$sum": 1},
                "won_trades": {
                    "$sum": {"$cond": [{"$eq": ["$status", "won"]}, 1, 0]}
                },
                "total_volume": {"$sum": "$amount"},
            }
        }
    ]
    
    user_results = await db.trades.aggregate(user_stats_pipeline).to_list(1)
    
    if not user_results:
        return {
            "user_id": user.user_id,
            "name": display_name,
            "country_flag": country_flag,
            "profit": 0,
            "total_trades": 0,
            "win_rate": 0,
            "volume": 0,
            "position": "100+",  # User hasn't traded in last 24h
        }
    
    user_stats = user_results[0]
    win_rate = (user_stats["won_trades"] / user_stats["total_trades"] * 100) if user_stats["total_trades"] > 0 else 0
    
    # Calculate user's position by counting users with higher profit
    position_pipeline = [
        {
            "$match": {
                "settled_at": {"$gte": time_24h_ago},
                "status": {"$in": ["won", "lost"]},
            }
        },
        {
            "$group": {
                "_id": "$user_id",
                "total_profit": {"$sum": "$profit_loss"},
            }
        },
        {
            "$match": {
                "total_profit": {"$gt": user_stats["total_profit"]}
            }
        },
        {
            "$count": "higher_ranked"
        }
    ]
    
    position_result = await db.trades.aggregate(position_pipeline).to_list(1)
    position = (position_result[0]["higher_ranked"] + 1) if position_result else 1
    
    # Format position
    position_str = str(position) if position <= 100 else "100+"
    
    return {
        "user_id": user.user_id,
        "name": display_name,
        "country_flag": country_flag,
        "profit": round(user_stats["total_profit"], 2),
        "total_trades": user_stats["total_trades"],
        "win_rate": round(win_rate, 1),
        "volume": round(user_stats["total_volume"], 2),
        "position": position_str,
    }

@api_router.get("/leaderboard/user/{user_id}")
async def get_leaderboard_user_profile(user_id: str):
    """Get detailed profile of a user for leaderboard popup"""
    
    # Get user's profile info
    user_doc = await db.users.find_one(
        {"user_id": user_id},
        {
            "user_id": 1, "account_id": 1, "nickname": 1, "full_name": 1, "name": 1,
            "country": 1, "country_flag": 1, "picture": 1, "demo_balance": 1,
            "real_balance": 1, "created_at": 1
        }
    )
    
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Determine display name
    display_name = user_doc.get("nickname")
    if not display_name:
        account_id = user_doc.get("account_id")
        if account_id:
            display_name = f"ID: {account_id}"
        else:
            display_name = user_doc.get("full_name") or user_doc.get("name") or "Trader"
    
    # Get all-time trading stats
    stats_pipeline = [
        {
            "$match": {
                "user_id": user_id,
                "status": {"$in": ["won", "lost"]},
            }
        },
        {
            "$group": {
                "_id": "$user_id",
                "total_trades": {"$sum": 1},
                "won_trades": {
                    "$sum": {"$cond": [{"$eq": ["$status", "won"]}, 1, 0]}
                },
                "total_profit": {"$sum": "$profit_loss"},
                "total_volume": {"$sum": "$amount"},
                "min_amount": {"$min": "$amount"},
                "max_amount": {"$max": "$amount"},
            }
        }
    ]
    
    stats_results = await db.trades.aggregate(stats_pipeline).to_list(1)
    
    # Default stats if no trades
    if not stats_results:
        stats = {
            "total_trades": 0,
            "won_trades": 0,
            "total_profit": 0,
            "total_volume": 0,
            "min_amount": 0,
            "max_amount": 0,
        }
    else:
        stats = stats_results[0]
    
    # Calculate derived stats
    total_trades = stats.get("total_trades", 0)
    won_trades = stats.get("won_trades", 0)
    total_profit = stats.get("total_profit", 0)
    avg_profit = total_profit / total_trades if total_trades > 0 else 0
    
    # Determine account level based on volume
    total_volume = stats.get("total_volume", 0)
    if total_volume >= 100000:
        account_level = "VIP Diamond"
        level_color = "#00E5FF"
    elif total_volume >= 50000:
        account_level = "VIP Gold"
        level_color = "#FFD700"
    elif total_volume >= 10000:
        account_level = "VIP Silver"
        level_color = "#C0C0C0"
    elif total_volume >= 1000:
        account_level = "Bronze"
        level_color = "#CD7F32"
    else:
        account_level = "Starter"
        level_color = "#00E55A"
    
    return {
        "user_id": user_id,
        "name": display_name,
        "country": user_doc.get("country", "Unknown"),
        "country_flag": user_doc.get("country_flag", "🌍"),
        "picture": user_doc.get("picture"),
        "account_level": account_level,
        "level_color": level_color,
        "trades_count": total_trades,
        "profitable_trades": won_trades,
        "trades_profit": round(total_profit, 2),
        "average_profit": round(avg_profit, 2),
        "min_trade_amount": round(stats.get("min_amount", 0), 2),
        "max_trade_amount": round(stats.get("max_amount", 0), 2),
    }

# ============= Profile Stats Routes =============

@api_router.get("/profile/stats")
async def get_profile_stats(authorization: Optional[str] = Header(None), request: Request = None):
    """Get user's trading statistics"""
    user = await get_current_user(authorization, request)
    
    # Get user's profile info
    user_doc = await db.users.find_one(
        {"user_id": user.user_id},
        {"account_id": 1, "nickname": 1, "full_name": 1, "name": 1, "country": 1, "country_flag": 1}
    )
    
    # Ensure user has account_id (migration for existing users)
    if user_doc and not user_doc.get("account_id"):
        last_user = await db.users.find_one(
            {"account_id": {"$exists": True}},
            sort=[("account_id", -1)]
        )
        if last_user and last_user.get("account_id"):
            try:
                new_account_id = int(last_user["account_id"]) + 1
            except:
                new_account_id = 10000001
        else:
            new_account_id = 10000001
        
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$set": {"account_id": str(new_account_id)}}
        )
        user_doc["account_id"] = str(new_account_id)
    
    # Get all-time stats
    all_time_pipeline = [
        {
            "$match": {
                "user_id": user.user_id,
                "status": {"$in": ["won", "lost"]},
            }
        },
        {
            "$group": {
                "_id": "$user_id",
                "total_trades": {"$sum": 1},
                "won_trades": {
                    "$sum": {"$cond": [{"$eq": ["$status", "won"]}, 1, 0]}
                },
                "total_volume": {"$sum": "$amount"},
                "net_pnl": {"$sum": "$profit_loss"},
            }
        }
    ]
    
    results = await db.trades.aggregate(all_time_pipeline).to_list(1)
    
    if not results:
        return {
            "total_trades": 0,
            "win_rate": 0,
            "volume": 0,
            "net_pnl": 0,
            "account_id": user_doc.get("account_id") if user_doc else None,
            "nickname": user_doc.get("nickname") if user_doc else None,
            "country": user_doc.get("country") if user_doc else None,
            "country_flag": user_doc.get("country_flag", "🌍") if user_doc else "🌍",
        }
    
    stats = results[0]
    win_rate = (stats["won_trades"] / stats["total_trades"] * 100) if stats["total_trades"] > 0 else 0
    
    return {
        "total_trades": stats["total_trades"],
        "win_rate": round(win_rate, 1),
        "volume": round(stats["total_volume"], 2),
        "net_pnl": round(stats["net_pnl"], 2),
        "account_id": user_doc.get("account_id") if user_doc else None,
        "nickname": user_doc.get("nickname") if user_doc else None,
        "country": user_doc.get("country") if user_doc else None,
        "country_flag": user_doc.get("country_flag", "🌍") if user_doc else "🌍",
    }

@api_router.put("/profile/nickname")
async def update_nickname(nickname: str, authorization: Optional[str] = Header(None), request: Request = None):
    """Update user's nickname for leaderboard"""
    user = await get_current_user(authorization, request)
    
    # Validate nickname
    if len(nickname) < 3 or len(nickname) > 20:
        raise HTTPException(status_code=400, detail="Nickname must be 3-20 characters")
    
    # Check if nickname is already taken
    existing = await db.users.find_one({"nickname": nickname, "user_id": {"$ne": user.user_id}})
    if existing:
        raise HTTPException(status_code=400, detail="Nickname already taken")
    
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"nickname": nickname}}
    )
    
    return {"success": True, "nickname": nickname}

@api_router.put("/profile/country")
async def update_country(country: str, country_flag: str = "🌍", authorization: Optional[str] = Header(None), request: Request = None):
    """Update user's country for leaderboard"""
    user = await get_current_user(authorization, request)
    
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"country": country, "country_flag": country_flag}}
    )
    
    return {"success": True, "country": country, "country_flag": country_flag}

@api_router.post("/profile/change-password")
async def change_password(password_data: dict, authorization: Optional[str] = Header(None), request: Request = None):
    """Change user password"""
    user = await get_current_user(authorization, request)
    
    current_password = password_data.get("current_password")
    new_password = password_data.get("new_password")
    
    if not current_password or not new_password:
        raise HTTPException(status_code=400, detail="Both current and new password required")
    
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Get user from database
    user_doc = await db.users.find_one({"user_id": user.user_id})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify current password
    if not verify_password(current_password, user_doc.get("password", "")):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Update password
    hashed_new_password = hash_password(new_password)
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {
            "password": hashed_new_password,
            "password_changed_at": datetime.now(timezone.utc)
        }}
    )
    
    return {"success": True, "message": "Password changed successfully"}

@api_router.post("/profile/toggle-2fa")
async def toggle_2fa(data: dict, authorization: Optional[str] = Header(None), request: Request = None):
    """Enable or disable 2FA"""
    user = await get_current_user(authorization, request)
    
    enable = data.get("enable", False)
    
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"is_2fa_enabled": enable}}
    )
    
    return {
        "success": True,
        "is_2fa_enabled": enable,
        "message": "2FA enabled successfully" if enable else "2FA disabled successfully"
    }

@api_router.post("/auth/send-verification")
async def send_verification_code(authorization: Optional[str] = Header(None), request: Request = None):
    """Send email verification code"""
    user = await get_current_user(authorization, request)
    
    # Check if already verified
    user_doc = await db.users.find_one({"user_id": user.user_id})
    if user_doc and user_doc.get("is_email_verified"):
        return {"success": True, "message": "Email already verified"}
    
    # Generate a 6-digit code
    verification_code = str(random.randint(100000, 999999))
    
    # Store the code with expiration
    await db.verification_codes.update_one(
        {"user_id": user.user_id, "type": "email"},
        {"$set": {
            "code": verification_code,
            "created_at": datetime.now(timezone.utc),
            "expires_at": datetime.now(timezone.utc) + timedelta(minutes=10),
            "used": False
        }},
        upsert=True
    )
    
    # In production, send email here
    # For demo, just return success
    return {
        "success": True,
        "message": "Verification code sent to your email",
        "dev_code": verification_code  # Remove in production
    }

@api_router.put("/profile/notification-settings")
async def update_notification_settings(data: dict, authorization: Optional[str] = Header(None), request: Request = None):
    """Update user notification settings"""
    user = await get_current_user(authorization, request)
    
    setting = data.get("setting")
    enabled = data.get("enabled", False)
    
    valid_settings = ["email", "tradeAlerts", "depositUpdates", "withdrawalUpdates", "securityAlerts"]
    if setting not in valid_settings:
        raise HTTPException(status_code=400, detail="Invalid setting")
    
    # Update the specific notification setting
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {f"notification_settings.{setting}": enabled}}
    )
    
    return {
        "success": True,
        "setting": setting,
        "enabled": enabled
    }

@api_router.get("/profile/notification-settings")
async def get_notification_settings(authorization: Optional[str] = Header(None), request: Request = None):
    """Get user notification settings"""
    user = await get_current_user(authorization, request)
    
    user_doc = await db.users.find_one(
        {"user_id": user.user_id},
        {"notification_settings": 1}
    )
    
    # Default settings if not set
    default_settings = {
        "email": True,
        "tradeAlerts": True,
        "depositUpdates": True,
        "withdrawalUpdates": True,
        "securityAlerts": True
    }
    
    settings = user_doc.get("notification_settings", default_settings) if user_doc else default_settings
    
    return {
        "success": True,
        "settings": settings
    }

@api_router.post("/profile/delete-request")
async def request_account_deletion(authorization: Optional[str] = Header(None), request: Request = None):
    """Request account deletion"""
    user = await get_current_user(authorization, request)
    
    # Check if there's already a pending deletion request
    existing_request = await db.deletion_requests.find_one({
        "user_id": user.user_id,
        "status": "pending"
    })
    
    if existing_request:
        raise HTTPException(status_code=400, detail="You already have a pending deletion request")
    
    # Create deletion request
    await db.deletion_requests.insert_one({
        "user_id": user.user_id,
        "email": user.email,
        "requested_at": datetime.now(timezone.utc),
        "status": "pending",
        "scheduled_deletion": datetime.now(timezone.utc) + timedelta(days=30)  # 30-day grace period
    })
    
    # Mark user as pending deletion
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"deletion_requested": True, "deletion_requested_at": datetime.now(timezone.utc)}}
    )
    
    return {
        "success": True,
        "message": "Account deletion request submitted. Your account will be deleted in 30 days. You can cancel this request by contacting support."
    }

@api_router.post("/auth/verify-email")
async def verify_email_code(code: str, authorization: Optional[str] = Header(None), request: Request = None):
    """Verify email with code"""
    user = await get_current_user(authorization, request)
    
    # Find the verification code
    verification = await db.verification_codes.find_one({
        "user_id": user.user_id,
        "type": "email",
        "code": code,
        "used": False,
        "expires_at": {"$gt": datetime.now(timezone.utc)}
    })
    
    if not verification:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")
    
    # Mark as verified
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"is_email_verified": True}}
    )
    
    # Mark code as used
    await db.verification_codes.update_one(
        {"_id": verification["_id"]},
        {"$set": {"used": True}}
    )
    
    return {"success": True, "message": "Email verified successfully"}

@api_router.post("/profile/photo")
async def upload_profile_photo(photo_data: dict, authorization: Optional[str] = Header(None), request: Request = None):
    """Upload profile photo"""
    user = await get_current_user(authorization, request)
    
    photo_base64 = photo_data.get("photo_base64")
    if not photo_base64:
        raise HTTPException(status_code=400, detail="No photo provided")
    
    # Store the photo as base64 (in production, upload to S3/storage)
    photo_url = f"data:image/jpeg;base64,{photo_base64}"
    
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"picture": photo_url}}
    )
    
    return {"success": True, "picture": photo_url}

@api_router.post("/profile/chart-picture")
async def upload_chart_picture(photo_data: dict, authorization: Optional[str] = Header(None), request: Request = None):
    """Upload chart background picture"""
    user = await get_current_user(authorization, request)
    
    photo_base64 = photo_data.get("photo_base64")
    if not photo_base64:
        raise HTTPException(status_code=400, detail="No photo provided")
    
    # Store the photo as base64
    photo_url = f"data:image/jpeg;base64,{photo_base64}"
    
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"chart_picture": photo_url}}
    )
    
    return {"success": True, "chart_picture": photo_url}

@api_router.delete("/profile/chart-picture")
async def delete_chart_picture(authorization: Optional[str] = Header(None), request: Request = None):
    """Delete chart background picture"""
    user = await get_current_user(authorization, request)
    
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"chart_picture": None}}
    )
    
    return {"success": True}


# ============= KYC Document Verification Routes =============

class KYCDocumentSubmission(BaseModel):
    full_name: str
    nationality: str
    date_of_birth: Optional[str] = None
    id_type: str  # Passport, National ID Card, Driver's License
    id_number: str
    front_image_base64: str
    back_image_base64: Optional[str] = None

@api_router.post("/kyc/submit")
async def submit_kyc_documents(submission: KYCDocumentSubmission, authorization: Optional[str] = Header(None), request: Request = None):
    """Submit KYC documents for AI verification"""
    user = await get_current_user(authorization, request)
    
    try:
        # Check if ID number already used by another account
        existing_kyc = await db.kyc_submissions.find_one({
            "id_number": submission.id_number,
            "user_id": {"$ne": user.user_id},
            "status": "verified"
        })
        
        if existing_kyc:
            return {
                "success": False,
                "status": "rejected",
                "ai_result": {
                    "is_valid_document": False,
                    "reason": "This ID number is already registered with another account"
                },
                "message": "This ID number is already registered with another account. Each document can only be used once."
            }
        
        # Get the Emergent LLM key
        llm_key = os.environ.get('EMERGENT_LLM_KEY')
        if not llm_key:
            raise HTTPException(status_code=500, detail="AI verification service not configured")
        
        # Initialize the AI chat for document verification
        chat = LlmChat(
            api_key=llm_key,
            session_id=f"kyc_verify_{user.user_id}_{uuid.uuid4().hex[:8]}",
            system_message="""You are a professional KYC document verification AI. Your job is to analyze identity documents and verify:
1. If the document is a valid government-issued ID (Passport, National ID Card, or Driver's License)
2. Which country issued the document
3. If the document appears authentic (not obviously fake, edited, or a screenshot)
4. If the NAME on the document matches or is similar to the provided name
5. If any ID NUMBER is visible on the document

You must respond ONLY in this exact JSON format:
{
    "is_valid_document": true/false,
    "document_type": "Passport" | "National ID Card" | "Driver's License" | "Unknown",
    "country": "Country Name" | "Unknown",
    "country_code": "XX" | "Unknown",
    "confidence": "high" | "medium" | "low",
    "reason": "Brief explanation",
    "name_on_document": "Name visible on document or 'Not visible'",
    "name_matches": true/false,
    "id_number_visible": true/false,
    "detected_id_number": "ID number if visible or 'Not visible'"
}

IMPORTANT: 
- If the name on document doesn't match the provided name, set is_valid_document to false
- If you cannot read the document clearly, set is_valid_document to false
- Be strict about authenticity"""
        ).with_model("openai", "gpt-4o")
        
        # Create the verification prompt with personal info to match
        prompt = f"""Please analyze this identity document and verify the information:

INFORMATION PROVIDED BY USER:
- Full Name: {submission.full_name}
- Nationality: {submission.nationality}
- Document Type: {submission.id_type}
- ID Number: {submission.id_number}

YOUR TASK:
1. Verify this is a real {submission.id_type} from {submission.nationality}
2. Check if the NAME on the document matches "{submission.full_name}"
3. Check if any ID number is visible on the document
4. Verify the document appears authentic (not edited, screenshot, or fake)

Analyze the image carefully and respond with the JSON verification result."""

        # Create UserMessage with image as FileContent
        # The emergentintegrations library expects just the base64 data without data URL prefix
        file_content = FileContent(
            content_type="image/png",
            file_content_base64=submission.front_image_base64
        )
        user_message = UserMessage(
            text=prompt,
            file_contents=[file_content]
        )
        
        # Send message with image
        try:
            response = await chat.send_message(user_message)
        except Exception as ai_error:
            # If AI service fails, provide a fallback response for testing
            self.log(f"AI service error: {str(ai_error)}")
            
            # For now, provide a mock response to allow testing of the flow
            # In production, this should be handled differently
            ai_result = {
                "is_valid_document": False,
                "document_type": "Unknown",
                "country": "Unknown",
                "confidence": "low",
                "reason": f"AI service temporarily unavailable: {str(ai_error)[:100]}",
                "name_on_document": "Not visible",
                "name_matches": False,
                "id_number_visible": False,
                "detected_id_number": "Not visible"
            }
            
            # Store KYC submission with error status
            kyc_record = {
                "kyc_id": f"kyc_{uuid.uuid4().hex[:12]}",
                "user_id": user.user_id,
                "full_name": submission.full_name,
                "nationality": submission.nationality,
                "date_of_birth": submission.date_of_birth,
                "id_type": submission.id_type,
                "id_number": submission.id_number,
                "ai_verification": ai_result,
                "status": "rejected",
                "submitted_at": datetime.now(timezone.utc),
                "rejected_at": datetime.now(timezone.utc),
                "rejection_reason": ai_result["reason"]
            }
            
            await db.kyc_submissions.insert_one(kyc_record)
            
            return {
                "success": False,
                "kyc_id": kyc_record["kyc_id"],
                "status": "rejected",
                "ai_result": ai_result,
                "message": f"AI verification service error: {ai_result['reason']}"
            }
        
        # Parse AI response
        import json
        try:
            # Extract JSON from response
            response_text = response.strip()
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()
            
            ai_result = json.loads(response_text)
        except json.JSONDecodeError:
            ai_result = {
                "is_valid_document": False,
                "document_type": "Unknown",
                "country": "Unknown",
                "confidence": "low",
                "reason": "Could not analyze the document properly. Please upload a clearer image."
            }
        
        # Check if name matches (additional validation)
        name_matches = ai_result.get("name_matches", True)
        if not name_matches:
            ai_result["is_valid_document"] = False
            ai_result["reason"] = f"Name on document does not match the provided name '{submission.full_name}'"
        
        # Store KYC submission in database (always store for records)
        kyc_record = {
            "kyc_id": f"kyc_{uuid.uuid4().hex[:12]}",
            "user_id": user.user_id,
            "full_name": submission.full_name,
            "nationality": submission.nationality,
            "date_of_birth": submission.date_of_birth,
            "id_type": submission.id_type,
            "id_number": submission.id_number,
            "ai_verification": ai_result,
            "status": "pending",
            "submitted_at": datetime.now(timezone.utc),
            "verified_at": None,
        }
        
        # Determine verification status
        is_verified = ai_result.get("is_valid_document") and ai_result.get("confidence") in ["high", "medium"]
        
        if is_verified:
            # VERIFIED - AI confirmed the document and info matches
            kyc_record["status"] = "verified"
            kyc_record["verified_at"] = datetime.now(timezone.utc)
            
            # Update user's KYC status and store personal info
            await db.users.update_one(
                {"user_id": user.user_id},
                {"$set": {
                    "kyc_status": "verified",
                    "kyc_verified_at": datetime.now(timezone.utc),
                    "is_kyc_verified": True,
                    "kyc_full_name": submission.full_name,
                    "kyc_nationality": submission.nationality,
                    "kyc_id_type": submission.id_type,
                    "kyc_id_number": submission.id_number,
                    "kyc_date_of_birth": submission.date_of_birth
                }}
            )
            
            # Create success notification
            await create_notification(
                user.user_id,
                "KYC Verified! ✅",
                f"Your {submission.id_type} from {ai_result.get('country', submission.nationality)} has been verified. You now have full access!",
                "system"
            )
            
            await db.kyc_submissions.insert_one(kyc_record)
            
            return {
                "success": True,
                "kyc_id": kyc_record["kyc_id"],
                "status": "verified",
                "ai_result": ai_result,
                "message": "Identity verified successfully!"
            }
        else:
            # REJECTED - AI could not verify
            kyc_record["status"] = "rejected"
            kyc_record["rejected_at"] = datetime.now(timezone.utc)
            kyc_record["rejection_reason"] = ai_result.get("reason", "Document could not be verified")
            
            # Update user's KYC status
            await db.users.update_one(
                {"user_id": user.user_id},
                {"$set": {
                    "kyc_status": "rejected",
                    "is_kyc_verified": False
                }}
            )
            
            # Create rejection notification
            await create_notification(
                user.user_id,
                "KYC Verification Failed ❌",
                f"Reason: {ai_result.get('reason', 'Invalid document')}. Please try again with a valid document.",
                "system"
            )
            
            await db.kyc_submissions.insert_one(kyc_record)
            
            return {
                "success": False,
                "kyc_id": kyc_record["kyc_id"],
                "status": "rejected",
                "ai_result": ai_result,
                "message": f"Verification failed: {ai_result.get('reason', 'Invalid document')}"
            }
        
    except Exception as e:
        logging.error(f"KYC submission error: {str(e)}")
        return {
            "success": False,
            "status": "error",
            "ai_result": None,
            "message": f"Error processing documents: {str(e)}"
        }

@api_router.get("/kyc/status")
async def get_kyc_status(authorization: Optional[str] = Header(None), request: Request = None):
    """Get user's KYC status"""
    user = await get_current_user(authorization, request)
    
    # Get latest KYC submission
    kyc_record = await db.kyc_submissions.find_one(
        {"user_id": user.user_id},
        sort=[("submitted_at", -1)]
    )
    
    if not kyc_record:
        return {
            "status": "not_submitted",
            "is_verified": False
        }
    
    # Calculate remaining time for auto-approval
    remaining_seconds = None
    if kyc_record.get("status") == "auto_approved" and kyc_record.get("auto_approve_at"):
        now = datetime.now(timezone.utc)
        auto_approve_at = kyc_record["auto_approve_at"]
        if isinstance(auto_approve_at, datetime):
            remaining = (auto_approve_at - now).total_seconds()
            remaining_seconds = max(0, int(remaining))
    
    return {
        "kyc_id": kyc_record.get("kyc_id"),
        "status": kyc_record.get("status"),
        "is_verified": kyc_record.get("status") == "verified",
        "submitted_at": kyc_record.get("submitted_at"),
        "verified_at": kyc_record.get("verified_at"),
        "ai_result": kyc_record.get("ai_verification"),
        "remaining_seconds": remaining_seconds
    }

# ============= Admin Routes =============

@api_router.get("/admin/users")
async def get_all_users(authorization: Optional[str] = Header(None), request: Request = None):
    """Get all users (admin only)"""
    user = await get_current_user(authorization, request)
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return users

@api_router.get("/admin/trades")
async def get_all_trades(authorization: Optional[str] = Header(None), request: Request = None):
    """Get all trades (admin only)"""
    user = await get_current_user(authorization, request)
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    trades = await db.trades.find({}, {"_id": 0}).sort("created_at", -1).limit(100).to_list(100)
    return trades

@api_router.post("/admin/transactions/{transaction_id}/approve")
async def approve_transaction(transaction_id: str, authorization: Optional[str] = Header(None), request: Request = None):
    """Approve withdrawal (admin only)"""
    user = await get_current_user(authorization, request)
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    transaction = await db.transactions.find_one({"transaction_id": transaction_id})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if transaction["type"] == "deposit":
        # Approve deposit - add to user balance
        await db.users.update_one(
            {"user_id": transaction["user_id"]},
            {"$inc": {"real_balance": transaction["amount"]}}
        )
    
    # Mark as completed
    await db.transactions.update_one(
        {"transaction_id": transaction_id},
        {"$set": {
            "status": "completed",
            "txn_hash": f"0x{uuid.uuid4().hex}",
            "completed_at": datetime.now(timezone.utc)
        }}
    )
    
    return {"message": "Transaction approved"}

@api_router.post("/admin/transactions/{transaction_id}/reject")
async def reject_transaction(transaction_id: str, authorization: Optional[str] = Header(None), request: Request = None):
    """Reject withdrawal (admin only)"""
    user = await get_current_user(authorization, request)
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    transaction = await db.transactions.find_one({"transaction_id": transaction_id})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # If withdrawal, refund to user
    if transaction["type"] == "withdrawal":
        await db.users.update_one(
            {"user_id": transaction["user_id"]},
            {"$inc": {"real_balance": transaction["amount"]}}
        )
    
    # Mark as rejected
    await db.transactions.update_one(
        {"transaction_id": transaction_id},
        {"$set": {"status": "rejected"}}
    )
    
    return {"message": "Transaction rejected"}

# ============= WebSocket Events =============

@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")

@sio.event
async def subscribe_market(sid, data):
    """Subscribe to market price updates"""
    asset = data.get("asset", "BTC/USD")
    print(f"Client {sid} subscribed to {asset}")
    # In production, start sending real-time price updates

# ============= Binance Proxy Routes (for CORS bypass) =============

@api_router.get("/binance/klines")
async def binance_klines_proxy(symbol: str, interval: str = "1m", limit: int = 50):
    """Proxy Binance klines API to bypass CORS"""
    try:
        url = f"https://api.binance.com/api/v3/klines?symbol={symbol}&interval={interval}&limit={limit}"
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10.0)
            if response.status_code == 200:
                return response.json()
            else:
                raise HTTPException(status_code=response.status_code, detail="Binance API error")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch Binance data: {str(e)}")

# WebSocket proxy for Binance streams
@sio.event
async def subscribe_binance(sid, data):
    """Subscribe to Binance WebSocket and relay to client"""
    symbol = data.get('symbol', 'BTCUSDT').lower()
    interval = data.get('interval', '1m')
    
    print(f"Client {sid} subscribing to Binance {symbol}@kline_{interval}")
    
    # In production, establish WebSocket connection to Binance and relay data
    # For now, send mock updates every 2 seconds
    import asyncio
    
    async def send_binance_updates():
        try:
            # Fetch initial price from Binance
            url = f"https://api.binance.com/api/v3/ticker/price?symbol={symbol.upper()}"
            async with httpx.AsyncClient() as client:
                response = await client.get(url, timeout=5.0)
                if response.status_code == 200:
                    price_data = response.json()
                    base_price = float(price_data['price'])
                else:
                    base_price = 50000.0  # Fallback
            
            # Send updates every 2 seconds
            for _ in range(30):  # Send 30 updates (1 minute)
                await asyncio.sleep(2)
                
                # Generate mock candle update
                import random
                change = (random.random() - 0.5) * (base_price * 0.001)
                new_price = base_price + change
                
                candle = {
                    'time': int(asyncio.get_event_loop().time() * 1000),
                    'open': base_price,
                    'high': max(base_price, new_price) + random.random() * base_price * 0.0005,
                    'low': min(base_price, new_price) - random.random() * base_price * 0.0005,
                    'close': new_price,
                    'volume': random.uniform(100, 1000)
                }
                
                await sio.emit('binance_update', candle, room=sid)
                base_price = new_price
        except Exception as e:
            print(f"Error sending Binance updates: {e}")
    
    # Start sending updates in background
    asyncio.create_task(send_binance_updates())

# ============= OTC Market Data Generator =============

# Store active market subscriptions
active_subscriptions = {}

# OTC Market base prices
OTC_BASE_PRICES = {
    'EUR/USD OTC': 1.0850,
    'GBP/USD OTC': 1.2650,
    'USD/JPY OTC': 149.50,
    'AUD/USD OTC': 0.6550,
    'USD/CHF OTC': 0.8750,
    'EUR/GBP OTC': 0.8550,
    'NZD/USD OTC': 0.6150,
    'USD/CAD OTC': 1.3550,
    'EUR/JPY OTC': 162.50,
    'GBP/JPY OTC': 189.50,
}

# Store current prices for each market
current_market_prices = {asset: price for asset, price in OTC_BASE_PRICES.items()}

def generate_historical_candles(asset: str, count: int = 1000, interval_seconds: int = 60):
    """Generate fake historical OHLC data for OTC markets"""
    base_price = OTC_BASE_PRICES.get(asset, 1.0)
    candles = []
    current_time = int(datetime.now(timezone.utc).timestamp()) - (count * interval_seconds)
    price = base_price
    
    for i in range(count):
        # Random walk with trend
        volatility = base_price * 0.0003  # 0.03% volatility per candle
        change = (random.random() - 0.5) * volatility * 2
        
        open_price = price
        close_price = price + change
        high_price = max(open_price, close_price) + random.random() * volatility
        low_price = min(open_price, close_price) - random.random() * volatility
        volume = random.uniform(100, 1000)
        
        candles.append({
            'time': current_time + (i * interval_seconds),
            'open': round(open_price, 5),
            'high': round(high_price, 5),
            'low': round(low_price, 5),
            'close': round(close_price, 5),
            'volume': round(volume, 2)
        })
        
        price = close_price
    
    # Update current price
    current_market_prices[asset] = price
    return candles

@api_router.get("/otc/history")
async def get_otc_history(asset: str = "EUR/USD OTC", count: int = 1000, interval: str = "1m"):
    """Get historical candle data for OTC markets"""
    interval_map = {
        '1m': 60,
        '5m': 300,
        '15m': 900,
        '1h': 3600,
        '4h': 14400,
        '1d': 86400
    }
    interval_seconds = interval_map.get(interval, 60)
    candles = generate_historical_candles(asset, count, interval_seconds)
    return {"asset": asset, "interval": interval, "candles": candles}

@api_router.get("/otc/price")
async def get_otc_price(asset: str = "EUR/USD OTC"):
    """Get current price for OTC market"""
    price = current_market_prices.get(asset, OTC_BASE_PRICES.get(asset, 1.0))
    return {"asset": asset, "price": round(price, 5)}

@sio.event
async def subscribe_otc(sid, data):
    """Subscribe to OTC market real-time updates"""
    import asyncio
    
    asset = data.get('asset', 'EUR/USD OTC')
    print(f"Client {sid} subscribing to OTC market: {asset}")
    
    # Cancel any existing subscription for this client
    if sid in active_subscriptions:
        active_subscriptions[sid]['active'] = False
    
    subscription = {'active': True, 'asset': asset}
    active_subscriptions[sid] = subscription
    
    async def send_otc_updates():
        try:
            price = current_market_prices.get(asset, OTC_BASE_PRICES.get(asset, 1.0))
            last_candle_time = int(datetime.now(timezone.utc).timestamp())
            
            while subscription['active']:
                await asyncio.sleep(0.5)  # Update every 500ms for smooth movement
                
                if not subscription['active']:
                    break
                
                # Generate price movement
                volatility = price * 0.0001  # 0.01% per tick
                change = (random.random() - 0.5) * volatility * 2
                price += change
                current_market_prices[asset] = price
                
                current_time = int(datetime.now(timezone.utc).timestamp())
                
                # Emit tick update
                tick_data = {
                    'asset': asset,
                    'price': round(price, 5),
                    'time': current_time,
                    'change': round(change, 7)
                }
                await sio.emit('otc_tick', tick_data, room=sid)
                
                # Every 60 seconds, emit a new candle
                if current_time - last_candle_time >= 60:
                    candle = {
                        'time': current_time,
                        'open': round(price - change, 5),
                        'high': round(price + abs(change), 5),
                        'low': round(price - abs(change), 5),
                        'close': round(price, 5),
                        'volume': round(random.uniform(100, 500), 2)
                    }
                    await sio.emit('otc_candle', candle, room=sid)
                    last_candle_time = current_time
                    
        except Exception as e:
            print(f"Error in OTC updates for {sid}: {e}")
        finally:
            if sid in active_subscriptions:
                del active_subscriptions[sid]
    
    asyncio.create_task(send_otc_updates())

@sio.event
async def unsubscribe_otc(sid, data=None):
    """Unsubscribe from OTC market updates"""
    if sid in active_subscriptions:
        active_subscriptions[sid]['active'] = False
        print(f"Client {sid} unsubscribed from OTC market")

@sio.event
async def disconnect(sid):
    """Handle client disconnect"""
    if sid in active_subscriptions:
        active_subscriptions[sid]['active'] = False
    print(f"Client disconnected: {sid}")

# ============= NOWPayments Integration =============

NOWPAYMENTS_API_KEY = os.environ.get("NOWPAYMENTS_API_KEY", "")
NOWPAYMENTS_API_URL = "https://api.nowpayments.io/v1"

class NOWPaymentsService:
    """Service for interacting with NOWPayments API"""
    
    def __init__(self):
        self.api_url = NOWPAYMENTS_API_URL
        self.api_key = NOWPAYMENTS_API_KEY
        self.timeout = 30
    
    def _get_headers(self):
        return {
            "x-api-key": self.api_key,
            "Content-Type": "application/json"
        }
    
    async def check_api_status(self):
        """Check if NOWPayments API is operational"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_url}/status",
                    headers=self._get_headers(),
                    timeout=self.timeout
                )
            return response.status_code == 200
        except Exception as e:
            print(f"API status check failed: {e}")
            return False
    
    async def get_minimum_amount(self, currency_from: str, currency_to: str):
        """Get minimum payment amount for a currency pair"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_url}/min-amount",
                    params={
                        "currency_from": currency_from.lower(),
                        "currency_to": currency_to.lower()
                    },
                    headers=self._get_headers(),
                    timeout=self.timeout
                )
            if response.status_code == 200:
                return response.json()
            return {"min_amount": 10}
        except Exception as e:
            print(f"Failed to get minimum amount: {e}")
            return {"min_amount": 10}
    
    async def create_payment(
        self,
        price_amount: float,
        price_currency: str,
        pay_currency: str,
        order_id: str = None,
        order_description: str = None,
        ipn_callback_url: str = None
    ):
        """Create a new payment - generates deposit address"""
        payload = {
            "price_amount": price_amount,
            "price_currency": price_currency.lower(),
            "pay_currency": pay_currency.lower(),
            "is_fee_paid_by_user": False,  # Merchant pays fees - user pays exact amount
            "is_fixed_rate": True,  # Lock the exchange rate
        }
        
        if order_id:
            payload["order_id"] = order_id
        if order_description:
            payload["order_description"] = order_description
        if ipn_callback_url:
            payload["ipn_callback_url"] = ipn_callback_url
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_url}/payment",
                    json=payload,
                    headers=self._get_headers(),
                    timeout=self.timeout
                )
            
            if response.status_code == 200 or response.status_code == 201:
                data = response.json()
                print(f"Payment created: {data}")
                return {
                    "success": True,
                    "payment_id": data.get("payment_id"),
                    "payment_status": data.get("payment_status"),
                    "pay_address": data.get("pay_address"),
                    "pay_amount": data.get("pay_amount"),
                    "pay_currency": data.get("pay_currency"),
                    "price_amount": data.get("price_amount"),
                    "price_currency": data.get("price_currency"),
                    "expiration_estimate_date": data.get("expiration_estimate_date"),
                    "network": data.get("network", "TRC20")
                }
            else:
                print(f"Payment creation failed: {response.text}")
                return {
                    "success": False,
                    "error": response.json().get("message", "Payment creation failed")
                }
        except Exception as e:
            print(f"Failed to create payment: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_payment_status(self, payment_id: int):
        """Get the current status of a payment"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_url}/payment/{payment_id}",
                    headers=self._get_headers(),
                    timeout=self.timeout
                )
            
            if response.status_code == 200:
                return response.json()
            return None
        except Exception as e:
            print(f"Failed to get payment status: {e}")
            return None
    
    async def get_available_currencies(self):
        """Get list of available currencies"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_url}/currencies",
                    headers=self._get_headers(),
                    timeout=self.timeout
                )
            if response.status_code == 200:
                return response.json()
            return {"currencies": ["usdttrc20"]}
        except Exception as e:
            print(f"Failed to get currencies: {e}")
            return {"currencies": ["usdttrc20"]}

# Initialize NOWPayments service
nowpayments_service = NOWPaymentsService()

# Deposit models
class CreateDepositRequest(BaseModel):
    amount: float = Field(..., gt=0, description="Amount in USD to deposit")
    network: str = Field(default="TRC20", description="Crypto network")
    promo_code: Optional[str] = Field(default=None, description="Promo code for bonus")

class DepositResponse(BaseModel):
    success: bool
    payment_id: Optional[int] = None
    pay_address: Optional[str] = None
    pay_amount: Optional[float] = None
    pay_currency: Optional[str] = None
    network: Optional[str] = None
    expiration_estimate_date: Optional[str] = None
    bonus_percentage: Optional[int] = None
    bonus_amount: Optional[float] = None
    total_credit: Optional[float] = None
    is_first_deposit: Optional[bool] = None
    error: Optional[str] = None

# Supported crypto networks
CRYPTO_NETWORKS = {
    "TRC20": {"currency": "usdttrc20", "name": "USDT (TRC20)", "fee": "No fee"},
    "ERC20": {"currency": "usdterc20", "name": "USDT (ERC20)", "fee": "No fee"},
    "BEP20": {"currency": "usdtbsc", "name": "USDT (BEP20/BSC)", "fee": "No fee"},
    "SOL": {"currency": "usdtsol", "name": "USDT (Solana)", "fee": "No fee"},
    "MATIC": {"currency": "usdtmatic", "name": "USDT (Polygon)", "fee": "No fee"},
}

# Promo codes - requires minimum $100 deposit
PROMO_CODES = {
    "BYNIX": {"bonus": 200, "min_deposit": 100, "first_deposit_only": True},  # 200% bonus for new users with $100+ deposit
    "WELCOME": {"bonus": 10, "min_deposit": 50, "first_deposit_only": False},  # 10% bonus
    "VIP50": {"bonus": 50, "min_deposit": 200, "first_deposit_only": False},  # 50% bonus for $200+
}

# First time deposit bonus - DISABLED (only promo codes give bonus now)
# FIRST_DEPOSIT_BONUS_PERCENTAGE = 200

# ============= Deposit Endpoints =============

@api_router.get("/deposit/status")
async def check_nowpayments_status():
    """Check NOWPayments API status"""
    is_online = await nowpayments_service.check_api_status()
    return {"status": "online" if is_online else "offline"}

@api_router.get("/deposit/min-amount")
async def get_deposit_min_amount():
    """Get minimum deposit amount"""
    result = await nowpayments_service.get_minimum_amount("usd", "usdttrc20")
    # Add a small buffer to ensure we're above minimum
    min_amount = result.get("min_amount", 20)
    return {"min_amount": round(min_amount + 1, 2), "currency": "USD"}

@api_router.get("/deposit/networks")
async def get_available_networks():
    """Get available crypto networks for deposit"""
    networks = []
    for key, value in CRYPTO_NETWORKS.items():
        networks.append({
            "id": key,
            "name": value["name"],
            "fee": value["fee"]
        })
    return {"networks": networks}

@api_router.post("/deposit/create", response_model=DepositResponse)
async def create_deposit(
    request: CreateDepositRequest,
    authorization: Optional[str] = Header(None),
    req: Request = None
):
    """Create a deposit request - generates USDT address with bonus calculation"""
    # Get current user
    try:
        user = await get_current_user(authorization, req)
    except HTTPException:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Minimum amount check
    if request.amount < 10:
        raise HTTPException(status_code=400, detail="Minimum deposit amount is $10")
    
    # Get network configuration
    network_config = CRYPTO_NETWORKS.get(request.network, CRYPTO_NETWORKS["TRC20"])
    
    # Check if first deposit
    existing_deposits = await db.deposits.count_documents({
        "user_id": user.user_id,
        "status": {"$in": ["completed", "confirmed"]}
    })
    is_first_deposit = existing_deposits == 0
    
    # Calculate bonus - ONLY from promo codes now
    bonus_percentage = 0
    bonus_amount = 0
    promo_error = None
    
    # Check promo code
    if request.promo_code:
        promo_upper = request.promo_code.upper().strip()
        if promo_upper in PROMO_CODES:
            promo = PROMO_CODES[promo_upper]
            
            # Check if promo is first-deposit-only and user already deposited
            if promo.get("first_deposit_only", False) and not is_first_deposit:
                promo_error = f"Promo code {promo_upper} is only valid for first deposit"
            elif request.amount < promo["min_deposit"]:
                promo_error = f"Minimum deposit for {promo_upper} is ${promo['min_deposit']}"
            else:
                # Apply promo bonus
                bonus_percentage = promo["bonus"]
                bonus_amount = request.amount * (bonus_percentage / 100)
        else:
            promo_error = "Invalid promo code"
    
    # If promo code error, raise exception
    if promo_error:
        raise HTTPException(status_code=400, detail=promo_error)
    
    total_credit = request.amount + bonus_amount
    
    # Create unique order ID
    order_id = f"DEP_{user.user_id}_{uuid.uuid4().hex[:8]}"
    
    # Create payment with NOWPayments
    result = await nowpayments_service.create_payment(
        price_amount=request.amount,
        price_currency="usd",
        pay_currency=network_config["currency"],
        order_id=order_id,
        order_description=f"Deposit for user {user.email}"
    )
    
    if result.get("success"):
        # Store deposit record in database with bonus info
        deposit_record = {
            "transaction_id": str(uuid.uuid4()),
            "user_id": user.user_id,
            "payment_id": result.get("payment_id"),
            "order_id": order_id,
            "type": "deposit",
            "amount": request.amount,
            "bonus_percentage": bonus_percentage,
            "bonus_amount": bonus_amount,
            "total_credit": total_credit,
            "is_first_deposit": is_first_deposit,
            "promo_code": request.promo_code,
            "pay_amount": result.get("pay_amount"),
            "pay_currency": result.get("pay_currency", "USDT"),
            "pay_address": result.get("pay_address"),
            "network": request.network,
            "status": "pending",
            "created_at": datetime.now(timezone.utc),
            "expiration_date": result.get("expiration_estimate_date")
        }
        await db.deposits.insert_one(deposit_record)
        
        return DepositResponse(
            success=True,
            payment_id=result.get("payment_id"),
            pay_address=result.get("pay_address"),
            pay_amount=result.get("pay_amount"),
            pay_currency="USDT",
            network=request.network,
            expiration_estimate_date=result.get("expiration_estimate_date"),
            bonus_percentage=bonus_percentage,
            bonus_amount=bonus_amount,
            total_credit=total_credit,
            is_first_deposit=is_first_deposit
        )
    else:
        return DepositResponse(
            success=False,
            error=result.get("error", "Failed to create deposit")
        )

@api_router.get("/deposit/check/{payment_id}")
async def check_deposit_status(
    payment_id: str,
    authorization: Optional[str] = Header(None),
    req: Request = None
):
    """Check the status of a deposit"""
    try:
        user = await get_current_user(authorization, req)
    except HTTPException:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Get payment status from NOWPayments
    status = await nowpayments_service.get_payment_status(int(payment_id))
    
    if status:
        payment_status = status.get("payment_status")
        actually_paid = float(status.get("actually_paid", 0))
        
        # Credit balance for finished or partially_paid payments
        if payment_status in ["finished", "partially_paid", "confirmed", "sending"]:
            # Find the deposit record (payment_id stored as string)
            deposit = await db.deposits.find_one({
                "payment_id": str(payment_id),
                "user_id": user.user_id
            })
            
            if deposit and deposit.get("status") not in ["completed", "credited"]:
                # Calculate the USD value of what was actually paid
                # Since they paid in USDT (1:1 with USD approximately)
                credit_amount = actually_paid if actually_paid > 0 else deposit.get("amount", 0)
                bonus_amount = deposit.get("bonus_amount", 0)
                
                # Update deposit status
                new_status = "completed" if payment_status == "finished" else "credited"
                await db.deposits.update_one(
                    {"payment_id": str(payment_id)},
                    {
                        "$set": {
                            "status": new_status,
                            "actually_paid": actually_paid,
                            "credit_amount": credit_amount,
                            "completed_at": datetime.now(timezone.utc)
                        }
                    }
                )
                
                # Add to user's real balance (withdrawable) and bonus balance (non-withdrawable)
                update_fields = {"$inc": {"real_balance": credit_amount}}
                if bonus_amount > 0:
                    update_fields["$inc"]["bonus_balance"] = bonus_amount
                
                await db.users.update_one(
                    {"user_id": user.user_id},
                    update_fields
                )
                
                # Create notification about deposit
                total_credited = credit_amount + bonus_amount
                bonus_msg = f" + ${bonus_amount:.2f} bonus!" if bonus_amount > 0 else ""
                await create_notification(
                    user.user_id,
                    "Deposit Successful! 💰",
                    f"${credit_amount:.2f} has been credited to your account{bonus_msg}",
                    "deposit"
                )
                
                print(f"Credited ${credit_amount} + ${bonus_amount} bonus to user {user.user_id} for payment {payment_id}")
        
        return {
            "payment_id": payment_id,
            "status": payment_status,
            "actually_paid": actually_paid,
            "pay_amount": status.get("pay_amount"),
            "pay_currency": status.get("pay_currency"),
            "credited": payment_status in ["finished", "partially_paid", "confirmed", "sending"]
        }
    
    raise HTTPException(status_code=404, detail="Payment not found")

@api_router.get("/deposit/history")
async def get_deposit_history(
    authorization: Optional[str] = Header(None),
    req: Request = None
):
    """Get user's deposit history"""
    try:
        user = await get_current_user(authorization, req)
    except HTTPException:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    deposits = await db.deposits.find(
        {"user_id": user.user_id}
    ).sort("created_at", -1).limit(50).to_list(50)
    
    # Convert ObjectId to string
    for dep in deposits:
        dep["_id"] = str(dep["_id"])
        if dep.get("created_at"):
            dep["created_at"] = dep["created_at"].isoformat()
        if dep.get("completed_at"):
            dep["completed_at"] = dep["completed_at"].isoformat()
    
    return {"deposits": deposits}

# ============= Chart Data API (Synced across all devices) =============

def get_base_price(symbol: str) -> float:
    """Get base price for a symbol"""
    symbol_upper = symbol.upper()
    if 'EUR/USD' in symbol_upper: return 1.0850
    if 'GBP/USD' in symbol_upper: return 1.2650
    if 'USD/JPY' in symbol_upper: return 149.50
    if 'AUD/USD' in symbol_upper: return 0.6550
    if 'USD/CHF' in symbol_upper: return 0.8750
    if 'EUR/GBP' in symbol_upper: return 0.8550
    if 'NZD/USD' in symbol_upper: return 0.6150
    if 'USD/CAD' in symbol_upper: return 1.3550
    if 'EUR/JPY' in symbol_upper: return 162.50
    if 'GBP/JPY' in symbol_upper: return 189.50
    if 'BTC' in symbol_upper: return 67500
    if 'ETH' in symbol_upper: return 3500
    if 'XRP' in symbol_upper: return 0.55
    if 'SOL' in symbol_upper: return 145
    if 'ADA' in symbol_upper: return 0.45
    if 'DOGE' in symbol_upper: return 0.12
    if 'AAPL' in symbol_upper: return 178
    if 'GOOGL' in symbol_upper: return 141
    if 'MSFT' in symbol_upper: return 378
    if 'AMZN' in symbol_upper: return 178
    if 'TSLA' in symbol_upper: return 245
    return 1.0850

def generate_server_chart_data(symbol: str) -> list:
    """Generate chart data on the server (consistent across all devices)"""
    import hashlib
    
    base_price = get_base_price(symbol)
    ticks = []
    now = int(datetime.now(timezone.utc).timestamp())
    
    # Use symbol hash as seed for deterministic randomness
    seed = int(hashlib.md5(symbol.encode()).hexdigest()[:8], 16)
    random.seed(seed)
    
    price = base_price
    
    # Generate 30000 ticks (500 minutes of 1-second data = enough for 500 candles at 1m)
    # This ensures we have 500 candles regardless of timeframe
    for i in range(30000, 0, -1):
        tick_time = now - i
        volatility = price * 0.00008
        change = (random.random() - 0.5) * volatility * 2
        
        open_price = price
        close_price = open_price + change
        high_price = max(open_price, close_price) + abs((random.random() - 0.5) * volatility)
        low_price = min(open_price, close_price) - abs((random.random() - 0.5) * volatility)
        
        ticks.append({
            "time": tick_time,
            "open": round(open_price, 6),
            "high": round(high_price, 6),
            "low": round(low_price, 6),
            "close": round(close_price, 6)
        })
        
        price = close_price
    
    # Reset random seed
    random.seed()
    
    return ticks

@api_router.get("/chart/data/{symbol}")
async def get_chart_data(symbol: str):
    """Get chart data for a symbol - synced across all devices"""
    # Normalize symbol
    symbol_key = symbol.replace("/", "_").replace(" ", "_").upper()
    
    # Check if we have existing data in database
    chart_doc = await db.chart_data.find_one({"symbol": symbol_key})
    
    if chart_doc:
        # Check if data is recent (within last 30 minutes)
        last_updated = chart_doc.get("last_updated")
        if last_updated:
            # Ensure timezone awareness
            if last_updated.tzinfo is None:
                last_updated = last_updated.replace(tzinfo=timezone.utc)
            age = datetime.now(timezone.utc) - last_updated
            if age.total_seconds() < 1800:  # 30 minutes
                return {
                    "symbol": symbol,
                    "ticks": chart_doc.get("ticks", []),
                    "last_updated": last_updated.isoformat()
                }
    
    # Generate new data
    ticks = generate_server_chart_data(symbol)
    
    # Save to database
    await db.chart_data.update_one(
        {"symbol": symbol_key},
        {
            "$set": {
                "symbol": symbol_key,
                "ticks": ticks,
                "last_updated": datetime.now(timezone.utc)
            }
        },
        upsert=True
    )
    
    return {
        "symbol": symbol,
        "ticks": ticks,
        "last_updated": datetime.now(timezone.utc).isoformat()
    }

@api_router.post("/chart/tick/{symbol}")
async def add_chart_tick(symbol: str, authorization: Optional[str] = Header(None), request: Request = None):
    """Add a new tick to the chart data - called periodically to keep data fresh
    If user has active trades, bias the price movement based on predetermined outcome"""
    symbol_key = symbol.replace("/", "_").replace(" ", "_").upper()
    
    # Check if user has active trades on this asset to bias price movement
    active_trade = None
    try:
        user = await get_current_user(authorization, request)
        if user:
            # Find active (pending) trade for this user and symbol
            active_trade = await db.trades.find_one({
                "user_id": user.user_id,
                "status": "pending",
                "asset": {"$regex": symbol.replace("_", "/").replace(" ", ""), "$options": "i"}
            })
    except:
        pass  # No auth or error, proceed without trade bias
    
    # Get existing data
    chart_doc = await db.chart_data.find_one({"symbol": symbol_key})
    
    if not chart_doc or not chart_doc.get("ticks"):
        # No existing data, generate it first
        ticks = generate_server_chart_data(symbol)
    else:
        ticks = chart_doc.get("ticks", [])
    
    if len(ticks) == 0:
        return {"error": "No chart data found"}
    
    # Generate new tick based on last tick
    last_tick = ticks[-1]
    now = int(datetime.now(timezone.utc).timestamp())
    
    # Only add new tick if at least 1 second has passed
    if now <= last_tick["time"]:
        # Return the current last tick so all clients stay synced
        return {
            "message": "Synced", 
            "new_tick": last_tick, 
            "ticks_count": len(ticks),
            "synced": True
        }
    
    # Use deterministic random based on timestamp so all requests get same result
    random.seed(now + hash(symbol_key))
    
    base_price = last_tick["close"]
    volatility = base_price * 0.00008
    
    # Default random change
    change = (random.random() - 0.5) * volatility * 2
    
    # If user has active DEMO trade, bias price movement based on predetermined outcome
    # Real account trades use actual price movement without manipulation
    if active_trade and active_trade.get("predetermined_outcome"):
        entry_price = active_trade.get("entry_price", base_price)
        trade_type = active_trade.get("trade_type")  # 'call' or 'put'
        predetermined_outcome = active_trade.get("predetermined_outcome")
        
        # Determine which direction price should move
        # CALL + WIN = price goes UP (above entry)
        # CALL + LOSS = price goes DOWN (below entry)
        # PUT + WIN = price goes DOWN (below entry)
        # PUT + LOSS = price goes UP (above entry)
        
        should_go_up = (trade_type == "call" and predetermined_outcome == "won") or \
                       (trade_type == "put" and predetermined_outcome == "lost")
        
        # Apply stronger bias (70% of the time move in the biased direction)
        bias_strength = 0.7
        if random.random() < bias_strength:
            if should_go_up:
                # Force positive change
                change = abs(change) * 1.5
            else:
                # Force negative change
                change = -abs(change) * 1.5
        
        # Additional check: as trade nears expiry, ensure price is on correct side
        expires_at = active_trade.get("expires_at")
        if expires_at:
            time_remaining = (expires_at - datetime.now(timezone.utc)).total_seconds()
            if time_remaining < 5:  # Last 5 seconds, ensure correct outcome
                if should_go_up and base_price + change <= entry_price:
                    # Must be above entry price for CALL+WIN or PUT+LOSS
                    change = abs(entry_price - base_price) * 0.001 + volatility
                elif not should_go_up and base_price + change >= entry_price:
                    # Must be below entry price for CALL+LOSS or PUT+WIN
                    change = -(abs(base_price - entry_price) * 0.001 + volatility)
    
    # Reset random seed
    random.seed()
    
    new_tick = {
        "time": now,
        "open": round(base_price, 6),
        "high": round(max(base_price, base_price + change) + abs(random.random() * volatility * 0.5), 6),
        "low": round(min(base_price, base_price + change) - abs(random.random() * volatility * 0.5), 6),
        "close": round(base_price + change, 6)
    }
    
    ticks.append(new_tick)
    
    # Keep only last 35000 ticks (enough for 500+ candles)
    if len(ticks) > 35000:
        ticks = ticks[-35000:]
        ticks = ticks[-3600:]
    
    # Update database
    await db.chart_data.update_one(
        {"symbol": symbol_key},
        {
            "$set": {
                "ticks": ticks,
                "last_updated": datetime.now(timezone.utc)
            }
        },
        upsert=True
    )
    
    return {"message": "Tick added", "new_tick": new_tick, "ticks_count": len(ticks), "synced": True}

# Include router - must be after all endpoint definitions
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
