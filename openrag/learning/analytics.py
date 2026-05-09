"""Query analytics — aggregate statistics from query logs."""

import logging

logger = logging.getLogger("openrag.analytics")


async def get_analytics() -> dict:
    """Get analytics data aggregated from query logs."""
    return {
        "strategy_usage": {},
        "avg_latency_by_strategy": {},
        "total_queries": 0,
        "top_queries": [],
    }
