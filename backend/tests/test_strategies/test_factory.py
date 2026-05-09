"""
Tests for StrategyFactory -> creation, caching, unknown strategy.
"""

from unittest.mock import AsyncMock

import pytest

from app.schemas.query import RAGStrategy
from app.strategies.agentic import AgenticRAGStrategy
from app.strategies.factory import StrategyFactory
from app.strategies.graph_rag import GraphRAGStrategy
from app.strategies.lightrag import LightRAGStrategy


class TestStrategyFactory:
    """StrategyFactory.get() -> creates correct types, caches instances."""

    def test_get_lightrag_returns_lightrag_strategy(self, mock_strategy_factory: StrategyFactory):
        strategy = mock_strategy_factory.get(RAGStrategy.LIGHTRAG)
        assert isinstance(strategy, LightRAGStrategy)

    def test_get_hybrid_alias_returns_lightrag_strategy(self, mock_strategy_factory: StrategyFactory):
        strategy = mock_strategy_factory.get(RAGStrategy.HYBRID)
        assert isinstance(strategy, LightRAGStrategy)

    def test_get_graph_returns_graph_strategy(self, mock_strategy_factory: StrategyFactory):
        strategy = mock_strategy_factory.get(RAGStrategy.GRAPH)
        assert isinstance(strategy, GraphRAGStrategy)

    def test_get_agentic_returns_agentic_strategy(self, mock_strategy_factory: StrategyFactory):
        strategy = mock_strategy_factory.get(RAGStrategy.AGENTIC)
        assert isinstance(strategy, AgenticRAGStrategy)

    def test_get_corrective_alias_returns_graph_strategy(self, mock_strategy_factory: StrategyFactory):
        strategy = mock_strategy_factory.get(RAGStrategy.CORRECTIVE)
        assert isinstance(strategy, GraphRAGStrategy)

    def test_get_caches_instances(self, mock_strategy_factory: StrategyFactory):
        first = mock_strategy_factory.get(RAGStrategy.LIGHTRAG)
        second = mock_strategy_factory.get(RAGStrategy.LIGHTRAG)
        assert first is second

    def test_different_strategies_are_different_instances(
        self, mock_strategy_factory: StrategyFactory
    ):
        lightrag = mock_strategy_factory.get(RAGStrategy.LIGHTRAG)
        graph = mock_strategy_factory.get(RAGStrategy.GRAPH)
        assert lightrag is not graph

    def test_unknown_strategy_raises(
        self,
        mock_embedding_service: AsyncMock,
        mock_llm_service: AsyncMock,
        mock_vector_store: AsyncMock,
        mock_graph_store: AsyncMock,
        mock_cache_service: AsyncMock,
    ):
        factory = StrategyFactory(
            embedding_service=mock_embedding_service,
            llm_service=mock_llm_service,
            vector_store=mock_vector_store,
            graph_store=mock_graph_store,
            cache=mock_cache_service,
        )
        with pytest.raises(ValueError, match="Unknown strategy"):
            factory.canonicalize("nonexistent")
