"""
Centralized error handling and logging for FlightTrace
"""

import logging
import traceback
from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from src.db.database import get_connection
import json

# Configure structured logging
class StructuredLogger:
    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(logging.INFO)
        
        # JSON formatter for structured logs
        formatter = logging.Formatter(
            '{"time": "%(asctime)s", "level": "%(levelname)s", "module": "%(name)s", '
            '"message": "%(message)s", "extra": %(extra)s}'
        )
        
        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        self.logger.addHandler(console_handler)
        
        # File handler for errors
        error_handler = logging.FileHandler('logs/errors.log')
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(formatter)
        self.logger.addHandler(error_handler)
        
        # File handler for security events
        security_handler = logging.FileHandler('logs/security.log')
        security_handler.setFormatter(formatter)
        self.security_logger = logging.getLogger(f"{name}.security")
        self.security_logger.addHandler(security_handler)
    
    def log(self, level: str, message: str, **kwargs):
        extra = json.dumps(kwargs) if kwargs else '{}'
        self.logger.log(getattr(logging, level.upper()), message, extra={'extra': extra})
    
    def security_event(self, event_type: str, details: Dict[str, Any]):
        self.security_logger.warning(f"Security Event: {event_type}", extra={'extra': json.dumps(details)})

# Global logger instance
logger = StructuredLogger(__name__)

# Error response model
def error_response(
    error_id: str,
    status_code: int,
    message: str,
    details: Optional[Dict] = None
) -> JSONResponse:
    content = {
        "error": {
            "id": error_id,
            "message": message,
            "timestamp": datetime.utcnow().isoformat(),
            "status_code": status_code
        }
    }
    
    if details:
        content["error"]["details"] = details
    
    return JSONResponse(
        status_code=status_code,
        content=content,
        headers={
            "X-Error-ID": error_id,
            "Cache-Control": "no-store"
        }
    )

# Custom exception classes
class FlightTraceException(Exception):
    """Base exception for FlightTrace"""
    def __init__(self, message: str, error_code: str = "UNKNOWN_ERROR", status_code: int = 500):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        super().__init__(self.message)

class AuthenticationError(FlightTraceException):
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message, "AUTH_ERROR", 401)

class AuthorizationError(FlightTraceException):
    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(message, "AUTHZ_ERROR", 403)

class ValidationError(FlightTraceException):
    def __init__(self, message: str, field: Optional[str] = None):
        super().__init__(message, "VALIDATION_ERROR", 400)
        self.field = field

class RateLimitError(FlightTraceException):
    def __init__(self, message: str = "Rate limit exceeded", retry_after: Optional[int] = None):
        super().__init__(message, "RATE_LIMIT_ERROR", 429)
        self.retry_after = retry_after

class PaymentError(FlightTraceException):
    def __init__(self, message: str = "Payment processing error"):
        super().__init__(message, "PAYMENT_ERROR", 402)

class DataNotFoundError(FlightTraceException):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, "NOT_FOUND", 404)

class ExternalServiceError(FlightTraceException):
    def __init__(self, service: str, message: str = "External service error"):
        super().__init__(message, f"{service.upper()}_ERROR", 503)
        self.service = service

# Exception handlers
async def flighttrace_exception_handler(request: Request, exc: FlightTraceException):
    # Log the error
    logger.log("error", f"{exc.error_code}: {exc.message}", 
              path=request.url.path,
              method=request.method,
              client=request.client.host if request.client else None)
    
    # Generate error ID
    import uuid
    error_id = str(uuid.uuid4())
    
    # Store error in database for tracking
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO error_log (error_id, error_code, message, path, method, 
                                 status_code, client_ip, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (error_id, exc.error_code, exc.message, request.url.path, 
              request.method, exc.status_code, 
              request.client.host if request.client else None, datetime.utcnow()))
        conn.commit()
        conn.close()
    except Exception as e:
        logger.log("error", f"Failed to log error to database: {str(e)}")
    
    return error_response(error_id, exc.status_code, exc.message)

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # Extract validation errors
    errors = []
    for error in exc.errors():
        errors.append({
            "field": ".".join(str(loc) for loc in error["loc"]),
            "message": error["msg"],
            "type": error["type"]
        })
    
    logger.log("warning", "Validation error", 
              path=request.url.path,
              errors=errors)
    
    return error_response(
        str(uuid.uuid4()),
        status.HTTP_422_UNPROCESSABLE_ENTITY,
        "Validation failed",
        {"errors": errors}
    )

async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    # Log 5xx errors
    if exc.status_code >= 500:
        logger.log("error", f"HTTP {exc.status_code}: {exc.detail}",
                  path=request.url.path,
                  method=request.method)
    
    return error_response(
        str(uuid.uuid4()),
        exc.status_code,
        str(exc.detail)
    )

async def generic_exception_handler(request: Request, exc: Exception):
    # Log the full traceback
    tb = traceback.format_exc()
    logger.log("critical", f"Unhandled exception: {str(exc)}",
              path=request.url.path,
              method=request.method,
              traceback=tb)
    
    # Log security event for potential attacks
    if any(pattern in str(exc).lower() for pattern in ['sql', 'injection', 'script']):
        logger.security_event("POTENTIAL_ATTACK", {
            "path": request.url.path,
            "exception": str(exc),
            "client": request.client.host if request.client else None
        })
    
    # Don't expose internal errors to users
    return error_response(
        str(uuid.uuid4()),
        status.HTTP_500_INTERNAL_SERVER_ERROR,
        "An internal error occurred. Please try again later."
    )

# Middleware for request/response logging
class LoggingMiddleware:
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, request: Request, call_next):
        # Generate request ID
        import uuid
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        # Log request
        start_time = datetime.utcnow()
        logger.log("info", "Request started",
                  request_id=request_id,
                  method=request.method,
                  path=request.url.path,
                  client=request.client.host if request.client else None)
        
        try:
            response = await call_next(request)
            
            # Log response
            duration = (datetime.utcnow() - start_time).total_seconds()
            logger.log("info", "Request completed",
                      request_id=request_id,
                      status_code=response.status_code,
                      duration=duration)
            
            # Add request ID to response
            response.headers["X-Request-ID"] = request_id
            
            return response
            
        except Exception as e:
            # Log error
            duration = (datetime.utcnow() - start_time).total_seconds()
            logger.log("error", f"Request failed: {str(e)}",
                      request_id=request_id,
                      duration=duration)
            raise

# Security event logging
def log_security_event(event_type: str, user_id: Optional[int] = None, 
                      details: Optional[Dict] = None, request: Optional[Request] = None):
    """Log security-relevant events"""
    event_data = {
        "event_type": event_type,
        "timestamp": datetime.utcnow().isoformat(),
        "user_id": user_id
    }
    
    if request:
        event_data.update({
            "client_ip": request.client.host if request.client else None,
            "user_agent": request.headers.get("user-agent"),
            "path": request.url.path
        })
    
    if details:
        event_data.update(details)
    
    logger.security_event(event_type, event_data)
    
    # Store in database
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO security_events (event_type, user_id, details, timestamp)
            VALUES (?, ?, ?, ?)
        """, (event_type, user_id, json.dumps(event_data), datetime.utcnow()))
        conn.commit()
        conn.close()
    except Exception as e:
        logger.log("error", f"Failed to log security event: {str(e)}")

# Audit logging
def audit_log(action: str, user_id: int, details: str, 
             ip_address: Optional[str] = None, user_agent: Optional[str] = None):
    """Log user actions for audit trail"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO audit_log (user_id, action, details, ip_address, user_agent, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (user_id, action, details, ip_address, user_agent, datetime.utcnow()))
        conn.commit()
        conn.close()
        
        logger.log("info", f"Audit: {action}",
                  user_id=user_id,
                  details=details)
    except Exception as e:
        logger.log("error", f"Failed to create audit log: {str(e)}")

# Performance monitoring
class PerformanceMonitor:
    def __init__(self):
        self.metrics = {}
    
    def record_metric(self, metric_name: str, value: float, tags: Optional[Dict] = None):
        """Record a performance metric"""
        logger.log("info", f"Performance metric: {metric_name}",
                  value=value,
                  tags=tags or {})
    
    def record_request_duration(self, endpoint: str, method: str, duration: float, status_code: int):
        """Record API request duration"""
        self.record_metric("request_duration", duration, {
            "endpoint": endpoint,
            "method": method,
            "status_code": status_code
        })

# Global performance monitor
performance_monitor = PerformanceMonitor()

# Error recovery strategies
class ErrorRecovery:
    @staticmethod
    async def retry_with_backoff(func, max_attempts: int = 3, backoff_factor: float = 2.0):
        """Retry a function with exponential backoff"""
        import asyncio
        
        for attempt in range(max_attempts):
            try:
                return await func()
            except Exception as e:
                if attempt == max_attempts - 1:
                    raise
                
                wait_time = backoff_factor ** attempt
                logger.log("warning", f"Retry attempt {attempt + 1}/{max_attempts}",
                          wait_time=wait_time,
                          error=str(e))
                
                await asyncio.sleep(wait_time)
    
    @staticmethod
    def circuit_breaker(failure_threshold: int = 5, recovery_timeout: int = 60):
        """Circuit breaker pattern for external services"""
        def decorator(func):
            failures = 0
            last_failure_time = None
            
            async def wrapper(*args, **kwargs):
                nonlocal failures, last_failure_time
                
                # Check if circuit is open
                if failures >= failure_threshold:
                    if last_failure_time and \
                       (datetime.utcnow() - last_failure_time).seconds < recovery_timeout:
                        raise ExternalServiceError(
                            func.__name__,
                            "Service temporarily unavailable"
                        )
                    else:
                        # Reset circuit
                        failures = 0
                        last_failure_time = None
                
                try:
                    result = await func(*args, **kwargs)
                    failures = 0  # Reset on success
                    return result
                except Exception as e:
                    failures += 1
                    last_failure_time = datetime.utcnow()
                    logger.log("error", f"Circuit breaker: {func.__name__} failed",
                              failures=failures)
                    raise
            
            return wrapper
        return decorator