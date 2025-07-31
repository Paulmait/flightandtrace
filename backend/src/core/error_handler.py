from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import logging
from typing import Union
import traceback
from src.core.config import settings

logger = logging.getLogger(__name__)

class ErrorResponse:
    """Standardized error response format"""
    
    @staticmethod
    def create(
        status_code: int,
        message: str,
        error_code: str = None,
        request_id: str = None
    ) -> dict:
        """Create standardized error response"""
        response = {
            "error": {
                "message": message,
                "status_code": status_code
            }
        }
        
        if error_code:
            response["error"]["code"] = error_code
        
        if request_id:
            response["error"]["request_id"] = request_id
        
        return response

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors without exposing internal details"""
    # Log full error for debugging
    logger.error(f"Validation error: {exc.errors()}")
    
    # Generic message for production
    if settings.ENVIRONMENT == "production":
        message = "Invalid request data"
        errors = None
    else:
        # More detailed errors in development
        message = "Validation error"
        errors = []
        for error in exc.errors():
            field = " -> ".join(str(x) for x in error.get("loc", []))
            errors.append({
                "field": field,
                "message": error.get("msg", "Invalid value")
            })
    
    request_id = getattr(request.state, "request_id", None)
    response = ErrorResponse.create(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        message=message,
        error_code="VALIDATION_ERROR",
        request_id=request_id
    )
    
    if errors and settings.ENVIRONMENT != "production":
        response["error"]["details"] = errors
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=response
    )

async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle HTTP exceptions with secure error messages"""
    request_id = getattr(request.state, "request_id", None)
    
    # Map status codes to safe messages
    safe_messages = {
        400: "Bad request",
        401: "Authentication required",
        403: "Access denied",
        404: "Resource not found",
        405: "Method not allowed",
        409: "Conflict",
        410: "Resource no longer available",
        422: "Invalid request data",
        429: "Too many requests",
        500: "Internal server error",
        502: "Bad gateway",
        503: "Service temporarily unavailable",
        504: "Gateway timeout"
    }
    
    # Use safe message or default
    message = safe_messages.get(exc.status_code, "An error occurred")
    
    # In development, include more details
    if settings.ENVIRONMENT != "production" and exc.detail:
        message = str(exc.detail)
    
    response = ErrorResponse.create(
        status_code=exc.status_code,
        message=message,
        error_code=f"HTTP_{exc.status_code}",
        request_id=request_id
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content=response
    )

async def general_exception_handler(request: Request, exc: Exception):
    """Handle all other exceptions securely"""
    # Log full error with traceback
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    
    request_id = getattr(request.state, "request_id", None)
    
    # Never expose internal errors in production
    if settings.ENVIRONMENT == "production":
        message = "An unexpected error occurred"
        status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    else:
        # More details in development
        message = f"{type(exc).__name__}: {str(exc)}"
        status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    
    response = ErrorResponse.create(
        status_code=status_code,
        message=message,
        error_code="INTERNAL_ERROR",
        request_id=request_id
    )
    
    # Add debug info in development
    if settings.ENVIRONMENT != "production":
        response["error"]["debug"] = {
            "exception": type(exc).__name__,
            "traceback": traceback.format_exc().split('\n')
        }
    
    return JSONResponse(
        status_code=status_code,
        content=response
    )

class BusinessLogicError(Exception):
    """Custom exception for business logic errors"""
    def __init__(self, message: str, status_code: int = 400, error_code: str = None):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code or "BUSINESS_LOGIC_ERROR"
        super().__init__(self.message)

async def business_logic_exception_handler(request: Request, exc: BusinessLogicError):
    """Handle business logic errors"""
    request_id = getattr(request.state, "request_id", None)
    
    response = ErrorResponse.create(
        status_code=exc.status_code,
        message=exc.message,
        error_code=exc.error_code,
        request_id=request_id
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content=response
    )

# Error code constants
class ErrorCodes:
    # Authentication errors
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS"
    TOKEN_EXPIRED = "TOKEN_EXPIRED"
    TOKEN_INVALID = "TOKEN_INVALID"
    ACCOUNT_LOCKED = "ACCOUNT_LOCKED"
    ACCOUNT_DISABLED = "ACCOUNT_DISABLED"
    
    # Authorization errors
    INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS"
    RESOURCE_ACCESS_DENIED = "RESOURCE_ACCESS_DENIED"
    
    # Validation errors
    VALIDATION_ERROR = "VALIDATION_ERROR"
    INVALID_FORMAT = "INVALID_FORMAT"
    MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD"
    
    # Resource errors
    RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND"
    RESOURCE_ALREADY_EXISTS = "RESOURCE_ALREADY_EXISTS"
    RESOURCE_CONFLICT = "RESOURCE_CONFLICT"
    
    # Rate limiting
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
    QUOTA_EXCEEDED = "QUOTA_EXCEEDED"
    
    # System errors
    INTERNAL_ERROR = "INTERNAL_ERROR"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
    EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR"