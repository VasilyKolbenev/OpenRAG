"""
Strategy Advisor -> rule-based recommendation engine for three canonical engines.

Engines:
- lightrag: fast default for mixed corpora and general Q&A
- agentic: autonomous multi-step research with planning and reflection
- graph: knowledge-graph traversal for relationship-heavy queries
"""

from app.schemas.query import RAGStrategy
from app.schemas.strategy import RecommendationRequest, RecommendationResponse


def recommend_strategy(req: RecommendationRequest) -> RecommendationResponse:
    """Rule-based engine recommendation for OpenRAG's three canonical engines."""
    scores = {
        "lightrag": 0.0,
        "agentic": 0.0,
        "graph": 0.0,
    }

    complexity_map = {
        "simple": {"lightrag": 3},
        "moderate": {"lightrag": 3, "graph": 1},
        "complex": {"agentic": 3, "graph": 2, "lightrag": 1},
        "very_complex": {"agentic": 4, "graph": 3, "lightrag": 1},
    }
    for strategy, score in complexity_map.get(req.query_complexity, {}).items():
        scores[strategy] += score

    data_map = {
        "flat": {"lightrag": 3},
        "structured": {"graph": 3, "lightrag": 1},
        "mixed": {"lightrag": 2, "graph": 2, "agentic": 1},
        "code": {"agentic": 2, "lightrag": 2, "graph": 1},
    }
    for strategy, score in data_map.get(req.data_structure, {}).items():
        scores[strategy] += score

    domain_map = {
        "legal": {"graph": 3, "agentic": 2, "lightrag": 1},
        "medical": {"graph": 3, "agentic": 2, "lightrag": 1},
        "enterprise": {"lightrag": 3, "agentic": 1},
        "research": {"agentic": 3, "graph": 2, "lightrag": 1},
        "support": {"lightrag": 3},
    }
    for strategy, score in domain_map.get(req.domain, {}).items():
        scores[strategy] += score

    priority_map = {
        "speed": {"lightrag": 3},
        "accuracy": {"agentic": 3, "graph": 2, "lightrag": 1},
        "cost": {"lightrag": 3},
        "explainability": {"graph": 3, "agentic": 1, "lightrag": 1},
    }
    for strategy, score in priority_map.get(req.priority, {}).items():
        scores[strategy] += score

    max_score = max(scores.values()) or 1
    normalized = {k: round(v / max_score, 2) for k, v in scores.items()}
    best = max(scores, key=scores.get)

    name_map = {
        "lightrag": "LightRAG",
        "agentic": "AgenticRAG",
        "graph": "GraphRAG",
    }
    reasoning = (
        f"Based on your {req.domain} domain with {req.query_complexity} queries "
        f"and {req.data_structure} data, prioritizing {req.priority}: "
        f"{name_map[best]} is the strongest fit."
    )

    return RecommendationResponse(
        recommended=RAGStrategy(best),
        scores=normalized,
        reasoning=reasoning,
    )
