"""
Tests for strategy endpoints -> GET /strategies, POST /recommend.
"""

from httpx import AsyncClient


class TestStrategiesEndpoint:
    """GET /strategies -> list focused product engines."""

    async def test_list_strategies_returns_three_engines(self, client: AsyncClient):
        response = await client.get("/strategies")
        assert response.status_code == 200
        data = response.json()
        assert "strategies" in data
        strategies = data["strategies"]
        assert len(strategies) == 3
        ids = [strategy["id"] for strategy in strategies]
        assert "lightrag" in ids
        assert "agentic" in ids
        assert "graph" in ids

    async def test_strategy_info_has_required_fields(self, client: AsyncClient):
        response = await client.get("/strategies")
        data = response.json()
        for strategy in data["strategies"]:
            assert "id" in strategy
            assert "name" in strategy
            assert "description" in strategy
            assert "complexity" in strategy
            assert "latency" in strategy
            assert "accuracy" in strategy
            assert "available" in strategy

    async def test_graph_marked_unavailable_when_neo4j_offline(
        self, client: AsyncClient, mock_graph_store
    ):
        # Mock graph health check to return False (Neo4j offline)
        mock_graph_store.health_check.return_value = False

        response = await client.get("/strategies")
        assert response.status_code == 200
        strategies = {s["id"]: s for s in response.json()["strategies"]}

        assert strategies["graph"]["available"] is False
        assert strategies["graph"]["unavailable_reason"] is not None
        # LightRAG and AgenticRAG remain available regardless of Neo4j
        assert strategies["lightrag"]["available"] is True
        assert strategies["agentic"]["available"] is True


class TestRecommendEndpoint:
    """POST /recommend -> strategy recommendation."""

    async def test_recommend_returns_strategy(self, client: AsyncClient):
        response = await client.post(
            "/recommend",
            json={
                "domain": "enterprise",
                "query_complexity": "moderate",
                "data_structure": "flat",
                "priority": "speed",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "recommended" in data
        assert data["recommended"] in ("lightrag", "agentic", "graph")
        assert "scores" in data
        assert "reasoning" in data
        assert isinstance(data["scores"], dict)
        assert len(data["scores"]) == 3
