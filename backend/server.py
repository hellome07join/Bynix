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
    demo_balance: float = 10000.0
    real_balance: float = 0.0
    is_admin: bool = False
    created_at: datetime

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

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
    
    new_user = {
        "user_id": user_id,
        "email": user.email,
        "name": user.name,
        "password": hashed_password,
        "picture": None,
        "demo_balance": 10000.0,
        "real_balance": 0.0,
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
    return {
        "user_id": user.user_id,
        "email": user.email,
        "name": user.name,
        "picture": user.picture,
        "demo_balance": user.demo_balance,
        "real_balance": user.real_balance,
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
    
    # Validate balance
    balance = user.demo_balance if trade.account_type == "demo" else user.real_balance
    if balance < trade.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    # Deduct amount
    update_field = "demo_balance" if trade.account_type == "demo" else "real_balance"
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$inc": {update_field: -trade.amount}}
    )
    
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
        "created_at": datetime.now(timezone.utc),
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
    """Settle a trade (for testing purposes)"""
    user = await get_current_user(authorization, request)
    
    trade = await db.trades.find_one({"trade_id": trade_id, "user_id": user.user_id})
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    
    if trade["status"] != "pending":
        raise HTTPException(status_code=400, detail="Trade already settled")
    
    # Determine win/loss
    entry_price = trade["entry_price"]
    trade_type = trade["trade_type"]
    exit_price = settle_data.exit_price
    
    if trade_type == "call":
        won = exit_price > entry_price
    else:  # put
        won = exit_price < entry_price
    
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
    update_field = "demo_balance" if trade["account_type"] == "demo" else "real_balance"
    if won:
        payout = trade["amount"] + profit_loss
    else:
        payout = 0
    
    if payout > 0:
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$inc": {update_field: payout}}
        )
    
    return {"message": "Trade settled", "status": status, "profit_loss": profit_loss}

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
    """Get user's transaction history"""
    user = await get_current_user(authorization, request)
    
    transactions = await db.transactions.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return transactions

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

class DepositResponse(BaseModel):
    success: bool
    payment_id: Optional[int] = None
    pay_address: Optional[str] = None
    pay_amount: Optional[float] = None
    pay_currency: Optional[str] = None
    network: Optional[str] = None
    expiration_estimate_date: Optional[str] = None
    error: Optional[str] = None

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

@api_router.post("/deposit/create", response_model=DepositResponse)
async def create_deposit(
    request: CreateDepositRequest,
    authorization: Optional[str] = Header(None),
    req: Request = None
):
    """Create a deposit request - generates USDT address"""
    # Get current user
    try:
        user = await get_current_user(authorization, req)
    except HTTPException:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Minimum amount check
    if request.amount < 10:
        raise HTTPException(status_code=400, detail="Minimum deposit amount is $10")
    
    # Create unique order ID
    order_id = f"DEP_{user.user_id}_{uuid.uuid4().hex[:8]}"
    
    # Create payment with NOWPayments
    result = await nowpayments_service.create_payment(
        price_amount=request.amount,
        price_currency="usd",
        pay_currency="usdttrc20",  # USDT on TRC20 network
        order_id=order_id,
        order_description=f"Deposit for user {user.email}"
    )
    
    if result.get("success"):
        # Store deposit record in database
        deposit_record = {
            "transaction_id": str(uuid.uuid4()),
            "user_id": user.user_id,
            "payment_id": result.get("payment_id"),
            "order_id": order_id,
            "type": "deposit",
            "amount": request.amount,
            "pay_amount": result.get("pay_amount"),
            "pay_currency": result.get("pay_currency", "USDT"),
            "pay_address": result.get("pay_address"),
            "network": result.get("network", "TRC20"),
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
            network=result.get("network", "TRC20"),
            expiration_estimate_date=result.get("expiration_estimate_date")
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
                
                # Add to user's real balance
                await db.users.update_one(
                    {"user_id": user.user_id},
                    {"$inc": {"real_balance": credit_amount}}
                )
                
                print(f"Credited ${credit_amount} to user {user.user_id} for payment {payment_id}")
        
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
    
    # Generate 1800 ticks (30 minutes of 1-second data)
    for i in range(1800, 0, -1):
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
async def add_chart_tick(symbol: str):
    """Add a new tick to the chart data - called periodically to keep data fresh"""
    symbol_key = symbol.replace("/", "_").replace(" ", "_").upper()
    
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
    
    # Only add new tick if enough time has passed (1 second)
    if now <= last_tick["time"]:
        return {"message": "Too soon for new tick", "ticks_count": len(ticks)}
    
    base_price = last_tick["close"]
    volatility = base_price * 0.00008
    change = (random.random() - 0.5) * volatility * 2
    
    new_tick = {
        "time": now,
        "open": round(base_price, 6),
        "high": round(max(base_price, base_price + change) + abs((random.random() - 0.5) * volatility), 6),
        "low": round(min(base_price, base_price + change) - abs((random.random() - 0.5) * volatility), 6),
        "close": round(base_price + change, 6)
    }
    
    ticks.append(new_tick)
    
    # Keep only last 3600 ticks (1 hour)
    if len(ticks) > 3600:
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
    
    return {"message": "Tick added", "new_tick": new_tick, "ticks_count": len(ticks)}

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
