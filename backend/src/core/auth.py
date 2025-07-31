from fastapi import HTTPException, Header, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional, Dict
import re
from src.db.database import get_connection
from src.core.config import settings
import hashlib
import secrets
from email_validator import validate_email, EmailNotValidError

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# Failed login tracking
failed_login_attempts: Dict[str, Dict] = {}

class AuthenticationError(Exception):
    pass

class PasswordValidationError(Exception):
    pass

def validate_password(password: str) -> None:
    """Validate password meets security requirements"""
    if len(password) < settings.PASSWORD_MIN_LENGTH:
        raise PasswordValidationError(f"Password must be at least {settings.PASSWORD_MIN_LENGTH} characters")
    
    if settings.PASSWORD_REQUIRE_UPPERCASE and not re.search(r"[A-Z]", password):
        raise PasswordValidationError("Password must contain uppercase letter")
    
    if settings.PASSWORD_REQUIRE_LOWERCASE and not re.search(r"[a-z]", password):
        raise PasswordValidationError("Password must contain lowercase letter")
    
    if settings.PASSWORD_REQUIRE_DIGITS and not re.search(r"\d", password):
        raise PasswordValidationError("Password must contain digit")
    
    if settings.PASSWORD_REQUIRE_SPECIAL and not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        raise PasswordValidationError("Password must contain special character")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def verify_token(token: str, token_type: str = "access") -> dict:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("type") != token_type:
            raise JWTError("Invalid token type")
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

def check_login_attempts(username: str) -> None:
    """Check if user is locked out due to failed login attempts"""
    if username in failed_login_attempts:
        attempts = failed_login_attempts[username]
        if attempts["count"] >= settings.MAX_LOGIN_ATTEMPTS:
            lockout_time = attempts["last_attempt"] + timedelta(minutes=settings.LOCKOUT_DURATION_MINUTES)
            if datetime.utcnow() < lockout_time:
                remaining_minutes = int((lockout_time - datetime.utcnow()).total_seconds() / 60)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Account locked. Try again in {remaining_minutes} minutes"
                )
            else:
                # Reset attempts after lockout period
                del failed_login_attempts[username]

def record_failed_login(username: str) -> None:
    """Record failed login attempt"""
    if username not in failed_login_attempts:
        failed_login_attempts[username] = {"count": 0, "last_attempt": datetime.utcnow()}
    
    failed_login_attempts[username]["count"] += 1
    failed_login_attempts[username]["last_attempt"] = datetime.utcnow()

def clear_failed_login_attempts(username: str) -> None:
    """Clear failed login attempts after successful login"""
    if username in failed_login_attempts:
        del failed_login_attempts[username]

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = verify_token(token, "access")
        user_id: int = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT user_id, username, email, role FROM users WHERE user_id = ?", (user_id,))
    user = cursor.fetchone()
    conn.close()
    
    if user is None:
        raise credentials_exception
    
    return {
        "user_id": user[0],
        "username": user[1],
        "email": user[2],
        "role": user[3]
    }

async def get_current_active_user(current_user: dict = Depends(get_current_user)):
    # Check if user is active/not suspended
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT is_active FROM users WHERE user_id = ?", (current_user["user_id"],))
    result = cursor.fetchone()
    conn.close()
    
    if not result or not result[0]:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    return current_user

def require_role(required_role: str):
    async def role_checker(current_user: dict = Depends(get_current_active_user)):
        if current_user.get("role") != required_role and current_user.get("role") != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return current_user
    return role_checker

def generate_password_reset_token() -> str:
    """Generate secure password reset token"""
    return secrets.token_urlsafe(32)

def hash_token(token: str) -> str:
    """Hash token for storage"""
    return hashlib.sha256(token.encode()).hexdigest()
