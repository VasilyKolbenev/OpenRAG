"""
Strategy listing and recommendation endpoints.
"""

from fastapi import APIRouter

from app.schemas.strategy import (
    RecommendationRequest,
    RecommendationResponse,
    StrategyInfo,
    StrategyListResponse,
)
from app.strategies.advisor import recommend_strategy

router = APIRouter(tags=["strategies"])

STRATEGY_DETAILS = [
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


@router.get("/strategies", response_model=StrategyListResponse)
async def list_strategies():
    """List the focused product engines."""
    return StrategyListResponse(strategies=STRATEGY_DETAILS)


@router.post("/recommend", response_model=RecommendationResponse)
async def get_recommendation(request: RecommendationRequest):
    """Get AI-powered strategy recommendation."""
    return recommend_strategy(request)
