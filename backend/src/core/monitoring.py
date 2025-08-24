# Monitoring and Alerting Integration (Sentry, Prometheus)
import sentry_sdk
from prometheus_client import Counter, Histogram, generate_latest
from fastapi import APIRouter, Request
from starlette.responses import Response

sentry_sdk.init(dsn="YOUR_SENTRY_DSN")

REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint'])
REQUEST_LATENCY = Histogram('http_request_duration_seconds', 'HTTP request latency', ['endpoint'])

router = APIRouter()

@router.middleware('http')
async def prometheus_metrics(request: Request, call_next):
    REQUEST_COUNT.labels(request.method, request.url.path).inc()
    with REQUEST_LATENCY.labels(request.url.path).time():
        response = await call_next(request)
    return response

@router.get('/metrics')
def metrics():
    return Response(generate_latest(), media_type='text/plain')
