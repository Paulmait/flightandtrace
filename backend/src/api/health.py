"""
FlightTrace Health Check API

Provides health check endpoints for monitoring service status.
"""

import os
import time
import asyncio
from datetime import datetime
from typing import Dict, Any, Optional

from fastapi import APIRouter, Response, status
from pydantic import BaseModel

# Initialize router
router = APIRouter()

# Track service start time
SERVICE_START_TIME = time.time()
VERSION = os.getenv("APP_VERSION", "1.0.0")
ENVIRONMENT = os.getenv("APP_ENV", "production")


class HealthStatus(BaseModel):
    """Health status response model"""
    status: str
    version: str
    environment: str
    timestamp: str
    uptime_seconds: float
    checks: Dict[str, Dict[str, Any]]


class ComponentHealth(BaseModel):
    """Individual component health"""
    status: str
    latency_ms: Optional[float] = None
    error: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


async def check_database() -> ComponentHealth:
    """Check database connectivity"""
    start = time.time()
    try:
        # Import database module
        from src.db.database import get_database_pool

        pool = await get_database_pool()
        if pool:
            # Execute simple query
            async with pool.acquire() as conn:
                await conn.fetchval("SELECT 1")

            latency = (time.time() - start) * 1000
            return ComponentHealth(
                status="healthy",
                latency_ms=round(latency, 2),
                details={"connection_pool": "active"}
            )
        else:
            return ComponentHealth(
                status="unhealthy",
                error="Database pool not initialized"
            )
    except Exception as e:
        latency = (time.time() - start) * 1000
        return ComponentHealth(
            status="unhealthy",
            latency_ms=round(latency, 2),
            error=str(e)
        )


async def check_redis() -> ComponentHealth:
    """Check Redis connectivity"""
    start = time.time()
    try:
        from src.core.cache import get_redis_client

        redis = await get_redis_client()
        if redis:
            await redis.ping()
            latency = (time.time() - start) * 1000
            return ComponentHealth(
                status="healthy",
                latency_ms=round(latency, 2)
            )
        else:
            return ComponentHealth(
                status="degraded",
                error="Redis not configured",
                details={"note": "Service operates without cache"}
            )
    except Exception as e:
        latency = (time.time() - start) * 1000
        return ComponentHealth(
            status="degraded",
            latency_ms=round(latency, 2),
            error=str(e),
            details={"note": "Service operates without cache"}
        )


async def check_opensky() -> ComponentHealth:
    """Check OpenSky API connectivity"""
    start = time.time()
    try:
        import httpx

        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                "https://opensky-network.org/api/states/all",
                params={"lamin": 45, "lomin": -125, "lamax": 46, "lomax": -124}
            )
            latency = (time.time() - start) * 1000

            if response.status_code == 200:
                return ComponentHealth(
                    status="healthy",
                    latency_ms=round(latency, 2)
                )
            elif response.status_code == 429:
                return ComponentHealth(
                    status="degraded",
                    latency_ms=round(latency, 2),
                    error="Rate limited",
                    details={"status_code": response.status_code}
                )
            else:
                return ComponentHealth(
                    status="unhealthy",
                    latency_ms=round(latency, 2),
                    error=f"HTTP {response.status_code}"
                )
    except Exception as e:
        latency = (time.time() - start) * 1000
        return ComponentHealth(
            status="unhealthy",
            latency_ms=round(latency, 2),
            error=str(e)
        )


async def check_stripe() -> ComponentHealth:
    """Check Stripe API connectivity"""
    start = time.time()
    try:
        import stripe

        stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
        if not stripe.api_key:
            return ComponentHealth(
                status="degraded",
                error="Stripe not configured",
                details={"note": "Payment processing unavailable"}
            )

        # Verify API key with a simple call
        await asyncio.to_thread(stripe.Balance.retrieve)
        latency = (time.time() - start) * 1000

        return ComponentHealth(
            status="healthy",
            latency_ms=round(latency, 2)
        )
    except Exception as e:
        latency = (time.time() - start) * 1000
        return ComponentHealth(
            status="degraded",
            latency_ms=round(latency, 2),
            error=str(e)
        )


@router.get("/health", response_model=HealthStatus, tags=["Health"])
async def health_check(response: Response) -> HealthStatus:
    """
    Comprehensive health check endpoint.

    Returns status of all service dependencies.
    HTTP 200 if service is healthy or degraded.
    HTTP 503 if service is unhealthy.
    """
    # Run all health checks concurrently
    db_check, redis_check, opensky_check, stripe_check = await asyncio.gather(
        check_database(),
        check_redis(),
        check_opensky(),
        check_stripe(),
        return_exceptions=True
    )

    # Handle exceptions
    def safe_result(result):
        if isinstance(result, Exception):
            return ComponentHealth(status="unhealthy", error=str(result))
        return result

    checks = {
        "database": safe_result(db_check).dict(),
        "redis": safe_result(redis_check).dict(),
        "opensky": safe_result(opensky_check).dict(),
        "stripe": safe_result(stripe_check).dict(),
    }

    # Determine overall status
    statuses = [check["status"] for check in checks.values()]

    if "unhealthy" in statuses:
        # Check if critical services are unhealthy
        if checks["database"]["status"] == "unhealthy":
            overall_status = "unhealthy"
            response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        else:
            overall_status = "degraded"
    elif "degraded" in statuses:
        overall_status = "degraded"
    else:
        overall_status = "healthy"

    uptime = time.time() - SERVICE_START_TIME

    return HealthStatus(
        status=overall_status,
        version=VERSION,
        environment=ENVIRONMENT,
        timestamp=datetime.utcnow().isoformat() + "Z",
        uptime_seconds=round(uptime, 2),
        checks=checks
    )


@router.get("/health/live", tags=["Health"])
async def liveness_probe():
    """
    Kubernetes liveness probe.

    Returns 200 if the service is running.
    Used to determine if container should be restarted.
    """
    return {"status": "alive", "timestamp": datetime.utcnow().isoformat() + "Z"}


@router.get("/health/ready", tags=["Health"])
async def readiness_probe(response: Response):
    """
    Kubernetes readiness probe.

    Returns 200 if the service is ready to accept traffic.
    Returns 503 if critical dependencies are unavailable.
    """
    # Check database only (critical dependency)
    db_health = await check_database()

    if db_health.status == "unhealthy":
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {
            "status": "not_ready",
            "reason": "Database unavailable",
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }

    return {
        "status": "ready",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.get("/health/startup", tags=["Health"])
async def startup_probe(response: Response):
    """
    Kubernetes startup probe.

    Returns 200 once the service has fully started.
    Used to delay liveness/readiness checks during startup.
    """
    # Check if minimum services are available
    db_health = await check_database()

    if db_health.status == "unhealthy":
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {
            "status": "starting",
            "reason": "Waiting for database",
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }

    return {
        "status": "started",
        "uptime_seconds": round(time.time() - SERVICE_START_TIME, 2),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.get("/version", tags=["Health"])
async def get_version():
    """
    Returns service version information.
    """
    return {
        "version": VERSION,
        "environment": ENVIRONMENT,
        "build_time": os.getenv("BUILD_TIME", "unknown"),
        "commit_sha": os.getenv("COMMIT_SHA", "unknown"),
    }
