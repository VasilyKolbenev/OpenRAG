"""
Strategy factory -> creates and caches canonical strategy instances.
"""

from __future__ import annotations

from app.schemas.query import RAGStrategy
from app.services.cache import RedisService
from app.services.embedding import EmbeddingService
from app.services.graph_store import Neo4jService
from app.services.llm import LLMService
from app.services.vector_store import QdrantService
from app.strategies.agentic import AgenticRAGStrategy
from app.strategies.base import BaseRAGStrategy
from app.strategies.graph_rag import GraphRAGStrategy
from app.strategies.lightrag import LightRAGStrategy

CANONICAL_STRATEGY_MAP = {
    # Canonical engines
    RAGStrategy.LIGHTRAG: RAGStrategy.LIGHTRAG,
    RAGStrategy.GRAPH: RAGStrategy.GRAPH,
    RAGStrategy.AGENTIC: RAGStrategy.AGENTIC,
    # Legacy aliases -> LightRAG (fast default)
    RAGStrategy.HYBRID: RAGStrategy.LIGHTRAG,
    RAGStrategy.NAIVE: RAGStrategy.LIGHTRAG,
    RAGStrategy.MEMO: RAGStrategy.LIGHTRAG,
    RAGStrategy.WIKI: RAGStrategy.LIGHTRAG,
    # Legacy aliases -> GraphRAG (entity reasoning)
    RAGStrategy.CORRECTIVE: RAGStrategy.GRAPH,
}


class StrategyFactory:
    """Creates and caches RAG strategy instances."""

    def __init__(
        self,
        embedding_service: EmbeddingService,
        llm_service: LLMService,
        vector_store: QdrantService,
        graph_store: Neo4jService,
        cache: RedisService,
    ) -> None:
        self._strategies: dict[RAGStrategy, BaseRAGStrategy] = {}
        self._embedding = embedding_service
        self._llm = llm_service
        self._vector_store = vector_store
        self._graph_store = graph_store
        self._cache = cache

    def get(self, strategy: RAGStrategy) -> BaseRAGStrategy:
        """Get or create a strategy instance."""
        canonical = self.canonicalize(strategy)
        if canonical not in self._strategies:
            self._strategies[canonical] = self._create(canonical)
        return self._strategies[canonical]

    @staticmethod
    def canonicalize(strategy: RAGStrategy) -> RAGStrategy:
        """Map legacy strategy ids to the new two-engine product surface."""
        canonical = CANONICAL_STRATEGY_MAP.get(strategy)
        if canonical is None:
            raise ValueError(f"Unknown strategy: {strategy}")
        return canonical

    def _create(self, strategy: RAGStrategy) -> BaseRAGStrategy:
        """Create a new strategy instance."""
        base_kwargs = {
            "embedding_service": self._embedding,
            "llm_service": self._llm,
            "vector_store": self._vector_store,
        }

        if strategy == RAGStrategy.LIGHTRAG:
            return LightRAGStrategy(cache=self._cache, **base_kwargs)
        if strategy == RAGStrategy.GRAPH:
            return GraphRAGStrategy(
                graph_store=self._graph_store,
                cache=self._cache,
                **base_kwargs,
            )
        if strategy == RAGStrategy.AGENTIC:
            return AgenticRAGStrategy(
                graph_store=self._graph_store,
                **base_kwargs,
            )
        raise ValueError(f"Unknown strategy: {strategy}")
