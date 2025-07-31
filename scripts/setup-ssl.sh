#!/bin/bash

# FlightTrace SSL/TLS Setup Script
# Automates SSL certificate setup with Let's Encrypt

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOMAIN=${1:-"flighttrace.com"}
EMAIL=${2:-"admin@flighttrace.com"}
NGINX_CONF="/etc/nginx/sites-available/flighttrace"
NGINX_ENABLED="/etc/nginx/sites-enabled/flighttrace"

echo -e "${GREEN}FlightTrace SSL/TLS Setup${NC}"
echo "================================"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}This script must be run as root${NC}" 
   exit 1
fi

# Update system
echo -e "${YELLOW}Updating system packages...${NC}"
apt-get update -y
apt-get upgrade -y

# Install required packages
echo -e "${YELLOW}Installing required packages...${NC}"
apt-get install -y nginx certbot python3-certbot-nginx ufw

# Configure firewall
echo -e "${YELLOW}Configuring firewall...${NC}"
ufw --force enable
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 'Nginx Full'
ufw reload

# Create nginx configuration
echo -e "${YELLOW}Creating Nginx configuration...${NC}"
cat > $NGINX_CONF << EOF
# HTTP redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;
    
    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    # Redirect all HTTP to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;
    
    # SSL certificates (will be added by certbot)
    # ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_session_tickets off;
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.stripe.com wss://$DOMAIN; frame-src https://js.stripe.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
    
    # Logging
    access_log /var/log/nginx/flighttrace_access.log;
    error_log /var/log/nginx/flighttrace_error.log;
    
    # Root directory
    root /var/www/flighttrace/frontend/build;
    index index.html;
    
    # API proxy
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # WebSocket support
    location /ws {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # WebSocket timeout
        proxy_read_timeout 86400;
    }
    
    # Static files
    location / {
        try_files \$uri \$uri/ /index.html;
        expires 1d;
        add_header Cache-Control "public, immutable";
    }
    
    # Service worker
    location /service-worker.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
    
    # Favicon
    location = /favicon.ico {
        log_not_found off;
        access_log off;
    }
    
    # Robots.txt
    location = /robots.txt {
        log_not_found off;
        access_log off;
    }
    
    # Block access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
EOF

# Enable the site
ln -sf $NGINX_CONF $NGINX_ENABLED

# Test nginx configuration
echo -e "${YELLOW}Testing Nginx configuration...${NC}"
nginx -t

# Reload nginx
echo -e "${YELLOW}Reloading Nginx...${NC}"
systemctl reload nginx

# Create webroot for Let's Encrypt
mkdir -p /var/www/certbot

# Obtain SSL certificate
echo -e "${YELLOW}Obtaining SSL certificate from Let's Encrypt...${NC}"
certbot certonly --webroot -w /var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    -d $DOMAIN \
    -d www.$DOMAIN

# Update nginx config with SSL paths
echo -e "${YELLOW}Updating Nginx configuration with SSL certificates...${NC}"
certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive

# Set up auto-renewal
echo -e "${YELLOW}Setting up automatic certificate renewal...${NC}"
cat > /etc/systemd/system/certbot-renewal.service << EOF
[Unit]
Description=Certbot Renewal
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/bin/certbot renew --quiet --post-hook "systemctl reload nginx"
EOF

cat > /etc/systemd/system/certbot-renewal.timer << EOF
[Unit]
Description=Run certbot renewal twice daily

[Timer]
OnCalendar=*-*-* 00,12:00:00
RandomizedDelaySec=3600
Persistent=true

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable certbot-renewal.timer
systemctl start certbot-renewal.timer

# Create DH parameters for additional security
echo -e "${YELLOW}Generating DH parameters (this may take a while)...${NC}"
openssl dhparam -out /etc/ssl/certs/dhparam.pem 2048

# Update nginx config to use DH params
sed -i '/ssl_prefer_server_ciphers/a ssl_dhparam /etc/ssl/certs/dhparam.pem;' $NGINX_CONF

# Final nginx reload
systemctl reload nginx

# Test SSL configuration
echo -e "${YELLOW}Testing SSL configuration...${NC}"
curl -I https://$DOMAIN

# Display SSL Labs test URL
echo -e "${GREEN}SSL/TLS setup complete!${NC}"
echo "================================"
echo -e "Test your SSL configuration at:"
echo -e "${YELLOW}https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN${NC}"
echo ""
echo -e "Certificate renewal is automated and will run twice daily."
echo -e "Check renewal timer status with: ${YELLOW}systemctl status certbot-renewal.timer${NC}"
echo ""
echo -e "${GREEN}Security Headers Report:${NC}"
echo -e "https://securityheaders.com/?q=$DOMAIN"

# Create monitoring script
cat > /usr/local/bin/check-ssl-expiry.sh << 'EOF'
#!/bin/bash
DOMAIN="$1"
DAYS_WARNING=30

expiry_date=$(echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)
expiry_epoch=$(date -d "$expiry_date" +%s)
current_epoch=$(date +%s)
days_left=$(( ($expiry_epoch - $current_epoch) / 86400 ))

if [ $days_left -lt $DAYS_WARNING ]; then
    echo "WARNING: SSL certificate for $DOMAIN expires in $days_left days"
    # Send alert email or notification
fi

echo "SSL certificate for $DOMAIN expires in $days_left days"
EOF

chmod +x /usr/local/bin/check-ssl-expiry.sh

# Add SSL monitoring to crontab
(crontab -l 2>/dev/null; echo "0 9 * * * /usr/local/bin/check-ssl-expiry.sh $DOMAIN") | crontab -

echo -e "${GREEN}SSL monitoring script installed.${NC}"
echo -e "Check certificate expiry with: ${YELLOW}/usr/local/bin/check-ssl-expiry.sh $DOMAIN${NC}"