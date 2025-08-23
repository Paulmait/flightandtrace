from fastapi import FastAPI, Depends, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from api_admin import router as admin_router
from pydantic import BaseModel, EmailStr, Field, validator
from src.core.user import register_user, add_tail_number, get_user_tail_numbers, authenticate_user, delete_user_data
from src.core.notification import set_webhook
from src.core.fuel_estimation_v2 import EnhancedFuelEstimator, FuelEstimateV2, ConfidenceLevel
from src.core.feature_flags import FeatureFlags
from src.core.validation import validate_fuel_request, validate_get_params, ValidationError, create_error_response
from src.core.enhanced_rate_limiter import check_fuel_api_limits, rate_limiter
from src.core.auth import (
    get_current_active_user, create_access_token, create_refresh_token,
    verify_token, require_role, PasswordValidationError
)
from src.core.config import settings
from src.db.database import init_db, cleanup_old_data
from src.core.security import (
    SecurityValidator, SecurityHeaders, SecurityAuditor,
    InputValidator, CSRFProtection
)
from src.core.rate_limiter import rate_limiter, ddos_protection
from src.core.error_handler import (
    validation_exception_handler, http_exception_handler,
    general_exception_handler, BusinessLogicError,
    business_logic_exception_handler
)
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
from typing import List, Optional, Dict, Any

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

# Add custom exception handlers
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(BusinessLogicError, business_logic_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# Security middleware with environment-specific CORS
def get_cors_origins():
    """Get CORS origins based on environment"""
    if settings.ENVIRONMENT == "production":
        return [
            "https://flighttrace.com",
            "https://www.flighttrace.com",
            "https://app.flighttrace.com"
        ]
    elif settings.ENVIRONMENT == "staging":
        return [
            "https://staging.flighttrace.com",
            "http://localhost:3000",
            "http://localhost:8081"
        ]
    else:
        # Development
        return [
            "http://localhost:3000",
            "http://localhost:8080",
            "http://localhost:8081",
            "http://127.0.0.1:3000",
            "http://192.168.1.100:8081"  # For mobile development
        ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=[
        "Accept",
        "Accept-Language",
        "Content-Type", 
        "Authorization",
        "X-Requested-With",
        "User-Agent"
    ],
    expose_headers=[
        "X-Rate-Limit-Limit", 
        "X-Rate-Limit-Remaining", 
        "X-Rate-Limit-Reset",
        "X-Rate-Limit-Retry-After"
    ]
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
    
    # Get comprehensive security headers
    security_headers = SecurityHeaders.get_security_headers(request)
    for header, value in security_headers.items():
        response.headers[header] = value
    
    return response

# DDoS Protection middleware
@app.middleware("http")
async def ddos_protection_middleware(request: Request, call_next):
    # Get client IP
    client_ip = request.client.host if request.client else "unknown"
    
    # Check DDoS protection
    allowed, reason = ddos_protection.check_request(
        client_ip,
        request.url.path,
        dict(request.headers)
    )
    
    if not allowed:
        logger.warning(f"Request blocked from {client_ip}: {reason}")
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={"detail": "Too many requests"}
        )
    
    response = await call_next(request)
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

# Enhanced rate limit middleware with headers
@app.middleware("http")
async def rate_limit_headers(request: Request, call_next):
    # Get client identifier
    client_ip = request.client.host if request.client else "unknown"
    
    # Check rate limit for informational headers
    allowed, metadata = rate_limiter.check_rate_limit(
        client_ip,
        limit=settings.RATE_LIMIT_PER_HOUR,
        window_seconds=3600
    )
    
    response = await call_next(request)
    
    # Add rate limit headers
    response.headers["X-RateLimit-Limit"] = str(metadata.get("limit", 0))
    response.headers["X-RateLimit-Remaining"] = str(metadata.get("remaining", 0))
    response.headers["X-RateLimit-Reset"] = str(metadata.get("reset", 0))
    
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
    tail_number: str = Field(..., min_length=1, max_length=10)
    notes: str = Field(None, max_length=500)
    
    @validator('tail_number')
    def validate_tail_number(cls, v):
        v = v.upper().strip()
        if not SecurityValidator.validate_tail_number(v):
            raise ValueError('Invalid tail number format')
        return v
    
    @validator('notes')
    def sanitize_notes(cls, v):
        if v:
            return SecurityValidator.sanitize_input(v, max_length=500)
        return v

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

class FuelEstimateRequest(BaseModel):
    flight_id: str = Field(..., description="Unique flight identifier")
    aircraft_type: str = Field(..., description="ICAO aircraft type code (e.g., B738, A320)")
    altitude_series: List[Dict[str, Any]] = Field(..., description="List of {timestamp, altitude} objects")
    distance_nm: Optional[float] = Field(None, description="Total distance in nautical miles")
    
    @validator('aircraft_type')
    def validate_aircraft_type(cls, v):
        from src.core.aviation_utils import validate_icao_code
        v = v.upper().strip()
        if not validate_icao_code(v):
            raise ValueError('Invalid ICAO aircraft type code')
        return v

class FuelEstimateResponse(BaseModel):
    fuelKg: float
    fuelL: float
    fuelGal: float
    co2Kg: float
    confidence: str
    assumptions: Dict[str, Any]
    phases: Optional[List[Dict[str, Any]]] = None

@app.post("/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/hour")
async def register(request: Request, user: UserCreate):
    try:
        # Enhanced input validation
        if not InputValidator.validate_username(user.username):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid username format"
            )
        
        if not SecurityValidator.validate_email(user.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid email address"
            )
        
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
        
        # Check for suspicious activity
        if SecurityAuditor.check_suspicious_activity(request, None):
            SecurityAuditor.log_security_event(
                "suspicious_registration_attempt",
                None,
                {"username": user.username, "email": user.email},
                request
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Suspicious activity detected"
            )
        
        user_id = register_user(user.username, user.email, user.password)
        
        # Log registration event
        SecurityAuditor.log_security_event(
            "user_registered",
            user_id,
            {"username": user.username, "email": user.email},
            request
        )
        
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
        # Check for suspicious activity
        if SecurityAuditor.check_suspicious_activity(request, None):
            SecurityAuditor.log_security_event(
                "suspicious_login_attempt",
                None,
                {"username": form_data.username},
                request
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Suspicious activity detected"
            )
        
        user = authenticate_user(form_data.username, form_data.password)
        
        # Log successful login
        SecurityAuditor.log_security_event(
            "user_login",
            user["user_id"],
            {"username": user["username"]},
            request
        )
        
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
        # Log failed login
        SecurityAuditor.log_security_event(
            "failed_login",
            None,
            {"username": form_data.username, "error": str(e)},
            request
        )
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
    
    # Enhanced webhook URL validation
    if not SecurityValidator.validate_url(webhook.url, allowed_schemes=['https']):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid webhook URL. Must use HTTPS and not point to local/private addresses"
        )
    
    # Validate events
    valid_events = ['status_change', 'landing', 'takeoff', 'emergency']
    for event in webhook.events:
        if event not in valid_events:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid event type: {event}"
            )
    
    set_webhook(user_id, webhook.url)
    
    # Log webhook configuration
    SecurityAuditor.log_security_event(
        "webhook_configured",
        user_id,
        {"url": webhook.url, "events": webhook.events},
        request
    )
    
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

# Initialize fuel estimator
fuel_estimator = EnhancedFuelEstimator()

@app.get("/api/fuel/estimate", response_model=FuelEstimateResponse)
async def estimate_fuel_get(
    request: Request,
    flightId: str,
    aircraftType: Optional[str] = "B738",
    current_user: dict = Depends(get_current_active_user)
):
    """Get fuel estimate for a flight using query parameters"""
    
    # Get client IP for rate limiting
    client_ip = request.client.host if request.client else "unknown"
    user_id = str(current_user.get('user_id', '')) if current_user else None
    
    try:
        # Enhanced rate limiting with IP + user tracking
        rate_status = check_fuel_api_limits(client_ip, user_id)
        if not rate_status.allowed:
            # Add rate limit headers
            headers = {
                "X-Rate-Limit-Limit": str(rate_status.limit),
                "X-Rate-Limit-Remaining": "0",
                "X-Rate-Limit-Reset": rate_status.reset_time.isoformat()
            }
            if rate_status.retry_after:
                headers["X-Rate-Limit-Retry-After"] = str(rate_status.retry_after)
            
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Try again in {rate_status.retry_after} seconds.",
                headers=headers
            )
        
        # Input validation
        params = validate_get_params({"flightId": flightId, "aircraftType": aircraftType})
        
        # Check feature flag
        if not FeatureFlags.is_enabled("fuelEstimates", user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Fuel estimation feature is not enabled for your account"
            )
        
        # Log telemetry with sanitized data
        logger.info(f"Fuel estimate requested for flight {params.flightId} by user {user_id}")
        SecurityAuditor.log_security_event(
            "fuel_estimate_requested",
            user_id,
            {"flight_id": params.flightId, "aircraft_type": params.aircraftType, "ip": client_ip},
            request
        )
        
        # For GET request, we need to fetch flight data from database
        # This is a stub - replace with actual flight data retrieval
        altitude_series = [
            {"timestamp": datetime.utcnow().isoformat(), "altitude": 0},
            {"timestamp": (datetime.utcnow() + timedelta(minutes=10)).isoformat(), "altitude": 5000},
            {"timestamp": (datetime.utcnow() + timedelta(minutes=30)).isoformat(), "altitude": 35000},
            {"timestamp": (datetime.utcnow() + timedelta(hours=2)).isoformat(), "altitude": 35000},
            {"timestamp": (datetime.utcnow() + timedelta(hours=2, minutes=20)).isoformat(), "altitude": 5000},
            {"timestamp": (datetime.utcnow() + timedelta(hours=2, minutes=30)).isoformat(), "altitude": 0},
        ]
        
        # Convert altitude series to proper format for enhanced estimator
        altitude_samples = [
            (datetime.fromisoformat(point["timestamp"]), point["altitude"])
            for point in altitude_series
        ]
        
        estimate = fuel_estimator.estimate_fuel(
            flight_id=params.flightId,
            aircraft_type=params.aircraftType,
            altitude_samples=altitude_samples,
            distance_nm=500  # Example distance
        )
        
        # Add rate limit headers to successful response
        response_headers = {
            "X-Rate-Limit-Limit": str(rate_status.limit),
            "X-Rate-Limit-Remaining": str(rate_status.remaining),
            "X-Rate-Limit-Reset": rate_status.reset_time.isoformat()
        }
        
        # Format response
        return FuelEstimateResponse(
            fuelKg=estimate.fuel_kg,
            fuelL=estimate.fuel_liters,
            fuelGal=estimate.fuel_gallons,
            co2Kg=estimate.co2_kg,
            confidence=estimate.confidence.value,
            assumptions=estimate.assumptions,
            phases=[{
                "phase": phase.phase.value,
                "duration_minutes": phase.duration_minutes,
                "fuel_burn_kg": phase.fuel_burn_kg,
                "average_altitude_ft": phase.average_altitude_ft
            } for phase in estimate.phases]
        )
        
    except ValidationError as e:
        logger.warning(f"Fuel estimate validation error from {client_ip}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        logger.error(f"Fuel estimate error from {client_ip}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during fuel estimation"
        )

@app.post("/api/fuel/estimate", response_model=FuelEstimateResponse)
async def estimate_fuel_post(
    request: Request,
    fuel_request: Dict[str, Any],  # Accept raw dict for validation
    current_user: dict = Depends(get_current_active_user)
):
    """Calculate fuel estimate for a flight with provided altitude data"""
    
    # Get client IP for rate limiting
    client_ip = request.client.host if request.client else "unknown"
    user_id = str(current_user.get('user_id', '')) if current_user else None
    
    try:
        # Enhanced rate limiting with IP + user tracking
        rate_status = check_fuel_api_limits(client_ip, user_id)
        if not rate_status.allowed:
            # Add rate limit headers
            headers = {
                "X-Rate-Limit-Limit": str(rate_status.limit),
                "X-Rate-Limit-Remaining": "0",
                "X-Rate-Limit-Reset": rate_status.reset_time.isoformat()
            }
            if rate_status.retry_after:
                headers["X-Rate-Limit-Retry-After"] = str(rate_status.retry_after)
            
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Try again in {rate_status.retry_after} seconds.",
                headers=headers
            )
        
        # Input validation and sanitization
        validated_request = validate_fuel_request(fuel_request)
        
        # Check feature flag
        if not FeatureFlags.is_enabled("fuelEstimates", user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Fuel estimation feature is not enabled for your account"
            )
        
        # Array size validation (additional check)
        if len(validated_request.altitude_series) > 10000:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Altitude series too large (max 10,000 points)"
            )
        
        # Log telemetry with sanitized data
        logger.info(f"Fuel estimate calculated for flight {validated_request.flight_id} by user {user_id}")
        SecurityAuditor.log_security_event(
            "fuel_estimate_calculated",
            user_id,
            {
                "flight_id": validated_request.flight_id, 
                "aircraft_type": validated_request.aircraft_type,
                "altitude_points": len(validated_request.altitude_series),
                "ip": client_ip
            },
            request
        )
        
        # Convert to format expected by fuel estimator
        altitude_samples = [
            (point.timestamp, point.altitude) 
            for point in validated_request.altitude_series
        ]
        
        # Calculate estimate using enhanced estimator
        from src.core.fuel_estimation_v2 import EnhancedFuelEstimator
        enhanced_estimator = EnhancedFuelEstimator()
        
        estimate = enhanced_estimator.estimate_fuel(
            flight_id=validated_request.flight_id,
            aircraft_type=validated_request.aircraft_type,
            altitude_samples=altitude_samples,
            distance_nm=validated_request.distance_nm
        )
        
        # Add rate limit headers to successful response
        response_headers = {
            "X-Rate-Limit-Limit": str(rate_status.limit),
            "X-Rate-Limit-Remaining": str(rate_status.remaining),
            "X-Rate-Limit-Reset": rate_status.reset_time.isoformat()
        }
        
        # Format response
        return FuelEstimateResponse(
            fuelKg=estimate.fuel_kg,
            fuelL=estimate.fuel_liters,
            fuelGal=estimate.fuel_gallons,
            co2Kg=estimate.co2_kg,
            confidence=estimate.confidence.value,
            assumptions=estimate.assumptions,
            phases=[{
                "phase": phase.phase.value,
                "duration_minutes": phase.duration_seconds / 60.0,
                "fuel_burn_kg": estimate.phase_fuel.get(phase.phase, 0),
                "average_altitude_ft": phase.avg_altitude_ft
            } for phase in estimate.phases]
        )
        
    except ValidationError as e:
        logger.warning(f"Fuel estimate validation error from {client_ip}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        logger.error(f"Fuel estimate error from {client_ip}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during fuel estimation"
        )

@app.get("/")
async def root():
    return {"message": "FlightTrace API", "version": "1.0.0"}
