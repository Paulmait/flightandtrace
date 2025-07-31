# FlightTrace Deployment Security Guide

## Overview
This guide provides comprehensive security instructions for deploying FlightTrace in production environments.

## Pre-Deployment Security Setup

### 1. Generate Production Secrets
```bash
# Generate secure environment variables
python scripts/generate_secrets.py

# Verify .env file permissions (Unix/Linux)
chmod 600 backend/.env
```

### 2. SSL/TLS Configuration

#### Using Certbot (Let's Encrypt)
```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Generate certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

#### Nginx Configuration
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # SSL Security Headers
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

### 3. Database Security

#### PostgreSQL Configuration
```bash
# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Secure PostgreSQL
sudo -u postgres psql

# Create database and user
CREATE DATABASE flighttrace;
CREATE USER flighttrace_user WITH ENCRYPTED PASSWORD 'strong_password_here';
GRANT ALL PRIVILEGES ON DATABASE flighttrace TO flighttrace_user;

# Enable SSL for PostgreSQL
# Edit postgresql.conf
ssl = on
ssl_cert_file = 'server.crt'
ssl_key_file = 'server.key'

# Update .env
DATABASE_URL=postgresql://flighttrace_user:password@localhost:5432/flighttrace?sslmode=require
```

### 4. Redis Security (if using)
```bash
# Install Redis
sudo apt-get install redis-server

# Configure Redis password
# Edit /etc/redis/redis.conf
requirepass your_redis_password_here
bind 127.0.0.1 ::1

# Restart Redis
sudo systemctl restart redis-server

# Update .env
REDIS_URL=redis://:your_redis_password@localhost:6379/0
```

### 5. Firewall Configuration

#### Using UFW (Ubuntu Firewall)
```bash
# Enable firewall
sudo ufw enable

# Allow SSH (adjust port if custom)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow only from specific IPs (optional)
sudo ufw allow from 192.168.1.0/24 to any port 22

# Check status
sudo ufw status verbose
```

### 6. Cloudflare Setup (Recommended)

1. **Add site to Cloudflare**
   - Change nameservers to Cloudflare
   - Enable "Full (strict)" SSL mode

2. **Security Settings**
   - Enable "Always Use HTTPS"
   - Set Security Level to "High"
   - Enable "Bot Fight Mode"
   - Configure Rate Limiting rules

3. **DDoS Protection**
   - Enable "I'm Under Attack" mode if needed
   - Configure Page Rules for caching
   - Set up Web Application Firewall (WAF) rules

### 7. Application Deployment

#### Using Systemd Service
```ini
# /etc/systemd/system/flighttrace.service
[Unit]
Description=FlightTrace API Service
After=network.target

[Service]
Type=exec
User=flighttrace
Group=flighttrace
WorkingDirectory=/opt/flighttrace/backend
Environment="PATH=/opt/flighttrace/venv/bin"
ExecStart=/opt/flighttrace/venv/bin/uvicorn src.api.fastapi_app:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=10

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/flighttrace/backend/data

[Install]
WantedBy=multi-user.target
```

#### Docker Deployment (Alternative)
```dockerfile
# Dockerfile
FROM python:3.11-slim

# Security: Run as non-root user
RUN useradd -m -u 1000 flighttrace

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY --chown=flighttrace:flighttrace . .

# Switch to non-root user
USER flighttrace

# Run with limited permissions
CMD ["uvicorn", "src.api.fastapi_app:app", "--host", "0.0.0.0", "--port", "8000"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    build: ./backend
    environment:
      - ENVIRONMENT=production
    env_file:
      - ./backend/.env
    ports:
      - "127.0.0.1:8000:8000"
    volumes:
      - ./backend/data:/app/data
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
    
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: flighttrace
      POSTGRES_USER: flighttrace_user
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    
  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    restart: unless-stopped

volumes:
  postgres_data:

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

### 8. Monitoring & Logging

#### Log Aggregation
```bash
# Install Promtail for Grafana Loki
wget https://github.com/grafana/loki/releases/download/v2.9.0/promtail-linux-amd64.zip
unzip promtail-linux-amd64.zip
```

#### Monitoring Setup
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'flighttrace'
    static_configs:
      - targets: ['localhost:8000']
```

### 9. Backup Strategy

#### Automated Database Backups
```bash
#!/bin/bash
# /opt/flighttrace/scripts/backup.sh

# Database backup
BACKUP_DIR="/opt/flighttrace/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="flighttrace"

# Create backup
pg_dump -U flighttrace_user $DB_NAME | gzip > "$BACKUP_DIR/db_backup_$DATE.sql.gz"

# Encrypt backup
gpg --encrypt --recipient backup@flighttrace.com "$BACKUP_DIR/db_backup_$DATE.sql.gz"
rm "$BACKUP_DIR/db_backup_$DATE.sql.gz"

# Keep only last 30 days
find $BACKUP_DIR -name "db_backup_*.sql.gz.gpg" -mtime +30 -delete

# Sync to remote storage (S3, etc.)
aws s3 sync $BACKUP_DIR s3://flighttrace-backups/ --delete
```

#### Cron Job
```bash
# Add to crontab
0 2 * * * /opt/flighttrace/scripts/backup.sh
```

### 10. Security Checklist

Before going live, ensure:

- [ ] All secrets are generated and stored securely
- [ ] SSL/TLS certificates are installed and auto-renewal configured
- [ ] Firewall rules are configured
- [ ] Database is secured with strong passwords and SSL
- [ ] Application runs as non-root user
- [ ] File permissions are restrictive
- [ ] Monitoring and alerting are configured
- [ ] Backup strategy is implemented and tested
- [ ] DDoS protection is enabled (Cloudflare)
- [ ] Security headers are properly configured
- [ ] Rate limiting is tested and working
- [ ] Error messages don't leak sensitive information
- [ ] Logs are aggregated and monitored
- [ ] Incident response plan is documented

## Post-Deployment

### Regular Security Tasks

1. **Daily**
   - Monitor security logs
   - Check for failed login attempts
   - Review rate limit violations

2. **Weekly**
   - Review security alerts
   - Check for system updates
   - Verify backup integrity

3. **Monthly**
   - Security patches update
   - SSL certificate renewal check
   - Review user access logs
   - Penetration testing (quarterly)

### Emergency Procedures

#### Suspected Breach
1. Enable Cloudflare "Under Attack" mode
2. Review access logs
3. Rotate all secrets
4. Notify users if necessary
5. Document incident

#### DDoS Attack
1. Enable Cloudflare protection
2. Increase rate limits
3. Block suspicious IPs
4. Scale infrastructure if needed

## Security Contacts

- Security Team: security@flighttrace.com
- Emergency: +1-XXX-XXX-XXXX
- Bug Bounty: bounty@flighttrace.com