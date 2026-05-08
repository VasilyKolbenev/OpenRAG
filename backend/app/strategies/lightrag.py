"""
LightRAG strategy built on top of the existing hybrid retriever.
"""

from __future__ import annotations

from app.config import settings
from app.services.cache import RedisService
from app.services.reasoning_bank import ReasoningBankService
from app.services.tracing import TraceRecorder
from app.strategies.hybrid import HybridRAGStrategy


class LightRAGStrategy(HybridRAGStrategy):
    """Dual-level LightRAG profile with ReasoningBank recall hooks."""

    def __init__(self, cache: RedisService | None = None, **kwargs) -> None:
        super().__init__(**kwargs)
        self.reasoning_bank = ReasoningBankService(cache, strategy_id="lightrag")

    async def retrieve(
        self,
        query: str,
        collection: str,
        trace: TraceRecorder,
        top_k: int = 10,
        sparse_weight: float = 0.3,
        enable_reranking: bool = True,
        reranker_type: str = "cross-encoder",
        filters: dict | None = None,
        query_mode: str = "hybrid",
        enable_reasoning_bank: bool = True,
        reasoning_memory_limit: int = 3,
        turboquant_enabled: bool | None = None,
        turboquant_bits: int | None = None,
        **kwargs,
    ) -> list[dict]:
        lessons: list[dict] = []
        if enable_reasoning_bank:
            trace.start_step(
                "reasoning_bank_recall",
                input_summary=f"limit={reasoning_memory_limit}",
            )
            lessons = await self.reasoning_bank.recall(
                query=query,
                collection=collection,
                limit=reasoning_memory_limit,
            )
            trace.end_step(
                output_summary=f"lessons={len(lessons)}",
                result_count=len(lessons),
                details={
                    "titles": [lesson.get("title", "") for lesson in lessons[:3]],
                },
            )

        turboquant_active = settings.turboquant_enabled if turboquant_enabled is None else turboquant_enabled
        turboquant_bits = turboquant_bits or settings.turboquant_default_bits
        trace.start_step(
            "turboquant_profile",
            input_summary=f"enabled={turboquant_active}, bits={turboquant_bits}",
        )
        trace.end_step(
            output_summary="profile_attached",
            details={
                "enabled": turboquant_active,
                "bits": turboquant_bits,
                "target": "reranker-and-llm-runtime",
            },
        )

        optimized_query = self._apply_lessons(query, lessons)
        resolved_sparse_weight = self._resolve_sparse_weight(query_mode, sparse_weight)

        return await super().retrieve(
            query=optimized_query,
            collection=collection,
            trace=trace,
            top_k=top_k,
            sparse_weight=resolved_sparse_weight,
            enable_reranking=enable_reranking,
            reranker_type=reranker_type,
            filters=filters,
            **kwargs,
        )

    async def record_outcome(
        self,
        query: str,
        collection: str,
        trace: TraceRecorder,
        success: bool,
        context: list[dict],
        metadata: dict | None = None,
    ) -> None:
        lesson = (
            "Successful runs preserved exact keywords while blending sparse and dense recall before reranking."
            if success
            else "Failed runs should broaden lexical recall, keep canonical entity terms, and increase candidate coverage before reranking."
        )
        await self.reasoning_bank.remember(
            collection=collection,
            query=query,
            success=success,
            lesson=lesson,
            metadata={
                "chunks_retrieved": len(context),
                "trace_steps": [step["name"] for step in trace.steps],
                **(metadata or {}),
            },
        )

    @staticmethod
    def _apply_lessons(query: str, lessons: list[dict]) -> str:
        """Append missing high-signal keywords from recent lessons."""
        boosts: list[str] = []
        lowered_query = query.lower()
        for lesson in lessons:
            for keyword in lesson.get("keywords", []):
                if keyword.lower() not in lowered_query and keyword not in boosts:
                    boosts.append(keyword)
        if not boosts:
            return query
        return f"{query}\n\nRetrieval hints: {'; '.join(boosts[:6])}"

    @staticmethod
    def _resolve_sparse_weight(query_mode: str, sparse_weight: float) -> float:
        if query_mode == "local":
            return max(sparse_weight, 0.45)
        if query_mode == "global":
            return min(sparse_weight, 0.15)
        return sparse_weight
