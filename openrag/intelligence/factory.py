"""
Strategy factory — creates and caches strategy instances.
"""

from openrag.schemas.query import RAGStrategy
from openrag.tools.cache import RedisService
from openrag.engine.embedding import EmbeddingService
from openrag.tools.graph_store import Neo4jService
from openrag.engine.llm import LLMService
from openrag.tools.vector_store import QdrantService
from openrag.intelligence.agentic import AgenticRAGStrategy
from openrag.intelligence.base import BaseRAGStrategy
from openrag.intelligence.corrective import CorrectiveRAGStrategy
from openrag.intelligence.graph_rag import GraphRAGStrategy
from openrag.intelligence.hybrid import HybridRAGStrategy
from openrag.intelligence.memo_rag import MemoRAGStrategy
from openrag.intelligence.naive import NaiveRAGStrategy


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
        if strategy not in self._strategies:
            self._strategies[strategy] = self._create(strategy)
        return self._strategies[strategy]

    def _create(self, strategy: RAGStrategy) -> BaseRAGStrategy:
        """Create a new strategy instance."""
        base_kwargs = {
            "embedding_service": self._embedding,
            "llm_service": self._llm,
            "vector_store": self._vector_store,
        }

        if strategy == RAGStrategy.NAIVE:
            return NaiveRAGStrategy(**base_kwargs)
        elif strategy == RAGStrategy.HYBRID:
            return HybridRAGStrategy(**base_kwargs)
        elif strategy == RAGStrategy.GRAPH:
            return GraphRAGStrategy(graph_store=self._graph_store, **base_kwargs)
        elif strategy == RAGStrategy.AGENTIC:
            return AgenticRAGStrategy(graph_store=self._graph_store, **base_kwargs)
        elif strategy == RAGStrategy.MEMO:
            return MemoRAGStrategy(cache=self._cache, **base_kwargs)
        elif strategy == RAGStrategy.CORRECTIVE:
            return CorrectiveRAGStrategy(**base_kwargs)
        else:
            raise ValueError(f"Unknown strategy: {strategy}")
