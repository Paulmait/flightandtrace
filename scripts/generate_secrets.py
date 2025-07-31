#!/usr/bin/env python3
"""
Generate secure secrets for FlightTrace application
"""

import secrets
import string
import os
from cryptography.fernet import Fernet
from pathlib import Path

def generate_secret_key(length=64):
    """Generate a secure secret key"""
    alphabet = string.ascii_letters + string.digits + string.punctuation
    # Remove problematic characters for shell environments
    alphabet = alphabet.replace('"', '').replace("'", '').replace('\\', '')
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def generate_env_file():
    """Generate a secure .env file with all required secrets"""
    
    env_template = """# Generated secure environment variables for FlightTrace
# Created: {timestamp}
# IMPORTANT: Keep this file secret and never commit to version control!

# Security Keys (auto-generated secure keys)
SECRET_KEY={secret_key}
JWT_SECRET_KEY={jwt_secret_key}

# Field Encryption Key (for encrypting sensitive database fields)
FIELD_ENCRYPTION_KEY={field_encryption_key}

# Database
DATABASE_URL=sqlite:///./data/flights.db

# Stripe (Get from Stripe Dashboard)
STRIPE_SECRET_KEY=sk_test_YOUR_STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET

# Email Configuration (Update with your SMTP settings)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password
FROM_EMAIL=noreply@flighttrace.com

# Application Settings
ENVIRONMENT=production
DEBUG=False
LOG_LEVEL=INFO

# CORS Origins (Update with your domain)
CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# Sentry (Optional - for error tracking)
SENTRY_DSN=

# Redis (Optional - for advanced rate limiting and caching)
REDIS_URL=

# Security Settings
HSTS_MAX_AGE=31536000
SESSION_COOKIE_SECURE=True
SESSION_COOKIE_HTTPONLY=True
SESSION_COOKIE_SAMESITE=Lax

# Rate Limiting
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_PER_HOUR=1000

# Password Policy
PASSWORD_MIN_LENGTH=12
PASSWORD_REQUIRE_UPPERCASE=True
PASSWORD_REQUIRE_LOWERCASE=True
PASSWORD_REQUIRE_DIGITS=True
PASSWORD_REQUIRE_SPECIAL=True

# Account Security
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=15
PASSWORD_RESET_TOKEN_EXPIRE_HOURS=1

# Data Retention (days)
USER_DATA_RETENTION_DAYS=730
LOG_RETENTION_DAYS=90
"""
    
    from datetime import datetime
    
    # Generate secure keys
    env_content = env_template.format(
        timestamp=datetime.utcnow().isoformat(),
        secret_key=generate_secret_key(64),
        jwt_secret_key=generate_secret_key(64),
        field_encryption_key=Fernet.generate_key().decode()
    )
    
    # Get the backend directory
    backend_dir = Path(__file__).parent.parent / "backend"
    env_path = backend_dir / ".env"
    
    # Check if .env already exists
    if env_path.exists():
        backup_path = backend_dir / f".env.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        print(f"Backing up existing .env to {backup_path}")
        env_path.rename(backup_path)
    
    # Write new .env file
    with open(env_path, 'w') as f:
        f.write(env_content)
    
    # Set secure permissions (Unix-like systems only)
    try:
        os.chmod(env_path, 0o600)  # Read/write for owner only
    except:
        pass  # Windows doesn't support chmod
    
    print(f"Generated secure .env file at: {env_path}")
    print("\nIMPORTANT:")
    print("1. Update the Stripe keys with your actual Stripe credentials")
    print("2. Update the email configuration with your SMTP settings")
    print("3. Update CORS_ORIGINS with your actual domain")
    print("4. Keep this file secret and never commit it to version control!")
    print("5. Consider using a secrets management service in production")

def generate_random_data():
    """Generate random test data for development"""
    print("\nAdditional secure values for reference:")
    print(f"Random API Key: {secrets.token_urlsafe(32)}")
    print(f"Random Webhook Secret: whsec_{secrets.token_hex(32)}")
    print(f"Random Password: {generate_secret_key(16)}")

if __name__ == "__main__":
    print("FlightTrace Secure Environment Generator")
    print("=" * 40)
    
    generate_env_file()
    generate_random_data()