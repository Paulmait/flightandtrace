import os
from typing import Optional
from pydantic import BaseSettings, validator
from datetime import timedelta

class Settings(BaseSettings):
    # Security Settings
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "")
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./data/flights.db")
    
    # Stripe
    STRIPE_SECRET_KEY: str = os.getenv("STRIPE_SECRET_KEY", "")
    STRIPE_PUBLISHABLE_KEY: str = os.getenv("STRIPE_PUBLISHABLE_KEY", "")
    STRIPE_WEBHOOK_SECRET: str = os.getenv("STRIPE_WEBHOOK_SECRET", "")
    
    # CORS
    CORS_ORIGINS: list = ["http://localhost:3000", "https://yourdomain.com"]
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_PER_HOUR: int = 1000
    
    # Email
    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = os.getenv("SMTP_USERNAME", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    FROM_EMAIL: str = os.getenv("FROM_EMAIL", "noreply@flighttrace.com")
    
    # Security Headers
    HSTS_MAX_AGE: int = 31536000  # 1 year
    
    # Session
    SESSION_COOKIE_SECURE: bool = True
    SESSION_COOKIE_HTTPONLY: bool = True
    SESSION_COOKIE_SAMESITE: str = "Lax"
    
    # Password Policy
    PASSWORD_MIN_LENGTH: int = 12
    PASSWORD_REQUIRE_UPPERCASE: bool = True
    PASSWORD_REQUIRE_LOWERCASE: bool = True
    PASSWORD_REQUIRE_DIGITS: bool = True
    PASSWORD_REQUIRE_SPECIAL: bool = True
    
    # Account Security
    MAX_LOGIN_ATTEMPTS: int = 5
    LOCKOUT_DURATION_MINUTES: int = 15
    PASSWORD_RESET_TOKEN_EXPIRE_HOURS: int = 1
    
    # Data Retention
    USER_DATA_RETENTION_DAYS: int = 365 * 2  # 2 years
    LOG_RETENTION_DAYS: int = 90
    
    # Environment and Debug
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    # Monitoring
    SENTRY_DSN: Optional[str] = os.getenv("SENTRY_DSN", None)
    
    # Redis (for caching and advanced rate limiting)
    REDIS_URL: Optional[str] = os.getenv("REDIS_URL", None)
    
    # Encryption
    FIELD_ENCRYPTION_KEY: Optional[str] = os.getenv("FIELD_ENCRYPTION_KEY", None)
    
    # API Security
    API_KEY_LENGTH: int = 32
    WEBHOOK_TIMEOUT_SECONDS: int = 30
    MAX_WEBHOOK_RETRIES: int = 3
    
    # Content Security
    MAX_UPLOAD_SIZE_MB: int = 10
    ALLOWED_FILE_EXTENSIONS: list = [".jpg", ".jpeg", ".png", ".pdf"]
    
    @validator("SECRET_KEY", "JWT_SECRET_KEY")
    def validate_secrets(cls, v):
        if not v:
            raise ValueError("Security keys must be set in environment variables")
        if len(v) < 32:
            raise ValueError("Security keys must be at least 32 characters")
        return v
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()