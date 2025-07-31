#!/bin/bash

# FlightTrace Monitoring Setup Script
# Sets up comprehensive monitoring stack

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}FlightTrace Monitoring Setup${NC}"
echo "============================"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}This script must be run as root${NC}" 
   exit 1
fi

# Check Docker installation
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Installing Docker...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}Installing Docker Compose...${NC}"
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Create monitoring directory structure
echo -e "${BLUE}Creating monitoring directory structure...${NC}"
mkdir -p /opt/flighttrace/monitoring/{prometheus,grafana,alertmanager,loki,alerts}
mkdir -p /opt/flighttrace/monitoring/grafana/{dashboards,datasources}

cd /opt/flighttrace/monitoring

# Copy monitoring configurations
echo -e "${BLUE}Copying monitoring configurations...${NC}"
cp ~/flighttrace/monitoring/* . 2>/dev/null || true
cp -r ~/flighttrace/monitoring/alerts ./alerts/ 2>/dev/null || true

# Create Grafana datasources configuration
cat > grafana/datasources/datasources.yml << EOF
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true

  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    editable: true

  - name: AlertManager
    type: alertmanager
    access: proxy
    url: http://alertmanager:9093
    editable: true
EOF

# Create FlightTrace Grafana Dashboard
cat > grafana/dashboards/flighttrace-dashboard.json << 'EOF'
{
  "dashboard": {
    "id": null,
    "title": "FlightTrace Operations Dashboard",
    "timezone": "browser",
    "schemaVersion": 30,
    "version": 1,
    "panels": [
      {
        "title": "API Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{endpoint}}"
          }
        ],
        "gridPos": {"x": 0, "y": 0, "w": 12, "h": 8},
        "type": "graph"
      },
      {
        "title": "Active WebSocket Connections",
        "targets": [
          {
            "expr": "websocket_active_connections"
          }
        ],
        "gridPos": {"x": 12, "y": 0, "w": 12, "h": 8},
        "type": "graph"
      },
      {
        "title": "Active Flights Tracked",
        "targets": [
          {
            "expr": "active_flights_tracked"
          }
        ],
        "gridPos": {"x": 0, "y": 8, "w": 8, "h": 6},
        "type": "stat"
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m]) / rate(http_requests_total[5m])"
          }
        ],
        "gridPos": {"x": 8, "y": 8, "w": 8, "h": 6},
        "type": "stat"
      },
      {
        "title": "95th Percentile Response Time",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
          }
        ],
        "gridPos": {"x": 16, "y": 8, "w": 8, "h": 6},
        "type": "stat"
      }
    ]
  }
}
EOF

# Create Loki configuration
cat > loki-config.yml << EOF
auth_enabled: false

server:
  http_listen_port: 3100

ingester:
  lifecycler:
    address: 127.0.0.1
    ring:
      kvstore:
        store: inmemory
      replication_factor: 1
    final_sleep: 0s

schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

storage_config:
  boltdb_shipper:
    active_index_directory: /loki/boltdb-shipper-active
    cache_location: /loki/boltdb-shipper-cache
    cache_ttl: 24h
    shared_store: filesystem
  filesystem:
    directory: /loki/chunks

compactor:
  working_directory: /loki/boltdb-shipper-compactor
  shared_store: filesystem

limits_config:
  enforce_metric_name: false
  reject_old_samples: true
  reject_old_samples_max_age: 168h
EOF

# Create Promtail configuration
cat > promtail-config.yml << EOF
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: system
    static_configs:
      - targets:
          - localhost
        labels:
          job: varlogs
          __path__: /var/log/*log

  - job_name: flighttrace
    static_configs:
      - targets:
          - localhost
        labels:
          job: flighttrace
          __path__: /var/log/flighttrace/*.log

  - job_name: nginx
    static_configs:
      - targets:
          - localhost
        labels:
          job: nginx
          __path__: /var/log/nginx/*.log
EOF

# Create monitoring environment file
cat > .env << EOF
GRAFANA_ADMIN_PASSWORD=$(openssl rand -base64 32)
PROMETHEUS_RETENTION=30d
LOKI_RETENTION=7d
EOF

# Set permissions
chmod 600 .env
chown -R 1000:1000 grafana/

# Create uptime monitoring configuration
echo -e "${BLUE}Setting up uptime monitoring...${NC}"
cat > uptime-kuma-config.json << EOF
{
  "monitors": [
    {
      "name": "FlightTrace API",
      "url": "https://api.flighttrace.com/health",
      "method": "GET",
      "interval": 60,
      "retryInterval": 20,
      "maxretries": 3
    },
    {
      "name": "FlightTrace Website",
      "url": "https://flighttrace.com",
      "method": "GET",
      "interval": 300,
      "retryInterval": 60,
      "maxretries": 3
    },
    {
      "name": "WebSocket Service",
      "url": "wss://api.flighttrace.com/ws",
      "method": "WEBSOCKET",
      "interval": 120,
      "retryInterval": 30,
      "maxretries": 2
    }
  ]
}
EOF

# Start monitoring stack
echo -e "${BLUE}Starting monitoring stack...${NC}"
docker-compose -f docker-compose.monitoring.yml up -d

# Wait for services to start
echo -e "${YELLOW}Waiting for services to start...${NC}"
sleep 30

# Configure Grafana
echo -e "${BLUE}Configuring Grafana...${NC}"
GRAFANA_PASS=$(grep GRAFANA_ADMIN_PASSWORD .env | cut -d'=' -f2)

# Import dashboards
curl -X POST http://admin:${GRAFANA_PASS}@localhost:3000/api/dashboards/db \
  -H "Content-Type: application/json" \
  -d @grafana/dashboards/flighttrace-dashboard.json

# Create API key for monitoring
GRAFANA_API_KEY=$(curl -X POST http://admin:${GRAFANA_PASS}@localhost:3000/api/auth/keys \
  -H "Content-Type: application/json" \
  -d '{"name":"monitoring-api","role":"Viewer"}' | jq -r '.key')

echo "GRAFANA_API_KEY=$GRAFANA_API_KEY" >> .env

# Set up backup script
cat > /usr/local/bin/backup-monitoring.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/monitoring/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# Backup Prometheus data
docker run --rm -v prometheus_data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/prometheus.tar.gz -C /data .

# Backup Grafana data
docker run --rm -v grafana_data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/grafana.tar.gz -C /data .

# Keep only last 7 days of backups
find /backups/monitoring -type d -mtime +7 -exec rm -rf {} \;
EOF

chmod +x /usr/local/bin/backup-monitoring.sh

# Add to crontab
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-monitoring.sh") | crontab -

# Create monitoring check script
cat > /usr/local/bin/check-monitoring.sh << 'EOF'
#!/bin/bash

services=("prometheus" "grafana" "alertmanager" "loki" "promtail" "uptime-kuma")
failed=0

for service in "${services[@]}"; do
    if ! docker ps | grep -q "flighttrace-$service"; then
        echo "ERROR: $service is not running"
        ((failed++))
    fi
done

if [ $failed -eq 0 ]; then
    echo "All monitoring services are running"
    exit 0
else
    echo "$failed monitoring services are down"
    exit 1
fi
EOF

chmod +x /usr/local/bin/check-monitoring.sh

# Display access information
echo
echo "======================================"
echo -e "${GREEN}Monitoring stack deployed successfully!${NC}"
echo "======================================"
echo
echo "Access URLs:"
echo -e "${YELLOW}Grafana:${NC} http://localhost:3000"
echo -e "  Username: admin"
echo -e "  Password: $GRAFANA_PASS"
echo
echo -e "${YELLOW}Prometheus:${NC} http://localhost:9090"
echo -e "${YELLOW}AlertManager:${NC} http://localhost:9093"
echo -e "${YELLOW}Uptime Kuma:${NC} http://localhost:3001"
echo
echo "Commands:"
echo -e "${BLUE}View logs:${NC} docker-compose -f docker-compose.monitoring.yml logs -f"
echo -e "${BLUE}Check status:${NC} /usr/local/bin/check-monitoring.sh"
echo -e "${BLUE}Backup data:${NC} /usr/local/bin/backup-monitoring.sh"
echo
echo -e "${GREEN}Next steps:${NC}"
echo "1. Configure AlertManager with your notification channels"
echo "2. Set up Uptime Kuma monitors through the web interface"
echo "3. Create custom Grafana dashboards as needed"
echo "4. Configure your application to expose metrics to Prometheus"

# Create systemd service for monitoring health check
cat > /etc/systemd/system/flighttrace-monitoring-check.service << EOF
[Unit]
Description=FlightTrace Monitoring Health Check
After=docker.service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/check-monitoring.sh
StandardOutput=journal
EOF

cat > /etc/systemd/system/flighttrace-monitoring-check.timer << EOF
[Unit]
Description=Run FlightTrace monitoring check every 5 minutes

[Timer]
OnBootSec=5min
OnUnitActiveSec=5min

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable flighttrace-monitoring-check.timer
systemctl start flighttrace-monitoring-check.timer

echo
echo -e "${GREEN}Monitoring health checks enabled${NC}"