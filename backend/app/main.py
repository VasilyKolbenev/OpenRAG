"""
OPENRAG PLATFORM -> Application Factory
FastAPI application with a focused two-engine RAG product surface.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from app.config import settings
from app.middleware.logging import RequestLoggingMiddleware, setup_logging
from app.middleware.rate_limit import RateLimitMiddleware

logger = logging.getLogger("openrag")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle -> initialize and cleanup services."""
    setup_logging()
    logger.info("Starting OpenRAG Platform...")

    from app.services.cache import RedisService
    from app.services.embedding import EmbeddingService
    from app.services.graph_store import Neo4jService
    from app.services.llm import LLMService
    from app.services.tracing import TracingService
    from app.services.vector_store import QdrantService
    from app.strategies.factory import StrategyFactory

    cache = RedisService()
    await cache.initialize()
    app.state.cache = cache

    embedding = EmbeddingService()
    await embedding.initialize()
    app.state.embedding_service = embedding

    vector_store = QdrantService()
    await vector_store.initialize()
    app.state.vector_store = vector_store

    graph_store = Neo4jService()
    try:
        await graph_store.initialize()
    except Exception as exc:
        logger.warning("Neo4j unavailable (GraphRAG degraded): %s", exc)
    app.state.graph_store = graph_store

    llm = LLMService()
    app.state.llm_service = llm

    tracing = TracingService(cache=cache)
    app.state.tracing_service = tracing

    factory = StrategyFactory(
        embedding_service=embedding,
        llm_service=llm,
        vector_store=vector_store,
        graph_store=graph_store,
        cache=cache,
    )
    app.state.strategy_factory = factory

    logger.info("All services initialized")
    yield

    logger.info("Shutting down OpenRAG Platform...")
    await vector_store.close()
    await graph_store.close()
    await cache.close()
    from app.models.base import close_db

    await close_db()


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="OpenRAG",
        description="Focused self-hosted RAG platform built around LightRAG and GraphRAG",
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_url],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["*"],
        max_age=3600,
    )

    app.add_middleware(RateLimitMiddleware)
    app.add_middleware(RequestLoggingMiddleware)

    if settings.multi_tenancy_enabled:
        from app.middleware.tenant import TenantMiddleware

        app.add_middleware(TenantMiddleware)

    if settings.is_production:
        app.add_middleware(
            TrustedHostMiddleware,
            allowed_hosts=[settings.domain],
        )

    from app.middleware.telemetry import setup_telemetry

    setup_telemetry(app)

    from app.api.router import api_router

    app.include_router(api_router)
    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        workers=4,
        log_level=settings.log_level,
        access_log=True,
    )
