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
from tarspay_service import tarspay_service, fetch_live_exchange_rate, get_current_rate
from email_service import send_verification_otp, verify_otp as verify_email_otp, resend_otp

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
    direction: str  # 'up' or 'down'
    amount: float
    duration: int
    entry_price: float
    account_type: str = "demo"
    payout_percentage: float = 80.0  # Frontend sends asset's payout

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

class SendOTPRequest(BaseModel):
    email: EmailStr

class VerifyEmailOTPRequest(BaseModel):
    email: EmailStr
    otp: str

@api_router.post("/auth/signup")
async def signup(user: UserCreate):
    """Register a new user with email and password - sends OTP for verification"""
    # Check if user exists
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        if existing_user.get("is_verified"):
            raise HTTPException(status_code=400, detail="Email already registered")
        else:
            # User exists but not verified - resend OTP
            success, message = send_verification_otp(user.email)
            if success:
                return {
                    "message": "Verification code sent to your email",
                    "requires_verification": True,
                    "email": user.email
                }
            else:
                raise HTTPException(status_code=500, detail=message)
    
    # Create user
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    hashed_password = hash_password(user.password)
    
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
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.users.insert_one(new_user)
    
    # Send OTP email
    success, message = send_verification_otp(user.email)
    
    if success:
        return {
            "message": "Account created! Verification code sent to your email.",
            "requires_verification": True,
            "email": user.email
        }
    else:
        # Delete user if email failed
        await db.users.delete_one({"user_id": user_id})
        raise HTTPException(status_code=500, detail=f"Failed to send verification email: {message}")

@api_router.post("/auth/verify-email")
async def verify_email_otp_endpoint(request: VerifyEmailOTPRequest):
    """Verify email with OTP code"""
    # Check OTP
    success, message = verify_email_otp(request.email, request.otp)
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    # Get user
    user = await db.users.find_one({"email": request.email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update user as verified
    await db.users.update_one(
        {"email": request.email},
        {"$set": {"is_verified": True}}
    )
    
    # Generate access token
    access_token = create_access_token({"sub": user["user_id"]})
    
    return {
        "message": "Email verified successfully!",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "user_id": user["user_id"],
            "email": user["email"],
            "name": user.get("name", ""),
            "demo_balance": user.get("demo_balance", 10000.0),
            "real_balance": user.get("real_balance", 0.0),
            "bonus_balance": user.get("bonus_balance", 0.0),
            "is_admin": user.get("is_admin", False)
        }
    }

@api_router.post("/auth/resend-otp")
async def resend_verification_otp(request: SendOTPRequest):
    """Resend OTP to email"""
    # Check if user exists
    user = await db.users.find_one({"email": request.email})
    if not user:
        raise HTTPException(status_code=404, detail="Email not found")
    
    if user.get("is_verified"):
        raise HTTPException(status_code=400, detail="Email already verified")
    
    success, message = resend_otp(request.email)
    
    if success:
        return {"message": "Verification code sent to your email"}
    else:
        raise HTTPException(status_code=400, detail=message)

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
        "direction": trade.direction,  # UP or DOWN direction
        "amount": trade.amount,
        "entry_price": trade.entry_price,
        "exit_price": None,
        "duration": trade.duration,
        "payout_percentage": trade.payout_percentage,  # Use frontend's asset payout
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
        {"account_id": 1, "nickname": 1, "full_name": 1, "name": 1, "country": 1, "country_flag": 1, "is_verified": 1}
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
            "is_verified": user_doc.get("is_verified", False) if user_doc else False,
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
        "is_verified": user_doc.get("is_verified", False) if user_doc else False,
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

# ============= Old Admin Routes (Legacy - Kept for compatibility) =============
# Note: New admin routes are at the end of this file

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

# ============= TarsPay Payment Gateway (bKash, Nagad) =============

class TarsPayDepositRequest(BaseModel):
    amount: float = Field(..., description="Amount in USD")
    channel: str = Field(default="bkash", description="Payment channel: bkash, nagad, bkash_official")
    phone: Optional[str] = Field(None, description="Customer phone/wallet number")

@api_router.get("/tarspay/channels")
async def get_tarspay_channels():
    """Get available TarsPay payment channels (bKash, Nagad)"""
    # Fetch live exchange rate
    exchange_rate = await fetch_live_exchange_rate()
    channels = tarspay_service.get_channels()
    return {
        "success": True,
        "channels": channels,
        "exchange_rate": {
            "usd_to_bdt": exchange_rate,
            "currency": "BDT"
        }
    }

@api_router.post("/tarspay/deposit/create")
async def create_tarspay_deposit(
    request: TarsPayDepositRequest,
    authorization: Optional[str] = Header(None),
    req: Request = None
):
    """Create a deposit order using TarsPay (bKash/Nagad)"""
    try:
        user = await get_current_user(authorization, req)
    except HTTPException:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Generate unique order ID
    order_id = f"BYNIX{user.user_id[:8]}{int(datetime.now().timestamp())}"
    
    # Get base URL for callbacks
    host = req.headers.get("host", "localhost")
    scheme = "https" if "preview.emergentagent.com" in host else req.url.scheme
    base_url = f"{scheme}://{host}"
    
    notify_url = f"{base_url}/api/tarspay/callback"
    return_url = f"{base_url}/(tabs)/trade"
    
    # Create TarsPay order
    result = await tarspay_service.create_deposit_order(
        order_id=order_id,
        amount_usd=request.amount,
        channel=request.channel,
        customer_phone=request.phone,
        notify_url=notify_url,
        return_url=return_url
    )
    
    if result.get("success"):
        # Save deposit record
        deposit_record = {
            "user_id": user.user_id,
            "order_id": order_id,
            "payment_id": result.get("payment_id"),
            "amount_usd": request.amount,
            "amount_bdt": result.get("amount_bdt"),
            "channel": request.channel,
            "channel_name": result.get("channel_name"),
            "pay_url": result.get("pay_url"),
            "status": "pending",
            "payment_type": "tarspay",
            "created_at": datetime.now(timezone.utc),
        }
        await db.deposits.insert_one(deposit_record)
        
        return {
            "success": True,
            "order_id": order_id,
            "payment_id": result.get("payment_id"),
            "amount_usd": request.amount,
            "amount_bdt": result.get("amount_bdt"),
            "pay_url": result.get("pay_url"),
            "channel": request.channel,
            "channel_name": result.get("channel_name")
        }
    else:
        return {
            "success": False,
            "error": result.get("error", "Failed to create payment")
        }

@api_router.get("/tarspay/deposit/status/{order_id}")
async def get_tarspay_deposit_status(
    order_id: str,
    authorization: Optional[str] = Header(None),
    req: Request = None
):
    """Check TarsPay deposit order status"""
    try:
        user = await get_current_user(authorization, req)
    except HTTPException:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Get status from TarsPay
    result = await tarspay_service.get_order_status(order_id)
    
    if result.get("success"):
        # If payment is successful, credit user's balance
        if result.get("paid") and result.get("status") == "success":
            deposit = await db.deposits.find_one({
                "order_id": order_id,
                "user_id": user.user_id
            })
            
            if deposit and deposit.get("status") != "completed":
                amount_usd = deposit.get("amount_usd", 0)
                
                # Update deposit status
                await db.deposits.update_one(
                    {"order_id": order_id},
                    {
                        "$set": {
                            "status": "completed",
                            "completed_at": datetime.now(timezone.utc)
                        }
                    }
                )
                
                # Credit user's balance
                await db.users.update_one(
                    {"user_id": user.user_id},
                    {"$inc": {"real_balance": amount_usd}}
                )
                
                # Create notification
                await create_notification(
                    user.user_id,
                    "Deposit Successful! 💰",
                    f"${amount_usd:.2f} has been credited to your account via {deposit.get('channel_name', 'bKash/Nagad')}",
                    "deposit"
                )
                
                print(f"TarsPay: Credited ${amount_usd} to user {user.user_id}")
        
        return {
            "success": True,
            "order_id": order_id,
            "status": result.get("status"),
            "paid": result.get("paid", False)
        }
    else:
        return {
            "success": False,
            "error": result.get("error", "Failed to get status")
        }

@api_router.post("/tarspay/callback")
async def tarspay_callback(request: Request):
    """Handle TarsPay payment callback notifications"""
    try:
        body = await request.json()
        signature = request.headers.get("X-RESP-SIGNATURE", "")
        
        print(f"TarsPay Callback: {body}")
        
        # Verify signature (optional but recommended)
        # content = json.dumps(body, separators=(',', ':'))
        # if not tarspay_service.verify_callback_signature(content, signature):
        #     return Response(content="DENY", status_code=200)
        
        order_id = body.get("mchOrderNo")
        order_state = body.get("orderState")  # 2 = success
        
        if order_id and order_state == 2:
            # Find deposit record
            deposit = await db.deposits.find_one({"order_id": order_id})
            
            if deposit and deposit.get("status") != "completed":
                user_id = deposit.get("user_id")
                amount_usd = deposit.get("amount_usd", 0)
                
                # Update deposit status
                await db.deposits.update_one(
                    {"order_id": order_id},
                    {
                        "$set": {
                            "status": "completed",
                            "completed_at": datetime.now(timezone.utc),
                            "callback_data": body
                        }
                    }
                )
                
                # Credit user's balance
                await db.users.update_one(
                    {"user_id": user_id},
                    {"$inc": {"real_balance": amount_usd}}
                )
                
                # Create notification
                await create_notification(
                    user_id,
                    "Deposit Successful! 💰",
                    f"${amount_usd:.2f} has been credited to your account",
                    "deposit"
                )
                
                print(f"TarsPay Callback: Credited ${amount_usd} to user {user_id}")
        
        # Return OK to acknowledge receipt
        return Response(content="OK", status_code=200)
        
    except Exception as e:
        print(f"TarsPay Callback Error: {e}")
        return Response(content="OK", status_code=200)

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
    
    # Generate 120000 ticks (2000 minutes of 1-second data = 2000 candles at 1m)
    # This ensures we have 2000 candles for professional 24hr+ view
    for i in range(120000, 0, -1):
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

# Note: app.include_router(api_router) moved to end of file to include all routes

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

# ============= ADMIN API ENDPOINTS =============

@api_router.get("/admin/stats")
async def admin_get_stats(authorization: Optional[str] = Header(None), request: Request = None):
    """Get admin dashboard statistics"""
    user = await get_current_user(authorization, request)
    
    # Get total users
    total_users = await db.users.count_documents({})
    
    # Get total trades
    total_trades = await db.trades.count_documents({})
    
    # Get total volume
    volume_pipeline = [
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    volume_result = await db.trades.aggregate(volume_pipeline).to_list(1)
    total_volume = volume_result[0]["total"] if volume_result else 0
    
    # Get total deposits
    deposits_pipeline = [
        {"$match": {"status": "completed"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount_usd"}}}
    ]
    deposits_result = await db.deposits.aggregate(deposits_pipeline).to_list(1)
    total_deposits = deposits_result[0]["total"] if deposits_result else 0
    
    # Get pending counts
    pending_withdrawals = await db.withdrawals.count_documents({"status": "pending"})
    pending_deposits = await db.deposits.count_documents({"status": "pending"})
    
    # Active users today
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    active_users_today = await db.trades.distinct("user_id", {"created_at": {"$gte": today}})
    
    return {
        "total_users": total_users,
        "total_trades": total_trades,
        "total_volume": total_volume,
        "total_deposits": total_deposits,
        "total_withdrawals": 0,
        "pending_withdrawals": pending_withdrawals,
        "pending_deposits": pending_deposits,
        "active_users_today": len(active_users_today)
    }

@api_router.get("/admin/users")
async def admin_get_users(authorization: Optional[str] = Header(None), request: Request = None):
    """Get all users for admin"""
    user = await get_current_user(authorization, request)
    
    users = await db.users.find({}).sort("created_at", -1).to_list(500)
    
    return {
        "users": [
            {
                "user_id": u.get("user_id"),
                "email": u.get("email"),
                "name": u.get("name") or u.get("full_name"),
                "account_id": u.get("account_id"),
                "real_balance": u.get("real_balance", 0),
                "demo_balance": u.get("demo_balance", 10000),
                "bonus_balance": u.get("bonus_balance", 0),
                "is_verified": u.get("is_verified", False),
                "is_admin": u.get("is_admin", False),
                "country": u.get("country"),
                "country_flag": u.get("country_flag"),
                "created_at": str(u.get("created_at", ""))
            }
            for u in users
        ]
    }

@api_router.get("/admin/trades")
async def admin_get_trades(
    limit: int = 50,
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    """Get all trades for admin"""
    user = await get_current_user(authorization, request)
    
    trades = await db.trades.find({}).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {
        "trades": [
            {
                "trade_id": t.get("trade_id"),
                "user_id": t.get("user_id"),
                "asset": t.get("asset"),
                "amount": t.get("amount"),
                "direction": t.get("direction"),
                "status": t.get("status"),
                "profit_loss": t.get("profit_loss", 0),
                "entry_price": t.get("entry_price"),
                "exit_price": t.get("exit_price"),
                "created_at": str(t.get("created_at", ""))
            }
            for t in trades
        ]
    }

@api_router.get("/admin/deposits")
async def admin_get_deposits(authorization: Optional[str] = Header(None), request: Request = None):
    """Get all deposits for admin"""
    user = await get_current_user(authorization, request)
    
    deposits = await db.deposits.find({}).sort("created_at", -1).limit(100).to_list(100)
    
    return {
        "deposits": [
            {
                "_id": str(d.get("_id")),
                "user_id": d.get("user_id"),
                "amount_usd": d.get("amount_usd") or d.get("amount", 0),
                "status": d.get("status"),
                "payment_type": d.get("payment_type", "crypto"),
                "created_at": str(d.get("created_at", ""))
            }
            for d in deposits
        ]
    }

@api_router.post("/admin/users/{user_id}/balance")
async def admin_update_user_balance(
    user_id: str,
    balance_type: str = "real",
    amount: float = 0,
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    """Update user balance (admin only)"""
    admin = await get_current_user(authorization, request)
    
    # Get request body
    try:
        body = await request.json()
        balance_type = body.get("balance_type", "real")
        amount = body.get("amount", 0)
    except:
        pass
    
    # Update balance field
    field_map = {
        "real": "real_balance",
        "demo": "demo_balance",
        "bonus": "bonus_balance"
    }
    
    field = field_map.get(balance_type, "real_balance")
    
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {field: float(amount)}}
    )
    
    if result.modified_count > 0:
        return {"success": True, "message": f"Updated {balance_type} balance to ${amount}"}
    else:
        raise HTTPException(status_code=404, detail="User not found")



# ============= ADVANCED ADMIN ANALYTICS =============

@api_router.get("/admin/analytics")
async def get_admin_analytics(
    period: str = "week",  # week, month, year
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    """Get analytics data with time filters"""
    user = await get_current_user(authorization, request)
    
    now = datetime.now(timezone.utc)
    
    # Calculate date range based on period
    if period == "week":
        start_date = now - timedelta(days=7)
        group_format = "%Y-%m-%d"
        labels = [(now - timedelta(days=i)).strftime("%a") for i in range(6, -1, -1)]
    elif period == "month":
        start_date = now - timedelta(days=30)
        group_format = "%Y-%m-%d"
        labels = [(now - timedelta(days=i)).strftime("%d %b") for i in range(29, -1, -3)][::-1]
    else:  # year
        start_date = now - timedelta(days=365)
        group_format = "%Y-%m"
        labels = [(now - timedelta(days=i*30)).strftime("%b") for i in range(11, -1, -1)]
    
    # Get deposits by date
    deposits_pipeline = [
        {"$match": {"created_at": {"$gte": start_date}, "status": "completed"}},
        {"$group": {
            "_id": {"$dateToString": {"format": group_format, "date": "$created_at"}},
            "total": {"$sum": "$amount_usd"}
        }},
        {"$sort": {"_id": 1}}
    ]
    deposits_data = await db.deposits.aggregate(deposits_pipeline).to_list(100)
    
    # Get withdrawals by date
    withdrawals_pipeline = [
        {"$match": {"created_at": {"$gte": start_date}, "status": "completed"}},
        {"$group": {
            "_id": {"$dateToString": {"format": group_format, "date": "$created_at"}},
            "total": {"$sum": "$amount"}
        }},
        {"$sort": {"_id": 1}}
    ]
    withdrawals_data = await db.withdrawals.aggregate(withdrawals_pipeline).to_list(100)
    
    # Get profit/loss by date (platform profit = user losses)
    trades_pipeline = [
        {"$match": {"created_at": {"$gte": start_date}, "status": {"$in": ["won", "lost"]}}},
        {"$group": {
            "_id": {"$dateToString": {"format": group_format, "date": "$created_at"}},
            "platform_profit": {"$sum": {"$cond": [{"$eq": ["$status", "lost"]}, "$amount", {"$multiply": ["$profit_loss", -1]}]}}
        }},
        {"$sort": {"_id": 1}}
    ]
    profit_data = await db.trades.aggregate(trades_pipeline).to_list(100)
    
    # Calculate totals
    total_deposits = sum(d["total"] for d in deposits_data) if deposits_data else 0
    total_withdrawals = sum(w["total"] for w in withdrawals_data) if withdrawals_data else 0
    total_profit = sum(p["platform_profit"] for p in profit_data) if profit_data else 0
    
    return {
        "period": period,
        "labels": labels,
        "deposits": {
            "data": [d["total"] for d in deposits_data],
            "dates": [d["_id"] for d in deposits_data],
            "total": total_deposits
        },
        "withdrawals": {
            "data": [w["total"] for w in withdrawals_data],
            "dates": [w["_id"] for w in withdrawals_data],
            "total": total_withdrawals
        },
        "profit_loss": {
            "data": [p["platform_profit"] for p in profit_data],
            "dates": [p["_id"] for p in profit_data],
            "total": total_profit
        },
        "summary": {
            "net_revenue": total_deposits - total_withdrawals,
            "total_deposits": total_deposits,
            "total_withdrawals": total_withdrawals,
            "platform_profit": total_profit
        }
    }

# ============= MANUAL DEPOSIT SYSTEM =============

@api_router.post("/admin/manual-deposit")
async def create_manual_deposit(
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    """Admin manually adds deposit to user account"""
    admin = await get_current_user(authorization, request)
    
    body = await request.json()
    user_id = body.get("user_id")
    amount = float(body.get("amount", 0))
    balance_type = body.get("balance_type", "real")  # real, demo, bonus
    note = body.get("note", "Manual deposit by admin")
    
    if not user_id or amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid user_id or amount")
    
    # Find user
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Map balance type to field
    field_map = {
        "real": "real_balance",
        "demo": "demo_balance",
        "bonus": "bonus_balance"
    }
    field = field_map.get(balance_type, "real_balance")
    current_balance = user.get(field, 0)
    new_balance = current_balance + amount
    
    # Update user balance
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {field: new_balance}}
    )
    
    # Create deposit record
    deposit_id = f"manual_{uuid.uuid4().hex[:12]}"
    await db.deposits.insert_one({
        "deposit_id": deposit_id,
        "user_id": user_id,
        "amount_usd": amount,
        "balance_type": balance_type,
        "status": "completed",
        "payment_type": "manual",
        "note": note,
        "admin_id": admin.user_id,
        "created_at": datetime.now(timezone.utc)
    })
    
    return {
        "success": True,
        "message": f"Added ${amount} to {balance_type} balance",
        "deposit_id": deposit_id,
        "new_balance": new_balance
    }

# ============= ASSET MANAGEMENT =============

@api_router.get("/admin/assets")
async def get_admin_assets(authorization: Optional[str] = Header(None), request: Request = None):
    """Get all assets for admin management"""
    user = await get_current_user(authorization, request)
    
    assets = await db.assets.find({}).to_list(100)
    
    return {
        "assets": [
            {
                "asset_id": a.get("asset_id"),
                "symbol": a.get("symbol"),
                "name": a.get("name"),
                "category": a.get("category"),
                "payout_percentage": a.get("payout_percentage", 80),
                "is_active": a.get("is_active", True),
                "is_otc": a.get("is_otc", False),
                "min_amount": a.get("min_amount", 1),
                "max_amount": a.get("max_amount", 10000),
                "created_at": str(a.get("created_at", ""))
            }
            for a in assets
        ]
    }

@api_router.post("/admin/assets")
async def create_asset(authorization: Optional[str] = Header(None), request: Request = None):
    """Create new trading asset (including OTC)"""
    user = await get_current_user(authorization, request)
    
    body = await request.json()
    
    asset_id = f"asset_{uuid.uuid4().hex[:8]}"
    symbol = body.get("symbol", "").upper()
    name = body.get("name", symbol)
    category = body.get("category", "forex")  # forex, crypto, stocks, otc
    payout_percentage = float(body.get("payout_percentage", 80))
    is_otc = body.get("is_otc", False)
    min_amount = float(body.get("min_amount", 1))
    max_amount = float(body.get("max_amount", 10000))
    
    if not symbol:
        raise HTTPException(status_code=400, detail="Symbol is required")
    
    # Check if asset already exists
    existing = await db.assets.find_one({"symbol": symbol})
    if existing:
        raise HTTPException(status_code=400, detail="Asset with this symbol already exists")
    
    asset = {
        "asset_id": asset_id,
        "symbol": symbol,
        "name": name,
        "category": category,
        "payout_percentage": payout_percentage,
        "is_active": True,
        "is_otc": is_otc,
        "min_amount": min_amount,
        "max_amount": max_amount,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.assets.insert_one(asset)
    
    return {"success": True, "asset": asset}

@api_router.put("/admin/assets/{asset_id}")
async def update_asset(
    asset_id: str,
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    """Update asset settings"""
    user = await get_current_user(authorization, request)
    
    body = await request.json()
    
    update_fields = {}
    if "name" in body:
        update_fields["name"] = body["name"]
    if "payout_percentage" in body:
        update_fields["payout_percentage"] = float(body["payout_percentage"])
    if "is_active" in body:
        update_fields["is_active"] = bool(body["is_active"])
    if "is_otc" in body:
        update_fields["is_otc"] = bool(body["is_otc"])
    if "min_amount" in body:
        update_fields["min_amount"] = float(body["min_amount"])
    if "max_amount" in body:
        update_fields["max_amount"] = float(body["max_amount"])
    if "category" in body:
        update_fields["category"] = body["category"]
    
    result = await db.assets.update_one(
        {"asset_id": asset_id},
        {"$set": update_fields}
    )
    
    if result.modified_count > 0:
        return {"success": True, "message": "Asset updated"}
    else:
        raise HTTPException(status_code=404, detail="Asset not found")

@api_router.post("/admin/assets/{asset_id}/toggle")
async def toggle_asset(
    asset_id: str,
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    """Toggle asset on/off"""
    user = await get_current_user(authorization, request)
    
    asset = await db.assets.find_one({"asset_id": asset_id})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    new_status = not asset.get("is_active", True)
    
    await db.assets.update_one(
        {"asset_id": asset_id},
        {"$set": {"is_active": new_status}}
    )
    
    return {"success": True, "is_active": new_status}

@api_router.delete("/admin/assets/{asset_id}")
async def delete_asset(
    asset_id: str,
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    """Delete an asset"""
    user = await get_current_user(authorization, request)
    
    result = await db.assets.delete_one({"asset_id": asset_id})
    
    if result.deleted_count > 0:
        return {"success": True, "message": "Asset deleted"}
    else:
        raise HTTPException(status_code=404, detail="Asset not found")

# ============= WITHDRAWAL MANAGEMENT =============

@api_router.get("/admin/withdrawals")
async def get_admin_withdrawals(
    status: str = None,
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    """Get all withdrawals for admin"""
    user = await get_current_user(authorization, request)
    
    query = {}
    if status:
        query["status"] = status
    
    withdrawals = await db.withdrawals.find(query).sort("created_at", -1).limit(100).to_list(100)
    
    # Get user info for each withdrawal
    result = []
    for w in withdrawals:
        user_info = await db.users.find_one({"user_id": w.get("user_id")})
        result.append({
            "withdrawal_id": w.get("withdrawal_id") or str(w.get("_id")),
            "user_id": w.get("user_id"),
            "user_email": user_info.get("email") if user_info else "Unknown",
            "user_name": user_info.get("name") or user_info.get("full_name") if user_info else "Unknown",
            "amount": w.get("amount", 0),
            "method": w.get("method", "crypto"),
            "wallet_address": w.get("wallet_address", ""),
            "status": w.get("status", "pending"),
            "created_at": str(w.get("created_at", ""))
        })
    
    return {"withdrawals": result}

@api_router.post("/admin/withdrawals/{withdrawal_id}/approve")
async def approve_withdrawal(
    withdrawal_id: str,
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    """Approve a withdrawal request"""
    admin = await get_current_user(authorization, request)
    
    withdrawal = await db.withdrawals.find_one({
        "$or": [
            {"withdrawal_id": withdrawal_id},
            {"_id": withdrawal_id}
        ]
    })
    
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Withdrawal not found")
    
    if withdrawal.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Withdrawal is not pending")
    
    await db.withdrawals.update_one(
        {"_id": withdrawal["_id"]},
        {
            "$set": {
                "status": "completed",
                "approved_by": admin.user_id,
                "approved_at": datetime.now(timezone.utc)
            }
        }
    )
    
    return {"success": True, "message": "Withdrawal approved"}

@api_router.post("/admin/withdrawals/{withdrawal_id}/reject")
async def reject_withdrawal(
    withdrawal_id: str,
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    """Reject a withdrawal request and refund balance"""
    admin = await get_current_user(authorization, request)
    
    body = await request.json()
    reason = body.get("reason", "Rejected by admin")
    
    withdrawal = await db.withdrawals.find_one({
        "$or": [
            {"withdrawal_id": withdrawal_id},
            {"_id": withdrawal_id}
        ]
    })
    
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Withdrawal not found")
    
    if withdrawal.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Withdrawal is not pending")
    
    # Refund the amount to user
    await db.users.update_one(
        {"user_id": withdrawal["user_id"]},
        {"$inc": {"real_balance": withdrawal.get("amount", 0)}}
    )
    
    await db.withdrawals.update_one(
        {"_id": withdrawal["_id"]},
        {
            "$set": {
                "status": "rejected",
                "rejected_by": admin.user_id,
                "rejected_at": datetime.now(timezone.utc),
                "rejection_reason": reason
            }
        }
    )
    
    return {"success": True, "message": "Withdrawal rejected and balance refunded"}




# ============= GOD MODE CONTROL SYSTEM =============

@api_router.get("/admin/god-mode/status")
async def get_god_mode_status(authorization: Optional[str] = Header(None), request: Request = None):
    """Get current God Mode settings"""
    user = await get_current_user(authorization, request)
    
    # Get or create platform settings
    settings = await db.platform_settings.find_one({"_id": "god_mode"})
    if not settings:
        settings = {
            "_id": "god_mode",
            "trading_enabled": True,
            "withdrawals_enabled": True,
            "deposits_enabled": True,
            "global_payout_modifier": 100,  # percentage (100 = normal)
            "global_win_rate_modifier": 100,  # percentage
            "maintenance_mode": False,
            "emergency_message": "",
            "updated_at": datetime.now(timezone.utc),
            "updated_by": None
        }
        await db.platform_settings.insert_one(settings)
    
    return {
        "trading_enabled": settings.get("trading_enabled", True),
        "withdrawals_enabled": settings.get("withdrawals_enabled", True),
        "deposits_enabled": settings.get("deposits_enabled", True),
        "global_payout_modifier": settings.get("global_payout_modifier", 100),
        "global_win_rate_modifier": settings.get("global_win_rate_modifier", 100),
        "maintenance_mode": settings.get("maintenance_mode", False),
        "emergency_message": settings.get("emergency_message", ""),
        "updated_at": str(settings.get("updated_at", "")),
        "updated_by": settings.get("updated_by")
    }

@api_router.post("/admin/god-mode/kill-switch")
async def toggle_kill_switch(authorization: Optional[str] = Header(None), request: Request = None):
    """Toggle trading kill switch - instantly disable/enable all trading"""
    user = await get_current_user(authorization, request)
    
    body = await request.json()
    enabled = body.get("enabled", False)
    
    await db.platform_settings.update_one(
        {"_id": "god_mode"},
        {
            "$set": {
                "trading_enabled": enabled,
                "updated_at": datetime.now(timezone.utc),
                "updated_by": user.user_id
            }
        },
        upsert=True
    )
    
    # Log the action
    await db.admin_logs.insert_one({
        "action": "kill_switch",
        "admin_id": user.user_id,
        "details": {"trading_enabled": enabled},
        "timestamp": datetime.now(timezone.utc)
    })
    
    return {"success": True, "trading_enabled": enabled}

@api_router.post("/admin/god-mode/freeze-withdrawals")
async def freeze_withdrawals(authorization: Optional[str] = Header(None), request: Request = None):
    """Freeze/unfreeze all withdrawals"""
    user = await get_current_user(authorization, request)
    
    body = await request.json()
    enabled = body.get("enabled", True)
    
    await db.platform_settings.update_one(
        {"_id": "god_mode"},
        {
            "$set": {
                "withdrawals_enabled": enabled,
                "updated_at": datetime.now(timezone.utc),
                "updated_by": user.user_id
            }
        },
        upsert=True
    )
    
    await db.admin_logs.insert_one({
        "action": "freeze_withdrawals",
        "admin_id": user.user_id,
        "details": {"withdrawals_enabled": enabled},
        "timestamp": datetime.now(timezone.utc)
    })
    
    return {"success": True, "withdrawals_enabled": enabled}

@api_router.post("/admin/god-mode/global-payout")
async def set_global_payout(authorization: Optional[str] = Header(None), request: Request = None):
    """Set global payout modifier (affects all trades)"""
    user = await get_current_user(authorization, request)
    
    body = await request.json()
    modifier = float(body.get("modifier", 100))  # 0-200%
    
    if modifier < 0 or modifier > 200:
        raise HTTPException(status_code=400, detail="Modifier must be between 0 and 200")
    
    await db.platform_settings.update_one(
        {"_id": "god_mode"},
        {
            "$set": {
                "global_payout_modifier": modifier,
                "updated_at": datetime.now(timezone.utc),
                "updated_by": user.user_id
            }
        },
        upsert=True
    )
    
    await db.admin_logs.insert_one({
        "action": "global_payout_change",
        "admin_id": user.user_id,
        "details": {"modifier": modifier},
        "timestamp": datetime.now(timezone.utc)
    })
    
    return {"success": True, "global_payout_modifier": modifier}

@api_router.post("/admin/god-mode/global-win-rate")
async def set_global_win_rate(authorization: Optional[str] = Header(None), request: Request = None):
    """Set global win rate modifier"""
    user = await get_current_user(authorization, request)
    
    body = await request.json()
    modifier = float(body.get("modifier", 100))  # 0-200%
    
    if modifier < 0 or modifier > 200:
        raise HTTPException(status_code=400, detail="Modifier must be between 0 and 200")
    
    await db.platform_settings.update_one(
        {"_id": "god_mode"},
        {
            "$set": {
                "global_win_rate_modifier": modifier,
                "updated_at": datetime.now(timezone.utc),
                "updated_by": user.user_id
            }
        },
        upsert=True
    )
    
    await db.admin_logs.insert_one({
        "action": "global_win_rate_change",
        "admin_id": user.user_id,
        "details": {"modifier": modifier},
        "timestamp": datetime.now(timezone.utc)
    })
    
    return {"success": True, "global_win_rate_modifier": modifier}

@api_router.post("/admin/god-mode/maintenance")
async def toggle_maintenance(authorization: Optional[str] = Header(None), request: Request = None):
    """Toggle maintenance mode"""
    user = await get_current_user(authorization, request)
    
    body = await request.json()
    enabled = body.get("enabled", False)
    message = body.get("message", "Platform is under maintenance. Please try again later.")
    
    await db.platform_settings.update_one(
        {"_id": "god_mode"},
        {
            "$set": {
                "maintenance_mode": enabled,
                "emergency_message": message,
                "updated_at": datetime.now(timezone.utc),
                "updated_by": user.user_id
            }
        },
        upsert=True
    )
    
    return {"success": True, "maintenance_mode": enabled}

# ============= TRADE ENGINE CONTROL =============

@api_router.get("/admin/trades/live")
async def get_live_trades(
    limit: int = 50,
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    """Get live/active trades for monitoring"""
    user = await get_current_user(authorization, request)
    
    # Get active (pending) trades
    active_trades = await db.trades.find(
        {"status": "active"}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Get recent completed trades
    recent_trades = await db.trades.find(
        {"status": {"$in": ["won", "lost", "cancelled"]}}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Get user info for trades
    result_active = []
    for t in active_trades:
        user_info = await db.users.find_one({"user_id": t.get("user_id")})
        result_active.append({
            "trade_id": t.get("trade_id"),
            "user_id": t.get("user_id"),
            "user_email": user_info.get("email") if user_info else "Unknown",
            "asset": t.get("asset"),
            "amount": t.get("amount"),
            "direction": t.get("direction"),
            "entry_price": t.get("entry_price"),
            "payout_percentage": t.get("payout_percentage", 80),
            "expiry_time": str(t.get("expiry_time", "")),
            "created_at": str(t.get("created_at", "")),
            "account_type": t.get("account_type", "demo"),
            "status": "active"
        })
    
    result_recent = []
    for t in recent_trades:
        user_info = await db.users.find_one({"user_id": t.get("user_id")})
        result_recent.append({
            "trade_id": t.get("trade_id"),
            "user_id": t.get("user_id"),
            "user_email": user_info.get("email") if user_info else "Unknown",
            "asset": t.get("asset"),
            "amount": t.get("amount"),
            "direction": t.get("direction"),
            "entry_price": t.get("entry_price"),
            "exit_price": t.get("exit_price"),
            "profit_loss": t.get("profit_loss", 0),
            "status": t.get("status"),
            "created_at": str(t.get("created_at", "")),
            "account_type": t.get("account_type", "demo")
        })
    
    return {
        "active_trades": result_active,
        "recent_trades": result_recent,
        "active_count": len(result_active)
    }

@api_router.post("/admin/trades/{trade_id}/override")
async def override_trade_result(
    trade_id: str,
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    """Override trade result (force win/lose)"""
    admin = await get_current_user(authorization, request)
    
    body = await request.json()
    forced_result = body.get("result")  # "win" or "lose"
    
    if forced_result not in ["win", "lose"]:
        raise HTTPException(status_code=400, detail="Result must be 'win' or 'lose'")
    
    trade = await db.trades.find_one({"trade_id": trade_id})
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    
    # Get user
    user = await db.users.find_one({"user_id": trade["user_id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    amount = trade.get("amount", 0)
    payout_percentage = trade.get("payout_percentage", 80)
    account_type = trade.get("account_type", "demo")
    balance_field = "demo_balance" if account_type == "demo" else "real_balance"
    
    # If trade was already settled, reverse the previous result first
    if trade.get("status") in ["won", "lost"]:
        old_profit_loss = trade.get("profit_loss", 0)
        await db.users.update_one(
            {"user_id": trade["user_id"]},
            {"$inc": {balance_field: -old_profit_loss}}
        )
    
    # Apply new result
    if forced_result == "win":
        profit = amount * (payout_percentage / 100)
        new_status = "won"
        profit_loss = profit
        # Return original amount + profit
        await db.users.update_one(
            {"user_id": trade["user_id"]},
            {"$inc": {balance_field: amount + profit}}
        )
    else:
        new_status = "lost"
        profit_loss = -amount
        # Don't return anything (amount already deducted)
    
    # Update trade
    await db.trades.update_one(
        {"trade_id": trade_id},
        {
            "$set": {
                "status": new_status,
                "profit_loss": profit_loss,
                "admin_override": True,
                "overridden_by": admin.user_id,
                "overridden_at": datetime.now(timezone.utc)
            }
        }
    )
    
    # Log the action
    await db.admin_logs.insert_one({
        "action": "trade_override",
        "admin_id": admin.user_id,
        "trade_id": trade_id,
        "details": {
            "forced_result": forced_result,
            "user_id": trade["user_id"],
            "amount": amount
        },
        "timestamp": datetime.now(timezone.utc)
    })
    
    return {"success": True, "new_status": new_status, "profit_loss": profit_loss}

@api_router.post("/admin/trades/{trade_id}/cancel")
async def cancel_trade(
    trade_id: str,
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    """Cancel a trade and refund the user"""
    admin = await get_current_user(authorization, request)
    
    trade = await db.trades.find_one({"trade_id": trade_id})
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    
    if trade.get("status") == "cancelled":
        raise HTTPException(status_code=400, detail="Trade already cancelled")
    
    amount = trade.get("amount", 0)
    account_type = trade.get("account_type", "demo")
    balance_field = "demo_balance" if account_type == "demo" else "real_balance"
    
    # If trade was settled, need to reverse
    if trade.get("status") in ["won", "lost"]:
        old_profit_loss = trade.get("profit_loss", 0)
        # Reverse previous settlement
        await db.users.update_one(
            {"user_id": trade["user_id"]},
            {"$inc": {balance_field: -old_profit_loss}}
        )
    
    # Refund original amount
    await db.users.update_one(
        {"user_id": trade["user_id"]},
        {"$inc": {balance_field: amount}}
    )
    
    # Update trade status
    await db.trades.update_one(
        {"trade_id": trade_id},
        {
            "$set": {
                "status": "cancelled",
                "profit_loss": 0,
                "cancelled_by": admin.user_id,
                "cancelled_at": datetime.now(timezone.utc)
            }
        }
    )
    
    await db.admin_logs.insert_one({
        "action": "trade_cancelled",
        "admin_id": admin.user_id,
        "trade_id": trade_id,
        "details": {"amount_refunded": amount},
        "timestamp": datetime.now(timezone.utc)
    })
    
    return {"success": True, "message": f"Trade cancelled, ${amount} refunded"}

# ============= USER RISK CONTROL =============

@api_router.get("/admin/users/{user_id}/risk-profile")
async def get_user_risk_profile(
    user_id: str,
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    """Get detailed user risk profile"""
    admin = await get_current_user(authorization, request)
    
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Calculate trading stats
    trades = await db.trades.find({"user_id": user_id}).to_list(1000)
    total_trades = len(trades)
    won_trades = len([t for t in trades if t.get("status") == "won"])
    lost_trades = len([t for t in trades if t.get("status") == "lost"])
    total_volume = sum(t.get("amount", 0) for t in trades)
    total_profit = sum(t.get("profit_loss", 0) for t in trades if t.get("status") in ["won", "lost"])
    
    win_rate = (won_trades / total_trades * 100) if total_trades > 0 else 0
    
    # Calculate deposits/withdrawals
    deposits = await db.deposits.find({"user_id": user_id, "status": "completed"}).to_list(100)
    withdrawals = await db.withdrawals.find({"user_id": user_id, "status": "completed"}).to_list(100)
    total_deposited = sum(d.get("amount_usd", 0) for d in deposits)
    total_withdrawn = sum(w.get("amount", 0) for w in withdrawals)
    
    # Calculate AI risk score (simplified)
    risk_score = 50  # Base score
    if total_profit > total_deposited:
        risk_score += min(30, (total_profit - total_deposited) / 100)  # Profitable user = higher risk
    if win_rate > 60:
        risk_score += 10  # High win rate
    if total_volume > 10000:
        risk_score += 10  # High volume
    risk_score = min(100, max(0, risk_score))
    
    return {
        "user_id": user_id,
        "email": user.get("email"),
        "name": user.get("name") or user.get("full_name"),
        "balances": {
            "real": user.get("real_balance", 0),
            "demo": user.get("demo_balance", 10000),
            "bonus": user.get("bonus_balance", 0)
        },
        "trading_stats": {
            "total_trades": total_trades,
            "won_trades": won_trades,
            "lost_trades": lost_trades,
            "win_rate": round(win_rate, 2),
            "total_volume": total_volume,
            "total_profit": total_profit
        },
        "financial_stats": {
            "total_deposited": total_deposited,
            "total_withdrawn": total_withdrawn,
            "net_deposit": total_deposited - total_withdrawn
        },
        "risk_controls": {
            "win_rate_modifier": user.get("win_rate_modifier", 100),
            "payout_modifier": user.get("payout_modifier", 100),
            "max_trade_amount": user.get("max_trade_amount"),
            "is_shadow_banned": user.get("is_shadow_banned", False),
            "is_flagged": user.get("is_flagged", False),
            "risk_level": user.get("risk_level", "normal"),
            "notes": user.get("admin_notes", "")
        },
        "ai_risk_score": round(risk_score, 1),
        "created_at": str(user.get("created_at", ""))
    }

@api_router.post("/admin/users/{user_id}/win-rate")
async def set_user_win_rate(
    user_id: str,
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    """Set user-specific win rate modifier (hidden from user)"""
    admin = await get_current_user(authorization, request)
    
    body = await request.json()
    modifier = float(body.get("modifier", 100))  # 0-200%
    
    if modifier < 0 or modifier > 200:
        raise HTTPException(status_code=400, detail="Modifier must be between 0 and 200")
    
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"win_rate_modifier": modifier}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.admin_logs.insert_one({
        "action": "user_win_rate_change",
        "admin_id": admin.user_id,
        "target_user_id": user_id,
        "details": {"modifier": modifier},
        "timestamp": datetime.now(timezone.utc)
    })
    
    return {"success": True, "win_rate_modifier": modifier}

@api_router.post("/admin/users/{user_id}/payout")
async def set_user_payout(
    user_id: str,
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    """Set user-specific payout modifier"""
    admin = await get_current_user(authorization, request)
    
    body = await request.json()
    modifier = float(body.get("modifier", 100))  # 0-200%
    
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"payout_modifier": modifier}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.admin_logs.insert_one({
        "action": "user_payout_change",
        "admin_id": admin.user_id,
        "target_user_id": user_id,
        "details": {"modifier": modifier},
        "timestamp": datetime.now(timezone.utc)
    })
    
    return {"success": True, "payout_modifier": modifier}

@api_router.post("/admin/users/{user_id}/shadow-ban")
async def shadow_ban_user(
    user_id: str,
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    """Shadow ban user (they don't know they're banned)"""
    admin = await get_current_user(authorization, request)
    
    body = await request.json()
    banned = body.get("banned", True)
    reason = body.get("reason", "")
    
    result = await db.users.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "is_shadow_banned": banned,
                "shadow_ban_reason": reason,
                "shadow_banned_at": datetime.now(timezone.utc) if banned else None,
                "shadow_banned_by": admin.user_id if banned else None
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.admin_logs.insert_one({
        "action": "shadow_ban",
        "admin_id": admin.user_id,
        "target_user_id": user_id,
        "details": {"banned": banned, "reason": reason},
        "timestamp": datetime.now(timezone.utc)
    })
    
    return {"success": True, "is_shadow_banned": banned}

@api_router.post("/admin/users/{user_id}/flag")
async def flag_user(
    user_id: str,
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    """Flag user for review"""
    admin = await get_current_user(authorization, request)
    
    body = await request.json()
    flagged = body.get("flagged", True)
    reason = body.get("reason", "")
    
    result = await db.users.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "is_flagged": flagged,
                "flag_reason": reason,
                "flagged_at": datetime.now(timezone.utc) if flagged else None,
                "flagged_by": admin.user_id if flagged else None
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"success": True, "is_flagged": flagged}

@api_router.post("/admin/users/{user_id}/risk-level")
async def set_user_risk_level(
    user_id: str,
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    """Set user risk level (normal, low, medium, high, critical)"""
    admin = await get_current_user(authorization, request)
    
    body = await request.json()
    risk_level = body.get("level", "normal")
    
    if risk_level not in ["normal", "low", "medium", "high", "critical"]:
        raise HTTPException(status_code=400, detail="Invalid risk level")
    
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"risk_level": risk_level}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"success": True, "risk_level": risk_level}

@api_router.post("/admin/users/{user_id}/max-trade")
async def set_user_max_trade(
    user_id: str,
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    """Set maximum trade amount for user"""
    admin = await get_current_user(authorization, request)
    
    body = await request.json()
    max_amount = body.get("max_amount")  # None = no limit
    
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"max_trade_amount": max_amount}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"success": True, "max_trade_amount": max_amount}

@api_router.post("/admin/users/{user_id}/notes")
async def add_admin_notes(
    user_id: str,
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    """Add admin notes to user profile"""
    admin = await get_current_user(authorization, request)
    
    body = await request.json()
    notes = body.get("notes", "")
    
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"admin_notes": notes}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"success": True}

# ============= ADMIN LOGS =============

@api_router.get("/admin/logs")
async def get_admin_logs(
    limit: int = 100,
    action: str = None,
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    """Get admin activity logs"""
    user = await get_current_user(authorization, request)
    
    query = {}
    if action:
        query["action"] = action
    
    logs = await db.admin_logs.find(query).sort("timestamp", -1).limit(limit).to_list(limit)
    
    return {
        "logs": [
            {
                "action": log.get("action"),
                "admin_id": log.get("admin_id"),
                "details": log.get("details"),
                "timestamp": str(log.get("timestamp", ""))
            }
            for log in logs
        ]
    }

# ============= PLATFORM STATS (REAL-TIME) =============

@api_router.get("/admin/platform/live-stats")
async def get_live_platform_stats(authorization: Optional[str] = Header(None), request: Request = None):
    """Get real-time platform statistics"""
    user = await get_current_user(authorization, request)
    
    now = datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Active trades
    active_trades = await db.trades.count_documents({"status": "active"})
    
    # Today's stats
    today_trades = await db.trades.find({"created_at": {"$gte": today}}).to_list(10000)
    today_volume = sum(t.get("amount", 0) for t in today_trades)
    today_profit = sum(t.get("profit_loss", 0) for t in today_trades if t.get("status") in ["won", "lost"])
    platform_profit_today = -today_profit  # Platform profit = user losses
    
    today_deposits = await db.deposits.find({"created_at": {"$gte": today}, "status": "completed"}).to_list(1000)
    today_deposit_total = sum(d.get("amount_usd", 0) for d in today_deposits)
    
    today_withdrawals = await db.withdrawals.find({"created_at": {"$gte": today}, "status": "completed"}).to_list(1000)
    today_withdrawal_total = sum(w.get("amount", 0) for w in today_withdrawals)
    
    # Pending counts
    pending_withdrawals = await db.withdrawals.count_documents({"status": "pending"})
    pending_deposits = await db.deposits.count_documents({"status": "pending"})
    
    # Active users (traded in last hour)
    hour_ago = now - timedelta(hours=1)
    active_users = len(await db.trades.distinct("user_id", {"created_at": {"$gte": hour_ago}}))
    
    # God mode status
    god_mode = await db.platform_settings.find_one({"_id": "god_mode"})
    
    return {
        "live": {
            "active_trades": active_trades,
            "active_users": active_users,
            "pending_withdrawals": pending_withdrawals,
            "pending_deposits": pending_deposits
        },
        "today": {
            "total_trades": len(today_trades),
            "total_volume": today_volume,
            "platform_profit": platform_profit_today,
            "total_deposits": today_deposit_total,
            "total_withdrawals": today_withdrawal_total,
            "net_flow": today_deposit_total - today_withdrawal_total
        },
        "god_mode": {
            "trading_enabled": god_mode.get("trading_enabled", True) if god_mode else True,
            "withdrawals_enabled": god_mode.get("withdrawals_enabled", True) if god_mode else True,
            "global_payout": god_mode.get("global_payout_modifier", 100) if god_mode else 100,
            "global_win_rate": god_mode.get("global_win_rate_modifier", 100) if god_mode else 100
        },
        "timestamp": str(now)
    }



# ============= ROLE HIERARCHY SYSTEM =============

ROLE_PERMISSIONS = {
    "super_admin": ["*"],  # Full access
    "financial_admin": ["deposits", "withdrawals", "transactions", "manual_deposit", "payouts"],
    "risk_manager": ["users", "risk_controls", "trades", "fraud_detection"],
    "support_agent": ["users_view", "tickets", "basic_info"],
    "auditor": ["view_only", "logs", "reports"],
    "affiliate_manager": ["affiliates", "commissions", "payouts"]
}

@api_router.get("/admin/roles")
async def get_roles(authorization: Optional[str] = Header(None), request: Request = None):
    """Get all available roles and permissions"""
    user = await get_current_user(authorization, request)
    return {"roles": ROLE_PERMISSIONS}

@api_router.post("/admin/users/{user_id}/role")
async def set_user_role(
    user_id: str,
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    """Assign role to user"""
    admin = await get_current_user(authorization, request)
    
    body = await request.json()
    role = body.get("role", "user")
    
    if role not in ROLE_PERMISSIONS and role != "user":
        raise HTTPException(status_code=400, detail="Invalid role")
    
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"role": role, "is_admin": role != "user"}}
    )
    
    await db.admin_logs.insert_one({
        "action": "role_assigned",
        "admin_id": admin.user_id,
        "target_user_id": user_id,
        "details": {"role": role},
        "timestamp": datetime.now(timezone.utc)
    })
    
    return {"success": True, "role": role}

# ============= AFFILIATE MANAGEMENT SYSTEM =============

def generate_affiliate_code():
    """Generate unique affiliate code"""
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return ''.join(random.choices(chars, k=8))

def generate_referral_link(affiliate_code: str):
    """Generate referral link"""
    base_url = "https://bynix.com"
    return f"{base_url}/ref/{affiliate_code}"

@api_router.post("/affiliates/register")
async def register_affiliate(authorization: Optional[str] = Header(None), request: Request = None):
    """Register as affiliate"""
    user = await get_current_user(authorization, request)
    
    # Check if already affiliate
    existing = await db.affiliates.find_one({"user_id": user.user_id})
    if existing:
        raise HTTPException(status_code=400, detail="Already registered as affiliate")
    
    body = await request.json()
    
    affiliate_code = generate_affiliate_code()
    while await db.affiliates.find_one({"affiliate_code": affiliate_code}):
        affiliate_code = generate_affiliate_code()
    
    affiliate = {
        "affiliate_id": f"aff_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "email": user.email,
        "affiliate_code": affiliate_code,
        "referral_link": generate_referral_link(affiliate_code),
        "status": "pending",  # pending, active, suspended
        "commission_type": "revenue_share",  # cpa, revenue_share, hybrid
        "commission_rate": 25,  # percentage
        "cpa_amount": 10,  # fixed CPA amount
        "tier": 1,  # affiliate tier level
        "payment_info": {
            "method": body.get("payment_method", "crypto"),
            "wallet_address": body.get("wallet_address", ""),
            "bank_details": body.get("bank_details", {})
        },
        "stats": {
            "total_clicks": 0,
            "total_signups": 0,
            "total_deposits": 0,
            "total_traders": 0,
            "total_volume": 0,
            "total_earnings": 0,
            "pending_earnings": 0,
            "paid_earnings": 0
        },
        "created_at": datetime.now(timezone.utc),
        "approved_at": None,
        "manager_id": None
    }
    
    await db.affiliates.insert_one(affiliate)
    
    return {
        "success": True,
        "affiliate_code": affiliate_code,
        "referral_link": affiliate["referral_link"],
        "status": "pending"
    }

@api_router.get("/affiliates/me")
async def get_my_affiliate_profile(authorization: Optional[str] = Header(None), request: Request = None):
    """Get current user's affiliate profile"""
    user = await get_current_user(authorization, request)
    
    affiliate = await db.affiliates.find_one({"user_id": user.user_id})
    if not affiliate:
        return {"is_affiliate": False}
    
    # Get referrals
    referrals = await db.referrals.find({"affiliate_id": affiliate["affiliate_id"]}).to_list(1000)
    
    # Get commissions
    commissions = await db.commissions.find({"affiliate_id": affiliate["affiliate_id"]}).sort("created_at", -1).limit(50).to_list(50)
    
    return {
        "is_affiliate": True,
        "affiliate_id": affiliate["affiliate_id"],
        "affiliate_code": affiliate["affiliate_code"],
        "referral_link": affiliate["referral_link"],
        "status": affiliate["status"],
        "commission_type": affiliate["commission_type"],
        "commission_rate": affiliate["commission_rate"],
        "cpa_amount": affiliate.get("cpa_amount", 10),
        "tier": affiliate.get("tier", 1),
        "stats": affiliate["stats"],
        "payment_info": affiliate.get("payment_info", {}),
        "referrals_count": len(referrals),
        "recent_commissions": [
            {
                "commission_id": c.get("commission_id"),
                "amount": c.get("amount"),
                "type": c.get("type"),
                "status": c.get("status"),
                "created_at": str(c.get("created_at", ""))
            }
            for c in commissions
        ]
    }

@api_router.get("/affiliates/referrals")
async def get_affiliate_referrals(authorization: Optional[str] = Header(None), request: Request = None):
    """Get affiliate's referrals"""
    user = await get_current_user(authorization, request)
    
    affiliate = await db.affiliates.find_one({"user_id": user.user_id})
    if not affiliate:
        raise HTTPException(status_code=404, detail="Not an affiliate")
    
    referrals = await db.referrals.find({"affiliate_id": affiliate["affiliate_id"]}).sort("created_at", -1).to_list(100)
    
    result = []
    for ref in referrals:
        referred_user = await db.users.find_one({"user_id": ref.get("referred_user_id")})
        if referred_user:
            # Get user's trading stats
            trades = await db.trades.find({"user_id": ref.get("referred_user_id"), "account_type": "real"}).to_list(1000)
            total_volume = sum(t.get("amount", 0) for t in trades)
            total_loss = sum(t.get("profit_loss", 0) for t in trades if t.get("status") == "lost")
            
            result.append({
                "referral_id": ref.get("referral_id"),
                "user_email": referred_user.get("email", "")[:3] + "***",  # Masked
                "signup_date": str(ref.get("created_at", "")),
                "first_deposit": ref.get("first_deposit", 0),
                "total_deposits": ref.get("total_deposits", 0),
                "total_volume": total_volume,
                "total_commission": ref.get("total_commission", 0),
                "status": "active" if trades else "inactive"
            })
    
    return {"referrals": result}

@api_router.post("/affiliates/track-click")
async def track_affiliate_click(request: Request):
    """Track affiliate link click (public endpoint)"""
    body = await request.json()
    affiliate_code = body.get("code")
    
    if not affiliate_code:
        return {"success": False}
    
    affiliate = await db.affiliates.find_one({"affiliate_code": affiliate_code, "status": "active"})
    if not affiliate:
        return {"success": False}
    
    # Record click
    await db.affiliate_clicks.insert_one({
        "affiliate_id": affiliate["affiliate_id"],
        "affiliate_code": affiliate_code,
        "ip": request.client.host if request.client else "unknown",
        "user_agent": request.headers.get("user-agent", ""),
        "timestamp": datetime.now(timezone.utc)
    })
    
    # Update stats
    await db.affiliates.update_one(
        {"affiliate_id": affiliate["affiliate_id"]},
        {"$inc": {"stats.total_clicks": 1}}
    )
    
    return {"success": True, "code": affiliate_code}

@api_router.post("/affiliates/process-signup")
async def process_affiliate_signup(
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    """Process signup from affiliate referral (internal use)"""
    body = await request.json()
    affiliate_code = body.get("affiliate_code")
    new_user_id = body.get("user_id")
    
    if not affiliate_code or not new_user_id:
        return {"success": False}
    
    affiliate = await db.affiliates.find_one({"affiliate_code": affiliate_code, "status": "active"})
    if not affiliate:
        return {"success": False}
    
    # Check if already referred
    existing = await db.referrals.find_one({"referred_user_id": new_user_id})
    if existing:
        return {"success": False, "message": "User already referred"}
    
    # Create referral record
    referral = {
        "referral_id": f"ref_{uuid.uuid4().hex[:12]}",
        "affiliate_id": affiliate["affiliate_id"],
        "affiliate_code": affiliate_code,
        "referred_user_id": new_user_id,
        "first_deposit": 0,
        "total_deposits": 0,
        "total_commission": 0,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.referrals.insert_one(referral)
    
    # Update affiliate stats
    await db.affiliates.update_one(
        {"affiliate_id": affiliate["affiliate_id"]},
        {"$inc": {"stats.total_signups": 1}}
    )
    
    # Mark user as referred
    await db.users.update_one(
        {"user_id": new_user_id},
        {"$set": {"referred_by": affiliate["affiliate_id"], "referral_code": affiliate_code}}
    )
    
    return {"success": True}

@api_router.post("/affiliates/process-deposit")
async def process_affiliate_deposit(
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    """Process deposit commission for affiliate (called after deposit confirmed)"""
    body = await request.json()
    user_id = body.get("user_id")
    deposit_amount = float(body.get("amount", 0))
    
    # Find referral
    referral = await db.referrals.find_one({"referred_user_id": user_id})
    if not referral:
        return {"success": False, "message": "User not referred"}
    
    affiliate = await db.affiliates.find_one({"affiliate_id": referral["affiliate_id"]})
    if not affiliate or affiliate["status"] != "active":
        return {"success": False}
    
    commission_amount = 0
    commission_type = ""
    
    # Calculate commission based on type
    if affiliate["commission_type"] == "cpa":
        # CPA: One-time payment on first deposit
        if referral.get("first_deposit", 0) == 0:
            commission_amount = affiliate.get("cpa_amount", 10)
            commission_type = "cpa"
    elif affiliate["commission_type"] == "revenue_share":
        # Revenue share: percentage of deposit
        commission_amount = deposit_amount * (affiliate["commission_rate"] / 100)
        commission_type = "revenue_share"
    else:  # hybrid
        if referral.get("first_deposit", 0) == 0:
            commission_amount = affiliate.get("cpa_amount", 10)
            commission_type = "cpa"
        commission_amount += deposit_amount * (affiliate["commission_rate"] / 100)
        commission_type = "hybrid"
    
    if commission_amount > 0:
        # Create commission record
        commission = {
            "commission_id": f"comm_{uuid.uuid4().hex[:12]}",
            "affiliate_id": affiliate["affiliate_id"],
            "referral_id": referral["referral_id"],
            "referred_user_id": user_id,
            "amount": commission_amount,
            "type": commission_type,
            "source_amount": deposit_amount,
            "status": "pending",
            "created_at": datetime.now(timezone.utc)
        }
        
        await db.commissions.insert_one(commission)
        
        # Update affiliate stats
        await db.affiliates.update_one(
            {"affiliate_id": affiliate["affiliate_id"]},
            {
                "$inc": {
                    "stats.total_deposits": deposit_amount,
                    "stats.total_earnings": commission_amount,
                    "stats.pending_earnings": commission_amount
                }
            }
        )
        
        # Update referral
        update_fields = {"$inc": {"total_deposits": deposit_amount, "total_commission": commission_amount}}
        if referral.get("first_deposit", 0) == 0:
            update_fields["$set"] = {"first_deposit": deposit_amount}
        await db.referrals.update_one({"referral_id": referral["referral_id"]}, update_fields)
    
    return {"success": True, "commission": commission_amount}

@api_router.post("/affiliates/withdraw")
async def request_affiliate_withdrawal(
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    """Request withdrawal of affiliate earnings"""
    user = await get_current_user(authorization, request)
    
    affiliate = await db.affiliates.find_one({"user_id": user.user_id})
    if not affiliate:
        raise HTTPException(status_code=404, detail="Not an affiliate")
    
    body = await request.json()
    amount = float(body.get("amount", 0))
    
    pending = affiliate["stats"].get("pending_earnings", 0)
    if amount > pending:
        raise HTTPException(status_code=400, detail="Insufficient pending earnings")
    
    min_payout = 50  # Minimum payout threshold
    if amount < min_payout:
        raise HTTPException(status_code=400, detail=f"Minimum payout is ${min_payout}")
    
    # Create payout request
    payout = {
        "payout_id": f"payout_{uuid.uuid4().hex[:12]}",
        "affiliate_id": affiliate["affiliate_id"],
        "user_id": user.user_id,
        "amount": amount,
        "payment_method": affiliate.get("payment_info", {}).get("method", "crypto"),
        "wallet_address": affiliate.get("payment_info", {}).get("wallet_address", ""),
        "status": "pending",
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.affiliate_payouts.insert_one(payout)
    
    # Move from pending to processing
    await db.affiliates.update_one(
        {"affiliate_id": affiliate["affiliate_id"]},
        {"$inc": {"stats.pending_earnings": -amount}}
    )
    
    return {"success": True, "payout_id": payout["payout_id"]}

# ============= ADMIN AFFILIATE MANAGEMENT =============

@api_router.get("/admin/affiliates")
async def admin_get_affiliates(
    status: str = None,
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    """Get all affiliates (admin)"""
    user = await get_current_user(authorization, request)
    
    query = {}
    if status:
        query["status"] = status
    
    affiliates = await db.affiliates.find(query).sort("created_at", -1).to_list(500)
    
    return {
        "affiliates": [
            {
                "affiliate_id": a.get("affiliate_id"),
                "user_id": a.get("user_id"),
                "email": a.get("email"),
                "affiliate_code": a.get("affiliate_code"),
                "referral_link": a.get("referral_link"),
                "status": a.get("status"),
                "commission_type": a.get("commission_type"),
                "commission_rate": a.get("commission_rate"),
                "cpa_amount": a.get("cpa_amount", 10),
                "tier": a.get("tier", 1),
                "stats": a.get("stats", {}),
                "created_at": str(a.get("created_at", ""))
            }
            for a in affiliates
        ]
    }

@api_router.post("/admin/affiliates/{affiliate_id}/approve")
async def admin_approve_affiliate(
    affiliate_id: str,
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    """Approve affiliate application"""
    admin = await get_current_user(authorization, request)
    
    result = await db.affiliates.update_one(
        {"affiliate_id": affiliate_id},
        {
            "$set": {
                "status": "active",
                "approved_at": datetime.now(timezone.utc),
                "approved_by": admin.user_id
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Affiliate not found")
    
    return {"success": True, "status": "active"}

@api_router.post("/admin/affiliates/{affiliate_id}/suspend")
async def admin_suspend_affiliate(
    affiliate_id: str,
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    """Suspend affiliate"""
    admin = await get_current_user(authorization, request)
    
    body = await request.json()
    reason = body.get("reason", "")
    
    await db.affiliates.update_one(
        {"affiliate_id": affiliate_id},
        {
            "$set": {
                "status": "suspended",
                "suspended_at": datetime.now(timezone.utc),
                "suspended_by": admin.user_id,
                "suspension_reason": reason
            }
        }
    )
    
    return {"success": True, "status": "suspended"}

@api_router.post("/admin/affiliates/{affiliate_id}/commission")
async def admin_set_affiliate_commission(
    affiliate_id: str,
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    """Set affiliate commission settings"""
    admin = await get_current_user(authorization, request)
    
    body = await request.json()
    
    update = {}
    if "commission_type" in body:
        update["commission_type"] = body["commission_type"]
    if "commission_rate" in body:
        update["commission_rate"] = float(body["commission_rate"])
    if "cpa_amount" in body:
        update["cpa_amount"] = float(body["cpa_amount"])
    if "tier" in body:
        update["tier"] = int(body["tier"])
    
    if update:
        await db.affiliates.update_one(
            {"affiliate_id": affiliate_id},
            {"$set": update}
        )
    
    return {"success": True}

@api_router.get("/admin/affiliates/payouts")
async def admin_get_affiliate_payouts(
    status: str = None,
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    """Get affiliate payout requests"""
    user = await get_current_user(authorization, request)
    
    query = {}
    if status:
        query["status"] = status
    
    payouts = await db.affiliate_payouts.find(query).sort("created_at", -1).to_list(200)
    
    result = []
    for p in payouts:
        affiliate = await db.affiliates.find_one({"affiliate_id": p.get("affiliate_id")})
        result.append({
            "payout_id": p.get("payout_id"),
            "affiliate_id": p.get("affiliate_id"),
            "affiliate_email": affiliate.get("email") if affiliate else "Unknown",
            "amount": p.get("amount"),
            "payment_method": p.get("payment_method"),
            "wallet_address": p.get("wallet_address"),
            "status": p.get("status"),
            "created_at": str(p.get("created_at", ""))
        })
    
    return {"payouts": result}

@api_router.post("/admin/affiliates/payouts/{payout_id}/approve")
async def admin_approve_payout(
    payout_id: str,
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    """Approve affiliate payout"""
    admin = await get_current_user(authorization, request)
    
    payout = await db.affiliate_payouts.find_one({"payout_id": payout_id})
    if not payout:
        raise HTTPException(status_code=404, detail="Payout not found")
    
    if payout["status"] != "pending":
        raise HTTPException(status_code=400, detail="Payout not pending")
    
    await db.affiliate_payouts.update_one(
        {"payout_id": payout_id},
        {
            "$set": {
                "status": "completed",
                "approved_by": admin.user_id,
                "approved_at": datetime.now(timezone.utc)
            }
        }
    )
    
    # Update affiliate stats
    await db.affiliates.update_one(
        {"affiliate_id": payout["affiliate_id"]},
        {"$inc": {"stats.paid_earnings": payout["amount"]}}
    )
    
    return {"success": True}

@api_router.post("/admin/affiliates/payouts/{payout_id}/reject")
async def admin_reject_payout(
    payout_id: str,
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    """Reject affiliate payout"""
    admin = await get_current_user(authorization, request)
    
    body = await request.json()
    reason = body.get("reason", "")
    
    payout = await db.affiliate_payouts.find_one({"payout_id": payout_id})
    if not payout:
        raise HTTPException(status_code=404, detail="Payout not found")
    
    await db.affiliate_payouts.update_one(
        {"payout_id": payout_id},
        {
            "$set": {
                "status": "rejected",
                "rejected_by": admin.user_id,
                "rejected_at": datetime.now(timezone.utc),
                "rejection_reason": reason
            }
        }
    )
    
    # Return to pending earnings
    await db.affiliates.update_one(
        {"affiliate_id": payout["affiliate_id"]},
        {"$inc": {"stats.pending_earnings": payout["amount"]}}
    )
    
    return {"success": True}

@api_router.get("/admin/affiliates/stats")
async def admin_get_affiliate_stats(authorization: Optional[str] = Header(None), request: Request = None):
    """Get overall affiliate program stats"""
    user = await get_current_user(authorization, request)
    
    total_affiliates = await db.affiliates.count_documents({})
    active_affiliates = await db.affiliates.count_documents({"status": "active"})
    pending_affiliates = await db.affiliates.count_documents({"status": "pending"})
    
    total_referrals = await db.referrals.count_documents({})
    
    # Calculate total commissions
    pipeline = [
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    comm_result = await db.commissions.aggregate(pipeline).to_list(1)
    total_commissions = comm_result[0]["total"] if comm_result else 0
    
    # Pending payouts
    pending_payouts = await db.affiliate_payouts.count_documents({"status": "pending"})
    
    return {
        "total_affiliates": total_affiliates,
        "active_affiliates": active_affiliates,
        "pending_affiliates": pending_affiliates,
        "total_referrals": total_referrals,
        "total_commissions_paid": total_commissions,
        "pending_payouts": pending_payouts
    }

# Include router - MUST be at the end of file after ALL route definitions
app.include_router(api_router)
