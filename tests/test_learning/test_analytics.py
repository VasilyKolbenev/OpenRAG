"""Analytics service tests."""

import pytest

from openrag.learning.analytics import get_analytics


@pytest.mark.asyncio
async def test_get_analytics_returns_structure():
    result = await get_analytics()
    assert "strategy_usage" in result
    assert "avg_latency_by_strategy" in result
    assert "total_queries" in result
    assert "top_queries" in result
