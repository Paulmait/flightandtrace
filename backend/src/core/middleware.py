# Security Middleware for FastAPI
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains; preload'
        response.headers['Content-Security-Policy'] = "default-src 'self'"
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response.headers['Permissions-Policy'] = 'geolocation=(self)'
        return response

# Example rate limiting middleware (simple, for demo)
from starlette.requests import Request
from starlette.status import HTTP_429_TOO_MANY_REQUESTS
import time

RATE_LIMIT = 100  # requests per minute
rate_limit_cache = {}

class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        ip = request.client.host
        now = int(time.time() / 60)
        key = f"{ip}:{now}"
        count = rate_limit_cache.get(key, 0)
        if count >= RATE_LIMIT:
            return Response("Too Many Requests", status_code=HTTP_429_TOO_MANY_REQUESTS)
        rate_limit_cache[key] = count + 1
        return await call_next(request)
