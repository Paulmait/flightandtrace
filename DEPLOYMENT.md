# FlightTrace Deployment Guide

## Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 14+ (production) or SQLite (development)
- Redis 6+ (for caching and rate limiting)
- HTTPS certificate (Let's Encrypt recommended)
- Stripe account for payments

## Environment Setup

### 1. Clone and Install Dependencies

```bash
# Clone repository
git clone https://github.com/yourusername/flighttrace.git
cd flighttrace

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend setup
cd ../frontend
npm install
```

### 2. Environment Configuration

Create `.env` file in backend directory:

```bash
cp .env.example .env
```

**CRITICAL: Generate secure keys:**

```python
# Generate secure keys
import secrets
print(f"SECRET_KEY={secrets.token_urlsafe(32)}")
print(f"JWT_SECRET_KEY={secrets.token_urlsafe(32)}")
```

### 3. Database Setup

#### PostgreSQL (Production)

```sql
CREATE DATABASE flighttrace;
CREATE USER flighttrace_user WITH ENCRYPTED PASSWORD 'strong_password';
GRANT ALL PRIVILEGES ON DATABASE flighttrace TO flighttrace_user;
```

Update `.env`:
```
DATABASE_URL=postgresql://flighttrace_user:strong_password@localhost/flighttrace
```

#### Initialize Database

```bash
cd backend
python -c "from src.db.database import init_db; init_db()"
```

### 4. SSL/TLS Configuration

#### Using Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

#### Nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com; frame-src https://js.stripe.com;" always;

    # API backend
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend
    location / {
        root /var/www/flighttrace/frontend/build;
        try_files $uri $uri/ /index.html;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

## Production Deployment

### 1. Backend Deployment

#### Using Gunicorn

```bash
# Install Gunicorn
pip install gunicorn

# Create systemd service
sudo nano /etc/systemd/system/flighttrace.service
```

```ini
[Unit]
Description=FlightTrace API
After=network.target

[Service]
User=flighttrace
Group=flighttrace
WorkingDirectory=/opt/flighttrace/backend
Environment="PATH=/opt/flighttrace/backend/venv/bin"
ExecStart=/opt/flighttrace/backend/venv/bin/gunicorn \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 127.0.0.1:8000 \
    --access-logfile /var/log/flighttrace/access.log \
    --error-logfile /var/log/flighttrace/error.log \
    src.api.fastapi_app:app

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl enable flighttrace
sudo systemctl start flighttrace
```

### 2. Frontend Deployment

```bash
cd frontend

# Build production bundle
npm run build

# Copy to web server
sudo cp -r build/* /var/www/flighttrace/frontend/
```

### 3. Database Migrations

```bash
# Run Alembic migrations
cd backend
alembic upgrade head
```

### 4. Redis Setup

```bash
# Install Redis
sudo apt install redis-server

# Configure Redis (edit /etc/redis/redis.conf)
maxmemory 256mb
maxmemory-policy allkeys-lru

# Start Redis
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

### 5. Monitoring Setup

#### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'flighttrace'
    static_configs:
      - targets: ['localhost:8000']
```

#### Grafana Dashboard

Import the provided dashboard from `monitoring/grafana-dashboard.json`

## Security Hardening

### 1. Firewall Configuration

```bash
# UFW setup
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. Fail2ban Configuration

```bash
# Install fail2ban
sudo apt install fail2ban

# Create custom filter
sudo nano /etc/fail2ban/filter.d/flighttrace.conf
```

```ini
[Definition]
failregex = ^.*Failed login attempt.*IP: <HOST>.*$
ignoreregex =
```

### 3. System Security

```bash
# Disable root SSH
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config

# Enable automatic security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

## Backup and Recovery

### 1. Database Backup

```bash
# Create backup script
#!/bin/bash
BACKUP_DIR="/backup/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATABASE="flighttrace"

# Create backup
pg_dump $DATABASE | gzip > $BACKUP_DIR/backup_$TIMESTAMP.sql.gz

# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete
```

### 2. Application Backup

```bash
# Backup application data
rsync -av --exclude='venv' --exclude='__pycache__' /opt/flighttrace/ /backup/app/
```

## Monitoring and Alerts

### 1. Health Checks

```bash
# Add to crontab
*/5 * * * * curl -f https://yourdomain.com/api/health || echo "FlightTrace API is down" | mail -s "Alert: FlightTrace Down" admin@yourdomain.com
```

### 2. Log Monitoring

```bash
# Install logwatch
sudo apt install logwatch

# Configure custom service
sudo nano /etc/logwatch/conf/services/flighttrace.conf
```

## Scaling Considerations

### 1. Horizontal Scaling

- Use Redis for session storage
- Implement database read replicas
- Use CDN for static assets
- Consider container orchestration (Kubernetes)

### 2. Performance Optimization

- Enable Gzip compression
- Implement caching headers
- Use database connection pooling
- Optimize database queries

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check DATABASE_URL in .env
   - Verify PostgreSQL is running
   - Check firewall rules

2. **Stripe Webhook Failures**
   - Verify webhook secret
   - Check SSL certificate
   - Review Stripe logs

3. **High Memory Usage**
   - Check for memory leaks
   - Adjust worker processes
   - Monitor Redis memory

### Debug Mode

**WARNING: Never enable in production!**

```python
# For debugging only
DEBUG=True
```

## Maintenance

### Regular Tasks

1. **Daily**
   - Check application logs
   - Monitor disk space
   - Verify backups

2. **Weekly**
   - Review security logs
   - Update dependencies
   - Check SSL certificate expiry

3. **Monthly**
   - Performance analysis
   - Security audit
   - Database optimization

## Support

- Documentation: https://docs.flighttrace.com
- Issues: https://github.com/yourusername/flighttrace/issues
- Security: security@flighttrace.com

---

**Important**: Always test deployments in staging environment first!