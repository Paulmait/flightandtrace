#!/bin/bash

# FlightTrace Secret Generation Script
# Generates all required secrets for production deployment

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}FlightTrace Secret Generation${NC}"
echo "============================="
echo

# Function to generate secure random strings
generate_secret() {
    local length=${1:-64}
    openssl rand -base64 $length | tr -d "=+/" | cut -c1-$length
}

# Create secrets directory
mkdir -p secrets
chmod 700 secrets

# Generate application secrets
echo -e "${BLUE}Generating application secrets...${NC}"

cat > secrets/app-secrets.env << EOF
# Generated on $(date)
# FlightTrace Application Secrets
# KEEP THIS FILE SECURE - DO NOT COMMIT TO GIT

# Core Security Keys (64 characters)
SECRET_KEY=$(generate_secret 64)
JWT_SECRET_KEY=$(generate_secret 64)

# Database
DATABASE_PASSWORD=$(generate_secret 32)
DATABASE_URL=postgresql://flighttrace_user:\${DATABASE_PASSWORD}@localhost:5432/flighttrace

# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=$(generate_secret 16)

# API Keys (placeholders - replace with actual keys)
STRIPE_SECRET_KEY=sk_live_YOUR_STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET

# Email Service
SMTP_PASSWORD=$(generate_secret 32)
EMAIL_VERIFICATION_SECRET=$(generate_secret 32)

# Monitoring
GRAFANA_ADMIN_PASSWORD=$(generate_secret 32)
PROMETHEUS_ADMIN_PASSWORD=$(generate_secret 32)

# OAuth Secrets (placeholders)
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
GITHUB_CLIENT_SECRET=YOUR_GITHUB_CLIENT_SECRET

# Encryption Keys
DATA_ENCRYPTION_KEY=$(generate_secret 32)
BACKUP_ENCRYPTION_KEY=$(generate_secret 32)

# Session Secrets
SESSION_SECRET=$(generate_secret 64)
CSRF_SECRET=$(generate_secret 32)

# API Rate Limiting
RATE_LIMIT_SECRET=$(generate_secret 32)

# Webhook Secrets
WEBHOOK_SECRET=$(generate_secret 32)
EOF

# Generate SSL/TLS related secrets
echo -e "${BLUE}Generating SSL/TLS secrets...${NC}"

cat > secrets/ssl-secrets.env << EOF
# SSL/TLS Configuration
SSL_DHPARAM_SIZE=2048
SSL_SESSION_TIMEOUT=1d
SSL_SESSION_CACHE_SIZE=10m
SSL_STAPLING_VERIFY=on
EOF

# Generate API tokens
echo -e "${BLUE}Generating API tokens...${NC}"

cat > secrets/api-tokens.env << EOF
# API Tokens for Internal Services
INTERNAL_API_TOKEN=$(generate_secret 64)
MONITORING_API_TOKEN=$(generate_secret 32)
BACKUP_API_TOKEN=$(generate_secret 32)
HEALTH_CHECK_TOKEN=$(generate_secret 32)
EOF

# Generate development tokens for testing
echo -e "${BLUE}Generating development tokens...${NC}"

cat > secrets/dev-tokens.env << EOF
# Development/Testing Tokens (DO NOT USE IN PRODUCTION)
DEV_USER_TOKEN=$(generate_secret 32)
TEST_API_KEY=$(generate_secret 32)
EOF

# Create nginx htpasswd for monitoring
echo -e "${BLUE}Creating monitoring authentication...${NC}"

MONITORING_USER="flighttrace_monitor"
MONITORING_PASS=$(generate_secret 16)
echo "$MONITORING_PASS" | htpasswd -i -c secrets/monitoring.htpasswd $MONITORING_USER 2>/dev/null || true

cat > secrets/monitoring-auth.txt << EOF
Monitoring Authentication
========================
Username: $MONITORING_USER
Password: $MONITORING_PASS

Grafana Admin Password: $(grep GRAFANA_ADMIN_PASSWORD secrets/app-secrets.env | cut -d= -f2)
EOF

# Create database initialization script
echo -e "${BLUE}Creating database setup script...${NC}"

DB_PASS=$(grep DATABASE_PASSWORD secrets/app-secrets.env | cut -d= -f2)

cat > secrets/init-database.sql << EOF
-- FlightTrace Database Initialization
-- Generated on $(date)

-- Create database
CREATE DATABASE flighttrace;

-- Create user with generated password
CREATE USER flighttrace_user WITH ENCRYPTED PASSWORD '$DB_PASS';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE flighttrace TO flighttrace_user;

-- Connect to flighttrace database
\c flighttrace;

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO flighttrace_user;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
EOF

# Generate deployment configuration
echo -e "${BLUE}Generating deployment configuration...${NC}"

cat > secrets/deployment-config.json << EOF
{
  "deployment": {
    "environment": "production",
    "domain": "flighttrace.com",
    "ssl_enabled": true,
    "debug_mode": false,
    "api_version": "v1",
    "deployment_id": "$(uuidgen || openssl rand -hex 16)",
    "deployed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  },
  "security": {
    "session_timeout_minutes": 30,
    "max_login_attempts": 5,
    "password_min_length": 12,
    "mfa_enabled": true,
    "api_rate_limit": 1000
  },
  "features": {
    "websockets": true,
    "ai_predictions": true,
    "weather_integration": true,
    "family_sharing": true,
    "voice_assistant": true,
    "offline_mode": true
  }
}
EOF

# Create summary file
echo -e "${BLUE}Creating deployment summary...${NC}"

cat > secrets/DEPLOYMENT_SUMMARY.md << EOF
# FlightTrace Deployment Summary
Generated: $(date)

## Generated Secrets

All secrets have been generated and stored in the \`secrets/\` directory.

### Files Created:
- \`app-secrets.env\` - Main application secrets
- \`ssl-secrets.env\` - SSL/TLS configuration
- \`api-tokens.env\` - Internal API tokens
- \`dev-tokens.env\` - Development tokens (not for production)
- \`monitoring.htpasswd\` - Monitoring authentication
- \`monitoring-auth.txt\` - Monitoring credentials
- \`init-database.sql\` - Database initialization script
- \`deployment-config.json\` - Deployment configuration

## Next Steps:

1. **Update API Keys**: Replace placeholder values in \`app-secrets.env\`:
   - Stripe API keys
   - Email service credentials
   - Weather API keys
   - OAuth client secrets

2. **Secure Storage**: 
   - Copy secrets to production server
   - Set appropriate permissions (600)
   - Consider using a secret management service

3. **Database Setup**:
   \`\`\`bash
   sudo -u postgres psql < secrets/init-database.sql
   \`\`\`

4. **Environment Variables**:
   \`\`\`bash
   cp secrets/app-secrets.env /etc/flighttrace/.env
   chmod 600 /etc/flighttrace/.env
   \`\`\`

## Security Notes:

- **NEVER** commit the \`secrets/\` directory to git
- Rotate all secrets every 90 days
- Use different secrets for staging/production
- Enable audit logging for secret access
- Consider using HashiCorp Vault or AWS Secrets Manager

## Quick Verification:

\`\`\`bash
# Check if all secrets are generated
ls -la secrets/

# Verify secret strength
grep -E '^[A-Z_]+_KEY=' secrets/app-secrets.env | wc -l
\`\`\`

---
Remember: These are YOUR production secrets. Keep them safe!
EOF

# Set proper permissions
chmod 600 secrets/*
chmod 700 secrets/

# Display summary
echo
echo -e "${GREEN}✓ Secret generation complete!${NC}"
echo
echo -e "${YELLOW}Generated files in 'secrets/' directory:${NC}"
ls -la secrets/
echo
echo -e "${RED}IMPORTANT SECURITY NOTES:${NC}"
echo "1. The 'secrets/' directory contains sensitive data"
echo "2. Never commit these files to version control"
echo "3. Replace placeholder API keys with real ones"
echo "4. Store securely on production server only"
echo
echo -e "${BLUE}Admin Credentials:${NC}"
echo "Username: admin"
echo "Password: $(grep ADMIN_PASSWORD secrets/app-secrets.env | cut -d= -f2)"
echo
echo -e "${BLUE}Database Password:${NC}"
echo "$(grep DATABASE_PASSWORD secrets/app-secrets.env | cut -d= -f2)"
echo
echo -e "${GREEN}Next step: Update placeholder API keys in secrets/app-secrets.env${NC}"