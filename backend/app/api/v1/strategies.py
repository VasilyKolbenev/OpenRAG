"""
Strategy listing and recommendation endpoints.
"""

import logging

from fastapi import APIRouter, Request

from app.schemas.strategy import (
    RecommendationRequest,
    RecommendationResponse,
    StrategyInfo,
    StrategyListResponse,
)
from app.strategies.advisor import recommend_strategy

logger = logging.getLogger("openrag.strategies")

router = APIRouter(tags=["strategies"])


def _engine_catalog() -> list[StrategyInfo]:
    """Static metadata for the three canonical engines."""
    return [
        StrategyInfo(
            id="lightrag",
            name="LightRAG",
            description="Dual-level retrieval with ReasoningBank guidance and TurboQuant-ready runtime profile",
            complexity=2,
            latency="low-medium",
            accuracy="high",
        ),
        StrategyInfo(
            id="agentic",
            name="AgenticRAG",
            description="Autonomous multi-step planning, tool use, and self-reflection for complex research questions",
            complexity=5,
            latency="medium-high",
            accuracy="very-high",
        ),
        StrategyInfo(
            id="graph",
            name="GraphRAG",
            description="Knowledge-graph traversal with ReasoningBank guidance for relationship-heavy questions",
            complexity=4,
            latency="medium",
            accuracy="high",
        ),
    ]


# Static catalog is used by tests and as the import-time export.
STRATEGY_DETAILS = _engine_catalog()


@router.get("/strategies", response_model=StrategyListResponse)
async def list_strategies(request: Request) -> StrategyListResponse:
    """List the focused product engines, marking GraphRAG unavailable if Neo4j is offline."""
    catalog = _engine_catalog()

    graph_store = getattr(request.app.state, "graph_store", None)
    if graph_store is not None:
        try:
            graph_healthy = await graph_store.health_check()
        except Exception as exc:
            logger.warning("Neo4j health check failed: %s", exc)
            graph_healthy = False

        if not graph_healthy:
            for engine in catalog:
                if engine.id == "graph":
                    engine.available = False
                    engine.unavailable_reason = (
                        "GraphRAG requires Neo4j. The graph backend is currently offline."
                    )

    return StrategyListResponse(strategies=catalog)


@router.post("/recommend", response_model=RecommendationResponse)
async def get_recommendation(request: RecommendationRequest):
    """Get AI-powered strategy recommendation."""
    return recommend_strategy(request)
