from fastapi import FastAPI, Depends, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
from backend.api_admin import router as admin_router
from pydantic import BaseModel, EmailStr, Field, validator
from src.core.user import register_user, add_tail_number, get_user_tail_numbers, authenticate_user, delete_user_data
from src.core.notification import set_webhook
from src.core.auth import (
    get_current_active_user, create_access_token, create_refresh_token,
    verify_token, require_role, PasswordValidationError
)
from src.core.config import settings
from src.db.database import init_db, cleanup_old_data
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import logging
import sentry_sdk
from sentry_sdk.integrations.asgi import SentryAsgiMiddleware
from contextlib import asynccontextmanager
import asyncio
from datetime import datetime, timedelta
import re

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL, logging.INFO),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Sentry for error tracking
if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT,
        traces_sample_rate=0.1,
    )

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

# Background tasks
async def periodic_cleanup():
    """Run periodic cleanup tasks"""
    while True:
        try:
            cleanup_old_data()
            await asyncio.sleep(3600)  # Run every hour
        except Exception as e:
            logger.error(f"Error in periodic cleanup: {e}")
            await asyncio.sleep(3600)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    cleanup_task = asyncio.create_task(periodic_cleanup())
    yield
    # Shutdown
    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        pass

# Create FastAPI app
app = FastAPI(
    title="FlightTrace API",
    description="Secure Flight Tracking Service",
    version="1.0.0",
    docs_url="/api/docs" if settings.DEBUG else None,
    redoc_url="/api/redoc" if settings.DEBUG else None,
    lifespan=lifespan
)

# Add rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Security middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
    expose_headers=["X-Rate-Limit-Limit", "X-Rate-Limit-Remaining", "X-Rate-Limit-Reset"]
)

# Only allow specific hosts
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1", "*.flighttrace.com"]
)

# Compress responses
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Sentry middleware
if settings.SENTRY_DSN:
    app.add_middleware(SentryAsgiMiddleware)

# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    
    if settings.ENVIRONMENT == "production":
        response.headers["Strict-Transport-Security"] = f"max-age={settings.HSTS_MAX_AGE}; includeSubDomains"
    
    return response

# Request ID middleware for tracking
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    import uuid
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response

# Include routers
app.include_router(admin_router, prefix="/admin", tags=["admin"])

# Request/Response Models
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, regex='^[a-zA-Z0-9_-]+$')
    email: EmailStr
    password: str = Field(..., min_length=12)
    gdpr_consent: bool = Field(..., description="GDPR consent required")
    terms_accepted: bool = Field(..., description="Terms of service acceptance required")
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < settings.PASSWORD_MIN_LENGTH:
            raise ValueError(f'Password must be at least {settings.PASSWORD_MIN_LENGTH} characters')
        return v

class TailNumberAdd(BaseModel):
    tail_number: str = Field(..., min_length=1, max_length=6, regex='^[A-Z0-9]+$')
    notes: str = Field(None, max_length=500)

class WebhookConfig(BaseModel):
    url: str = Field(..., regex='^https://.*')
    events: list[str] = Field(default=['status_change'])
    
class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int

class UserResponse(BaseModel):
    user_id: int
    username: str
    email: str
    role: str
    email_verified: bool
    mfa_enabled: bool

@app.post("/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/hour")
async def register(request: Request, user: UserCreate):
    try:
        if not user.gdpr_consent:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="GDPR consent is required"
            )
        
        if not user.terms_accepted:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Terms of service must be accepted"
            )
        
        user_id = register_user(user.username, user.email, user.password)
        
        # Log registration
        logger.info(f"New user registered: {user.username}")
        
        # Return user info
        return UserResponse(
            user_id=user_id,
            username=user.username,
            email=user.email,
            role="user",
            email_verified=False,
            mfa_enabled=False
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except PasswordValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.post("/auth/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends()):
    try:
        user = authenticate_user(form_data.username, form_data.password)
        
        # Create tokens
        access_token = create_access_token(data={"sub": str(user["user_id"])})
        refresh_token = create_refresh_token(data={"sub": str(user["user_id"])})
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

@app.post("/auth/refresh", response_model=TokenResponse)
async def refresh_token(refresh_token: str):
    try:
        payload = verify_token(refresh_token, "refresh")
        user_id = payload.get("sub")
        
        # Create new tokens
        access_token = create_access_token(data={"sub": user_id})
        new_refresh_token = create_refresh_token(data={"sub": user_id})
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=new_refresh_token,
            token_type="bearer",
            expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

@app.post("/users/{user_id}/tail_numbers", status_code=status.HTTP_201_CREATED)
@limiter.limit("30/hour")
async def add_tail(
    request: Request,
    user_id: int, 
    tail: TailNumberAdd, 
    current_user: dict = Depends(get_current_active_user)
):
    # Verify user can only add to their own account unless admin
    if current_user["user_id"] != user_id and current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot add tail numbers to other users"
        )
    
    try:
        add_tail_number(user_id, tail.tail_number)
        return {"status": "added", "tail_number": tail.tail_number}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.get("/users/{user_id}/tail_numbers")
@limiter.limit("100/hour")
async def list_tails(
    request: Request,
    user_id: int, 
    current_user: dict = Depends(get_current_active_user)
):
    # Verify user can only view their own tail numbers unless admin
    if current_user["user_id"] != user_id and current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot view other users' tail numbers"
        )
    
    return {"tail_numbers": get_user_tail_numbers(user_id)}

@app.post("/users/{user_id}/webhook")
@limiter.limit("10/hour")
async def set_user_webhook(
    request: Request,
    user_id: int, 
    webhook: WebhookConfig, 
    current_user: dict = Depends(get_current_active_user)
):
    # Verify user can only set their own webhook unless admin
    if current_user["user_id"] != user_id and current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot set webhook for other users"
        )
    
    # Validate webhook URL is HTTPS
    if not webhook.url.startswith("https://"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Webhook URL must use HTTPS"
        )
    
    set_webhook(user_id, webhook.url)
    return {"status": "webhook set", "url": webhook.url}

@app.delete("/users/{user_id}")
@limiter.limit("5/day")
async def delete_user(
    request: Request,
    user_id: int,
    current_user: dict = Depends(get_current_active_user)
):
    # Users can only delete their own account
    if current_user["user_id"] != user_id and current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete other users"
        )
    
    try:
        delete_user_data(user_id)
        return {"status": "user deleted", "message": "Your data has been permanently deleted"}
    except Exception as e:
        logger.error(f"Error deleting user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting user data"
        )

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

@app.get("/")
async def root():
    return {"message": "FlightTrace API", "version": "1.0.0"}
