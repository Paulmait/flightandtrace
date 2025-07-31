# FlightTrace Production Deployment Checklist

## 🔐 1. Security Keys & Secrets to Generate

### Required Keys (MUST generate before deployment):
```bash
# Generate these using the setup-environment.sh script or manually:

# 1. Application Security Keys (64+ characters each)
SECRET_KEY=                    # Generate: openssl rand -base64 64
JWT_SECRET_KEY=               # Generate: openssl rand -base64 64

# 2. Database Password (PostgreSQL production)
DATABASE_PASSWORD=            # Generate: openssl rand -base64 32

# 3. API Keys to obtain:
STRIPE_SECRET_KEY=           # From: https://dashboard.stripe.com/apikeys
STRIPE_PUBLISHABLE_KEY=      # From: https://dashboard.stripe.com/apikeys
STRIPE_WEBHOOK_SECRET=       # From: https://dashboard.stripe.com/webhooks

OPENWEATHER_API_KEY=         # From: https://openweathermap.org/api
AVIATION_WEATHER_API_KEY=    # From: https://aviationweather.gov/data/api/
SENDGRID_API_KEY=           # From: https://app.sendgrid.com/settings/api_keys

# 4. Monitoring & Error Tracking
SENTRY_DSN=                 # From: https://sentry.io/settings/projects/
GRAFANA_API_KEY=            # Generated during monitoring setup
PAGERDUTY_SERVICE_KEY=      # From: https://app.pagerduty.com/
SLACK_WEBHOOK_URL=          # From: https://api.slack.com/apps

# 5. OAuth Keys (optional but recommended)
GOOGLE_CLIENT_ID=           # From: https://console.cloud.google.com/
GOOGLE_CLIENT_SECRET=       # From: https://console.cloud.google.com/
GITHUB_CLIENT_ID=           # From: https://github.com/settings/developers
GITHUB_CLIENT_SECRET=       # From: https://github.com/settings/developers
```

## 📋 2. Pre-Deployment Tasks

### Infrastructure Setup
- [ ] **Domain Registration**: Register `flighttrace.com` or your chosen domain
- [ ] **DNS Configuration**: Point domain to your server IP
- [ ] **Server Setup**: Ubuntu 22.04 LTS with at least 4GB RAM
- [ ] **SSL Certificate**: Will be auto-generated via Let's Encrypt

### Database Setup
- [ ] **PostgreSQL 14+**: Install and configure
- [ ] **Create Database**: `CREATE DATABASE flighttrace;`
- [ ] **Create User**: `CREATE USER flighttrace_user WITH ENCRYPTED PASSWORD 'your-password';`
- [ ] **Grant Permissions**: `GRANT ALL PRIVILEGES ON DATABASE flighttrace TO flighttrace_user;`

### Third-Party Services
- [ ] **Stripe Account**: Set up at https://stripe.com
  - [ ] Create subscription products (Premium, Family, Enterprise)
  - [ ] Set up webhook endpoints
  - [ ] Configure customer portal
- [ ] **Email Service**: SendGrid or AWS SES
- [ ] **Weather API**: OpenWeatherMap account
- [ ] **Error Tracking**: Sentry.io account
- [ ] **Monitoring**: Set up alerts in PagerDuty/Slack

## 🚀 3. Deployment Steps

### 1. Clone and Configure
```bash
# On your production server
git clone https://github.com/Paulmait/flighttrace.git
cd flighttrace

# Run environment setup
chmod +x scripts/setup-environment.sh
./scripts/setup-environment.sh
```

### 2. Install Dependencies
```bash
# Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
npm run build
```

### 3. Database Migration
```bash
cd backend
python -c "from src.db.database import init_db; init_db()"
```

### 4. SSL/TLS Setup
```bash
chmod +x scripts/setup-ssl.sh
sudo ./scripts/setup-ssl.sh flighttrace.com your-email@domain.com
```

### 5. Start Services
```bash
# Backend API
sudo systemctl start flighttrace
sudo systemctl enable flighttrace

# Monitoring Stack
cd monitoring
docker-compose -f docker-compose.monitoring.yml up -d
```

### 6. Security Audit
```bash
chmod +x scripts/security-audit.sh
sudo ./scripts/security-audit.sh
```

## ✅ 4. Post-Deployment Verification

### Functional Tests
- [ ] User registration and login
- [ ] Flight tracking functionality
- [ ] WebSocket real-time updates
- [ ] Payment processing (test mode first)
- [ ] Email notifications
- [ ] Family sharing features
- [ ] AI predictions
- [ ] Weather integration

### Security Tests
- [ ] SSL certificate valid (https://www.ssllabs.com/ssltest/)
- [ ] Security headers configured (https://securityheaders.com/)
- [ ] Rate limiting active
- [ ] Authentication required on protected endpoints
- [ ] CORS properly configured

### Performance Tests
- [ ] Page load time < 3 seconds
- [ ] API response time < 500ms
- [ ] WebSocket latency < 100ms
- [ ] Mobile responsiveness

### Monitoring Verification
- [ ] Prometheus collecting metrics
- [ ] Grafana dashboards loading
- [ ] Alerts configured and tested
- [ ] Uptime monitoring active
- [ ] Log aggregation working

## 📊 5. Go-Live Checklist

### Final Steps
- [ ] Change Stripe to production mode
- [ ] Update DNS to production server
- [ ] Enable production error tracking
- [ ] Configure CDN (CloudFlare recommended)
- [ ] Set up automated backups
- [ ] Document incident response procedures
- [ ] Create user documentation
- [ ] Prepare support channels

### Legal Requirements
- [ ] Privacy Policy published at /privacy
- [ ] Terms of Service published at /terms
- [ ] Cookie consent banner active
- [ ] GDPR compliance verified
- [ ] Aviation disclaimers visible

## 🔧 6. Maintenance Tasks

### Daily
- [ ] Check monitoring dashboards
- [ ] Review error logs
- [ ] Verify backup completion

### Weekly
- [ ] Review security alerts
- [ ] Check SSL certificate expiry
- [ ] Update dependencies (security patches)

### Monthly
- [ ] Full security audit
- [ ] Performance review
- [ ] Cost analysis
- [ ] User feedback review

## 📞 7. Emergency Contacts

```
On-Call Engineer: _______________
Security Team: security@flighttrace.com
Database Admin: _______________
DevOps Lead: _______________
Business Contact: _______________
```

## 🎯 8. Launch Communication

### Internal
- [ ] Team notification
- [ ] Support team training
- [ ] Documentation review

### External
- [ ] Beta users notification
- [ ] Press release prepared
- [ ] Social media announcements
- [ ] Email campaign ready

---

## Quick Start Commands

```bash
# Generate all secrets at once
./scripts/generate-secrets.sh

# Run full deployment
./scripts/deploy-production.sh

# Verify deployment
./scripts/verify-deployment.sh
```

**Remember**: Never commit secrets to git. Use environment variables or secret management services.