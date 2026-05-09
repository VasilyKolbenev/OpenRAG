"""
OpenRAG Platform — Application Factory
FastAPI application with multi-strategy RAG support.
"""

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from openrag.config import settings
from openrag.middleware.logging import RequestLoggingMiddleware, setup_logging
from openrag.middleware.rate_limit import RateLimitMiddleware

logger = logging.getLogger("openrag")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle — initialize and cleanup services."""
    setup_logging()
    logger.info("Starting OpenRAG Platform...")

    # Initialize services
    from openrag.tools.cache import RedisService
    from openrag.engine.embedding import EmbeddingService
    from openrag.tools.graph_store import Neo4jService
    from openrag.engine.llm import LLMService
    from openrag.tools.tracing import TracingService
    from openrag.tools.vector_store import QdrantService
    from openrag.intelligence.factory import StrategyFactory

    # Cache (Redis)
    cache = RedisService()
    await cache.initialize()
    app.state.cache = cache

    # Embedding
    embedding = EmbeddingService()
    await embedding.initialize()
    app.state.embedding_service = embedding

    # Vector store (Qdrant)
    vector_store = QdrantService()
    await vector_store.initialize()
    app.state.vector_store = vector_store

    # Graph store (Neo4j)
    graph_store = Neo4jService()
    try:
        await graph_store.initialize()
    except Exception as e:
        logger.warning("Neo4j unavailable (Graph RAG disabled): %s", e)
    app.state.graph_store = graph_store

    # LLM
    llm = LLMService()
    app.state.llm_service = llm

    # Tracing
    tracing = TracingService(cache=cache)
    app.state.tracing_service = tracing

    # Strategy factory
    factory = StrategyFactory(
        embedding_service=embedding,
        llm_service=llm,
        vector_store=vector_store,
        graph_store=graph_store,
        cache=cache,
    )
    app.state.strategy_factory = factory

    # Auto-seed on first launch
    seed_dir = Path(__file__).parent.parent / "seed" / "documents"
    if seed_dir.exists():
        is_seeded = await cache._client.get("openrag:seeded")
        if not is_seeded:
            logger.info("First launch detected — seeding demo documents...")
            try:
                from openrag.tools.document_processor import DocumentProcessorService
                import uuid as _uuid
                from datetime import datetime, timezone

                processor = DocumentProcessorService(
                    embedding_service=embedding,
                    vector_store=vector_store,
                    graph_store=graph_store,
                )
                for doc_file in sorted(seed_dir.glob("*.md")):
                    doc_id = str(_uuid.uuid4())
                    chunks = await processor.process_file(
                        file_path=str(doc_file),
                        document_id=doc_id,
                        collection="default",
                        metadata={"source": "seed", "filename": doc_file.name},
                    )
                    # Store doc status compatible with DocumentDetail schema
                    await cache.store_trace(f"doc_status:{doc_id}", {
                        "id": doc_id,
                        "filename": doc_file.name,
                        "status": "indexed",
                        "chunks": chunks,
                        "collection": "default",
                        "file_size": doc_file.stat().st_size,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "content_type": "text/markdown",
                        "metadata": {"source": "seed", "filename": doc_file.name},
                    })
                    logger.info("Seeded: %s (%d chunks)", doc_file.name, chunks)
                await cache._client.set("openrag:seeded", "1")
                logger.info("Seed data loaded.")
            except Exception as e:
                logger.warning("Seed failed (non-critical): %s", e)

    logger.info("All services initialized")
    yield

    # Cleanup
    logger.info("Shutting down OpenRAG Platform...")
    await vector_store.close()
    await graph_store.close()
    await cache.close()
    from openrag.models.base import close_db
    await close_db()


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="OpenRAG Platform",
        description="Open-source RAG platform with 5-primitive architecture",
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_url],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["*"],
        max_age=3600,
    )

    # Rate limiting
    app.add_middleware(RateLimitMiddleware)

    # Request logging
    app.add_middleware(RequestLoggingMiddleware)

    # Tenant isolation (multi-tenancy)
    if settings.multi_tenancy_enabled:
        from openrag.middleware.tenant import TenantMiddleware
        app.add_middleware(TenantMiddleware)

    # Trusted hosts (production)
    if settings.is_production:
        app.add_middleware(
            TrustedHostMiddleware,
            allowed_hosts=[settings.domain],
        )

    # Telemetry
    from openrag.middleware.telemetry import setup_telemetry
    setup_telemetry(app)

    # Routers — all endpoints under /api prefix
    from openrag.api.router import api_router
    app.include_router(api_router, prefix="/api")

    return app


# Application instance
app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "openrag.server:app",
        host="0.0.0.0",
        port=8000,
        workers=4,
        log_level=settings.log_level,
        access_log=True,
    )
