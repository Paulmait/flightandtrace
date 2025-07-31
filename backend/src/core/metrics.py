"""
Prometheus metrics collection for FlightTrace
"""

from prometheus_client import Counter, Histogram, Gauge, Info, generate_latest
from prometheus_client import CONTENT_TYPE_LATEST
from fastapi import Response
from functools import wraps
import time
from datetime import datetime
import psutil
import logging

logger = logging.getLogger(__name__)

# API Metrics
http_requests_total = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

http_request_duration_seconds = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint']
)

active_requests = Gauge(
    'http_requests_active',
    'Number of active HTTP requests'
)

# WebSocket Metrics
websocket_connections = Gauge(
    'websocket_active_connections',
    'Number of active WebSocket connections'
)

websocket_messages_total = Counter(
    'websocket_messages_total',
    'Total WebSocket messages',
    ['direction', 'type']
)

# Business Metrics
flight_updates_total = Counter(
    'flight_updates_total',
    'Total flight updates processed',
    ['tail_number', 'status']
)

active_flights_tracked = Gauge(
    'active_flights_tracked',
    'Number of actively tracked flights'
)

predictions_generated = Counter(
    'predictions_generated_total',
    'Total predictions generated',
    ['type', 'confidence_level']
)

notification_sent = Counter(
    'notifications_sent_total',
    'Total notifications sent',
    ['channel', 'type', 'status']
)

# User Metrics
active_users = Gauge(
    'active_users_total',
    'Number of active users',
    ['plan']
)

user_registrations = Counter(
    'user_registrations_total',
    'Total user registrations'
)

authentication_attempts = Counter(
    'authentication_attempts_total',
    'Total authentication attempts',
    ['method', 'status']
)

authentication_failures = Counter(
    'authentication_failures_total',
    'Total authentication failures',
    ['reason']
)

# Payment Metrics
payment_attempts = Counter(
    'payment_attempts_total',
    'Total payment attempts',
    ['plan', 'status']
)

payment_failures = Counter(
    'payment_failures_total',
    'Total payment failures',
    ['plan', 'reason']
)

subscription_changes = Counter(
    'subscription_changes_total',
    'Total subscription changes',
    ['from_plan', 'to_plan', 'action']
)

revenue_total = Counter(
    'revenue_total_cents',
    'Total revenue in cents',
    ['plan', 'country']
)

# System Metrics
database_connections = Gauge(
    'database_connections_active',
    'Active database connections'
)

database_connection_pool_exhausted = Counter(
    'database_connection_pool_exhausted_total',
    'Times connection pool was exhausted'
)

database_query_duration = Histogram(
    'database_query_duration_seconds',
    'Database query duration',
    ['query_type', 'table']
)

cache_hits = Counter(
    'cache_hits_total',
    'Cache hits',
    ['cache_name']
)

cache_misses = Counter(
    'cache_misses_total',
    'Cache misses',
    ['cache_name']
)

# Security Metrics
rate_limit_exceeded = Counter(
    'rate_limit_exceeded_total',
    'Rate limit exceeded events',
    ['endpoint', 'user_type']
)

suspicious_activity = Counter(
    'api_requests_suspicious_total',
    'Suspicious API requests detected',
    ['type', 'action_taken']
)

# Flight Data Metrics
flight_data_last_update = Gauge(
    'flight_data_last_update_timestamp',
    'Timestamp of last flight data update'
)

flight_data_sources = Info(
    'flight_data_sources',
    'Flight data source information'
)

# SSL Certificate Metrics
ssl_certificate_expiry = Gauge(
    'ssl_certificate_expiry_days',
    'Days until SSL certificate expires',
    ['domain']
)

# Application Info
app_info = Info(
    'flighttrace_app',
    'FlightTrace application information'
)

app_info.info({
    'version': '1.0.0',
    'environment': 'production',
    'start_time': datetime.utcnow().isoformat()
})

def track_request_metrics(func):
    """Decorator to track HTTP request metrics"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        active_requests.inc()
        start_time = time.time()
        
        try:
            response = await func(*args, **kwargs)
            status = getattr(response, 'status_code', 200)
            return response
        except Exception as e:
            status = 500
            raise
        finally:
            duration = time.time() - start_time
            
            # Extract endpoint from request
            request = kwargs.get('request')
            if request:
                endpoint = request.url.path
                method = request.method
            else:
                endpoint = 'unknown'
                method = 'unknown'
            
            http_requests_total.labels(
                method=method,
                endpoint=endpoint,
                status=status
            ).inc()
            
            http_request_duration_seconds.labels(
                method=method,
                endpoint=endpoint
            ).observe(duration)
            
            active_requests.dec()
    
    return wrapper

def track_database_query(query_type: str, table: str):
    """Context manager to track database query metrics"""
    class QueryTracker:
        def __enter__(self):
            self.start_time = time.time()
            database_connections.inc()
            return self
        
        def __exit__(self, exc_type, exc_val, exc_tb):
            duration = time.time() - self.start_time
            database_query_duration.labels(
                query_type=query_type,
                table=table
            ).observe(duration)
            database_connections.dec()
    
    return QueryTracker()

def update_system_metrics():
    """Update system-level metrics"""
    try:
        # CPU and Memory
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Update Prometheus metrics (these would be custom gauges)
        # Note: These are typically handled by node_exporter in production
        
        # Update flight data timestamp
        flight_data_last_update.set(time.time())
        
    except Exception as e:
        logger.error(f"Error updating system metrics: {e}")

def track_flight_update(tail_number: str, status: str):
    """Track flight update metrics"""
    flight_updates_total.labels(
        tail_number=tail_number,
        status=status
    ).inc()

def track_prediction(prediction_type: str, confidence: float):
    """Track prediction generation"""
    confidence_level = 'high' if confidence > 0.8 else 'medium' if confidence > 0.5 else 'low'
    predictions_generated.labels(
        type=prediction_type,
        confidence_level=confidence_level
    ).inc()

def track_notification(channel: str, notification_type: str, success: bool):
    """Track notification metrics"""
    notification_sent.labels(
        channel=channel,
        type=notification_type,
        status='success' if success else 'failed'
    ).inc()

def track_authentication(method: str, success: bool, failure_reason: str = None):
    """Track authentication metrics"""
    authentication_attempts.labels(
        method=method,
        status='success' if success else 'failed'
    ).inc()
    
    if not success and failure_reason:
        authentication_failures.labels(reason=failure_reason).inc()

def track_payment(plan: str, success: bool, failure_reason: str = None, amount_cents: int = 0):
    """Track payment metrics"""
    payment_attempts.labels(
        plan=plan,
        status='success' if success else 'failed'
    ).inc()
    
    if not success and failure_reason:
        payment_failures.labels(
            plan=plan,
            reason=failure_reason
        ).inc()
    elif success and amount_cents > 0:
        revenue_total.labels(
            plan=plan,
            country='US'  # Would be determined from payment data
        ).inc(amount_cents)

def track_subscription_change(from_plan: str, to_plan: str, action: str):
    """Track subscription changes"""
    subscription_changes.labels(
        from_plan=from_plan,
        to_plan=to_plan,
        action=action
    ).inc()

def track_rate_limit(endpoint: str, user_type: str = 'anonymous'):
    """Track rate limit violations"""
    rate_limit_exceeded.labels(
        endpoint=endpoint,
        user_type=user_type
    ).inc()

def track_suspicious_activity(activity_type: str, action: str = 'logged'):
    """Track suspicious activity"""
    suspicious_activity.labels(
        type=activity_type,
        action_taken=action
    ).inc()

def track_cache_access(cache_name: str, hit: bool):
    """Track cache access"""
    if hit:
        cache_hits.labels(cache_name=cache_name).inc()
    else:
        cache_misses.labels(cache_name=cache_name).inc()

# Metrics endpoint
async def metrics_endpoint():
    """Generate Prometheus metrics"""
    # Update system metrics before serving
    update_system_metrics()
    
    # Generate metrics
    metrics = generate_latest()
    
    return Response(
        content=metrics,
        media_type=CONTENT_TYPE_LATEST
    )

# Custom metrics endpoint with additional business metrics
async def custom_metrics_endpoint(include: list = None):
    """Generate custom business metrics"""
    from src.db.database import get_connection
    
    metrics_data = {}
    
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        if not include or 'flights' in include:
            # Active flights
            cursor.execute("SELECT COUNT(*) FROM flight_states WHERE status = 'airborne'")
            active_flights_tracked.set(cursor.fetchone()[0])
        
        if not include or 'users' in include:
            # Active users by plan
            cursor.execute("""
                SELECT s.plan, COUNT(DISTINCT u.user_id)
                FROM users u
                JOIN subscriptions s ON u.user_id = s.user_id
                WHERE s.status = 'active'
                GROUP BY s.plan
            """)
            for plan, count in cursor.fetchall():
                active_users.labels(plan=plan).set(count)
        
        if not include or 'websockets' in include:
            # This would be updated by the WebSocket manager
            pass
        
        conn.close()
        
    except Exception as e:
        logger.error(f"Error generating custom metrics: {e}")
    
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )