"""
Health check endpoints.
"""

import asyncio
from datetime import datetime

from fastapi import APIRouter, Request

from app.schemas.metrics import HealthResponse

router = APIRouter(tags=["health"])

# Short per-service timeout so a stale dependency does not block the UI.
SERVICE_HEALTH_TIMEOUT_SECONDS = 1.5


@router.get("/health", response_model=HealthResponse)
async def health_check(request: Request):
    """Health check endpoint with real service connectivity checks (bounded)."""
    app = request.app
    services = {"api": "healthy"}

    # Check each service with a tight timeout — a hung Neo4j must not block the UI.
    for name, check_fn in [
        ("vector_store", lambda: app.state.vector_store.health_check()),
        ("graph_store", lambda: app.state.graph_store.health_check()),
        ("cache", lambda: app.state.cache.health_check()),
    ]:
        try:
            is_healthy = await asyncio.wait_for(
                check_fn(), timeout=SERVICE_HEALTH_TIMEOUT_SECONDS,
            )
            services[name] = "healthy" if is_healthy else "unhealthy"
        except Exception:
            services[name] = "unhealthy"

    # Check database (also bounded)
    try:
        from app.models.base import engine
        from sqlalchemy import text

        async def _db_probe():
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))

        await asyncio.wait_for(_db_probe(), timeout=SERVICE_HEALTH_TIMEOUT_SECONDS)
        services["database"] = "healthy"
    except Exception:
        services["database"] = "unhealthy"

    # graph_store is optional — degraded != offline product
    required = {k: v for k, v in services.items() if k != "graph_store"}
    overall = "healthy" if all(v == "healthy" for v in required.values()) else "degraded"

    return HealthResponse(
        status=overall,
        version="1.0.0",
        services=services,
        timestamp=datetime.utcnow().isoformat(),
    )


@router.get("/readyz")
async def readiness_check():
    """Kubernetes-style readiness probe."""
    return {"status": "ready"}
