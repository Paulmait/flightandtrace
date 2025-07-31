#!/bin/bash

# FlightTrace Environment Setup Script
# Configures production environment variables securely

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}FlightTrace Environment Configuration${NC}"
echo "====================================="

# Function to generate secure random strings
generate_secret() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-${1:-32}
}

# Check if .env file exists
if [ -f ".env" ]; then
    echo -e "${YELLOW}Existing .env file found. Creating backup...${NC}"
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
fi

# Copy example file
cp .env.example .env

echo -e "${BLUE}Generating secure keys...${NC}"

# Generate security keys
SECRET_KEY=$(generate_secret 64)
JWT_SECRET_KEY=$(generate_secret 64)

# Update .env file with generated keys
sed -i "s/your-secret-key-here-min-32-chars/$SECRET_KEY/" .env
sed -i "s/your-jwt-secret-key-here-min-32-chars/$JWT_SECRET_KEY/" .env

echo -e "${GREEN}✓ Security keys generated${NC}"

# Prompt for required configurations
echo -e "\n${BLUE}Please provide the following configuration values:${NC}"

# Database configuration
read -p "Database URL [default: sqlite:///./data/flights.db]: " DB_URL
DB_URL=${DB_URL:-"sqlite:///./data/flights.db"}
sed -i "s|DATABASE_URL=.*|DATABASE_URL=$DB_URL|" .env

# Stripe configuration
echo -e "\n${YELLOW}Stripe Configuration (get from https://dashboard.stripe.com)${NC}"
read -p "Stripe Secret Key (sk_live_...): " STRIPE_SECRET
read -p "Stripe Publishable Key (pk_live_...): " STRIPE_PUBLIC
read -p "Stripe Webhook Secret (whsec_...): " STRIPE_WEBHOOK

if [ ! -z "$STRIPE_SECRET" ]; then
    sed -i "s/sk_test_your_stripe_secret_key/$STRIPE_SECRET/" .env
    sed -i "s/pk_test_your_stripe_publishable_key/$STRIPE_PUBLIC/" .env
    sed -i "s/whsec_your_webhook_secret/$STRIPE_WEBHOOK/" .env
fi

# Email configuration
echo -e "\n${YELLOW}Email Configuration${NC}"
read -p "SMTP Host [default: smtp.gmail.com]: " SMTP_HOST
SMTP_HOST=${SMTP_HOST:-"smtp.gmail.com"}
read -p "SMTP Username: " SMTP_USER
read -sp "SMTP Password: " SMTP_PASS
echo

sed -i "s/SMTP_HOST=.*/SMTP_HOST=$SMTP_HOST/" .env
sed -i "s/SMTP_USERNAME=.*/SMTP_USERNAME=$SMTP_USER/" .env
sed -i "s/SMTP_PASSWORD=.*/SMTP_PASSWORD=$SMTP_PASS/" .env

# Application settings
echo -e "\n${YELLOW}Application Settings${NC}"
read -p "Environment (production/staging) [default: production]: " ENVIRONMENT
ENVIRONMENT=${ENVIRONMENT:-"production"}
read -p "Domain name (e.g., flighttrace.com): " DOMAIN
read -p "Frontend URL (e.g., https://flighttrace.com): " FRONTEND_URL

sed -i "s/ENVIRONMENT=.*/ENVIRONMENT=$ENVIRONMENT/" .env
echo "DOMAIN=$DOMAIN" >> .env
echo "FRONTEND_URL=$FRONTEND_URL" >> .env

# API Keys for features
echo -e "\n${YELLOW}External API Keys (optional, press Enter to skip)${NC}"
read -p "OpenWeather API Key: " OPENWEATHER_KEY
read -p "Aviation Weather API Key: " AVIATION_KEY
read -p "Sentry DSN for error tracking: " SENTRY_DSN

if [ ! -z "$OPENWEATHER_KEY" ]; then
    echo "OPENWEATHER_API_KEY=$OPENWEATHER_KEY" >> .env
fi
if [ ! -z "$AVIATION_KEY" ]; then
    echo "AVIATION_WEATHER_API_KEY=$AVIATION_KEY" >> .env
fi
if [ ! -z "$SENTRY_DSN" ]; then
    sed -i "s|SENTRY_DSN=.*|SENTRY_DSN=$SENTRY_DSN|" .env
fi

# Stripe price IDs
echo -e "\n${YELLOW}Stripe Price IDs (from Stripe Dashboard)${NC}"
read -p "Premium Plan Price ID: " PRICE_PREMIUM
read -p "Family Plan Price ID: " PRICE_FAMILY
read -p "Enterprise Plan Price ID: " PRICE_ENTERPRISE

if [ ! -z "$PRICE_PREMIUM" ]; then
    echo "STRIPE_PRICE_PREMIUM=$PRICE_PREMIUM" >> .env
    echo "STRIPE_PRICE_FAMILY=$PRICE_FAMILY" >> .env
    echo "STRIPE_PRICE_ENTERPRISE=$PRICE_ENTERPRISE" >> .env
fi

# Set secure permissions
chmod 600 .env

echo -e "\n${GREEN}✓ Environment configuration complete!${NC}"

# Validate configuration
echo -e "\n${BLUE}Validating configuration...${NC}"

python3 << EOF
import os
from dotenv import load_dotenv

load_dotenv()

required_vars = [
    'SECRET_KEY',
    'JWT_SECRET_KEY',
    'DATABASE_URL',
    'STRIPE_SECRET_KEY',
    'STRIPE_PUBLISHABLE_KEY'
]

missing = []
for var in required_vars:
    if not os.getenv(var):
        missing.append(var)

if missing:
    print(f"\033[0;31m✗ Missing required variables: {', '.join(missing)}\033[0m")
    exit(1)
else:
    print("\033[0;32m✓ All required variables are set\033[0m")

# Check key lengths
secret_key = os.getenv('SECRET_KEY', '')
jwt_key = os.getenv('JWT_SECRET_KEY', '')

if len(secret_key) < 32:
    print(f"\033[0;31m✗ SECRET_KEY too short ({len(secret_key)} chars, minimum 32)\033[0m")
else:
    print(f"\033[0;32m✓ SECRET_KEY length OK ({len(secret_key)} chars)\033[0m")

if len(jwt_key) < 32:
    print(f"\033[0;31m✗ JWT_SECRET_KEY too short ({len(jwt_key)} chars, minimum 32)\033[0m")
else:
    print(f"\033[0;32m✓ JWT_SECRET_KEY length OK ({len(jwt_key)} chars)\033[0m")
EOF

# Create production config files
echo -e "\n${BLUE}Creating production configuration files...${NC}"

# Create systemd environment file
sudo tee /etc/flighttrace.env > /dev/null << EOF
# FlightTrace Environment Variables
# Generated on $(date)
# DO NOT COMMIT THIS FILE

$(grep -E '^[A-Z_]+=' .env)
EOF

sudo chmod 600 /etc/flighttrace.env
sudo chown flighttrace:flighttrace /etc/flighttrace.env

# Create production settings
mkdir -p config/production

cat > config/production/settings.json << EOF
{
  "environment": "$ENVIRONMENT",
  "debug": false,
  "logLevel": "INFO",
  "cors": {
    "origins": ["$FRONTEND_URL", "https://www.$DOMAIN"]
  },
  "security": {
    "sessionTimeout": 1800,
    "maxLoginAttempts": 5,
    "passwordMinLength": 12
  },
  "features": {
    "websockets": true,
    "aiPredictions": true,
    "weatherIntegration": true,
    "voiceAssistant": true,
    "socialSharing": true
  }
}
EOF

# Create secrets directory with proper permissions
sudo mkdir -p /etc/flighttrace/secrets
sudo chown -R flighttrace:flighttrace /etc/flighttrace/secrets
sudo chmod 700 /etc/flighttrace/secrets

# Store sensitive data separately
echo "$STRIPE_SECRET" | sudo tee /etc/flighttrace/secrets/stripe_secret > /dev/null
echo "$STRIPE_WEBHOOK" | sudo tee /etc/flighttrace/secrets/stripe_webhook > /dev/null
sudo chmod 400 /etc/flighttrace/secrets/*

echo -e "\n${GREEN}✓ Production configuration files created${NC}"

# Create environment validation script
cat > scripts/validate-env.py << 'EOF'
#!/usr/bin/env python3
"""Validate FlightTrace environment configuration"""

import os
import sys
from dotenv import load_dotenv
import re
import requests

load_dotenv()

def check_var(name, validator=None, required=True):
    value = os.getenv(name)
    if not value and required:
        print(f"❌ {name}: Missing")
        return False
    elif not value:
        print(f"⚠️  {name}: Not set (optional)")
        return True
    
    if validator and not validator(value):
        print(f"❌ {name}: Invalid format")
        return False
    
    # Mask sensitive values
    if any(keyword in name.lower() for keyword in ['key', 'secret', 'password']):
        masked = value[:4] + '*' * (len(value) - 8) + value[-4:]
        print(f"✅ {name}: {masked}")
    else:
        print(f"✅ {name}: {value}")
    
    return True

def validate_email(email):
    return re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email) is not None

def validate_url(url):
    return re.match(r'^https?://[a-zA-Z0-9.-]+', url) is not None

def validate_stripe_key(key):
    return key.startswith(('sk_live_', 'pk_live_', 'sk_test_', 'pk_test_'))

print("FlightTrace Environment Validation")
print("==================================\n")

valid = True

# Security Keys
print("Security Keys:")
valid &= check_var('SECRET_KEY', lambda x: len(x) >= 32)
valid &= check_var('JWT_SECRET_KEY', lambda x: len(x) >= 32)

# Database
print("\nDatabase:")
valid &= check_var('DATABASE_URL')

# Stripe
print("\nStripe Configuration:")
valid &= check_var('STRIPE_SECRET_KEY', validate_stripe_key)
valid &= check_var('STRIPE_PUBLISHABLE_KEY', validate_stripe_key)
valid &= check_var('STRIPE_WEBHOOK_SECRET', lambda x: x.startswith('whsec_'))

# Email
print("\nEmail Configuration:")
valid &= check_var('SMTP_HOST')
valid &= check_var('SMTP_USERNAME', validate_email)
valid &= check_var('SMTP_PASSWORD')
valid &= check_var('FROM_EMAIL', validate_email)

# Application
print("\nApplication Settings:")
valid &= check_var('ENVIRONMENT', lambda x: x in ['production', 'staging', 'development'])
valid &= check_var('FRONTEND_URL', validate_url, required=False)
valid &= check_var('DOMAIN', required=False)

# Optional APIs
print("\nOptional APIs:")
valid &= check_var('OPENWEATHER_API_KEY', required=False)
valid &= check_var('SENTRY_DSN', validate_url, required=False)

# Test database connection
print("\nTesting Database Connection...")
try:
    from src.db.database import get_connection
    conn = get_connection()
    conn.close()
    print("✅ Database connection successful")
except Exception as e:
    print(f"❌ Database connection failed: {e}")
    valid = False

print("\n" + "="*40)
if valid:
    print("✅ Environment configuration is valid!")
    sys.exit(0)
else:
    print("❌ Environment configuration has errors!")
    sys.exit(1)
EOF

chmod +x scripts/validate-env.py

# Run validation
echo -e "\n${BLUE}Running environment validation...${NC}"
python3 scripts/validate-env.py

echo -e "\n${GREEN}Environment setup complete!${NC}"
echo -e "\nNext steps:"
echo -e "1. Review the generated .env file"
echo -e "2. Update any placeholder values"
echo -e "3. Run ${YELLOW}python3 scripts/validate-env.py${NC} to re-validate"
echo -e "4. Keep .env file secure and never commit it to version control"

# Create .env.production for deployment reference
cat > .env.production << EOF
# Production Environment Variables Reference
# Copy this to .env and fill in actual values

# Generated keys (use setup-environment.sh to generate)
SECRET_KEY=<generated-64-char-key>
JWT_SECRET_KEY=<generated-64-char-key>

# Required configurations
DATABASE_URL=postgresql://user:pass@localhost/flighttrace
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USERNAME=apikey
SMTP_PASSWORD=<sendgrid-api-key>
FROM_EMAIL=noreply@flighttrace.com

# Application
ENVIRONMENT=production
DEBUG=False
LOG_LEVEL=INFO
DOMAIN=flighttrace.com
FRONTEND_URL=https://flighttrace.com

# External APIs (optional but recommended)
OPENWEATHER_API_KEY=<your-key>
AVIATION_WEATHER_API_KEY=<your-key>
SENTRY_DSN=https://<key>@sentry.io/<project>
REDIS_URL=redis://localhost:6379/0

# Monitoring
PROMETHEUS_ENABLED=True
GRAFANA_API_KEY=<your-key>
EOF

echo -e "\n${YELLOW}Reference configuration saved to .env.production${NC}"