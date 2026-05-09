"""
Graph RAG Strategy.
Pipeline: Query -> Entity Extract -> Graph Traverse -> Context Merge -> LLM
"""

from __future__ import annotations

import json
import logging
from typing import Optional

from app.config import settings
from app.services.cache import RedisService
from app.services.graph_store import Neo4jService
from app.services.reasoning_bank import ReasoningBankService
from app.services.tracing import TraceRecorder
from app.strategies.base import BaseRAGStrategy

logger = logging.getLogger("openrag.graph_rag")


class GraphRAGStrategy(BaseRAGStrategy):
    """Knowledge graph-enhanced retrieval combining graph traversal with vector search."""

    def __init__(
        self,
        graph_store: Neo4jService,
        cache: RedisService | None = None,
        **kwargs,
    ) -> None:
        super().__init__(**kwargs)
        self.graph_store = graph_store
        self.reasoning_bank = ReasoningBankService(cache, strategy_id="graph")

    async def retrieve(
        self,
        query: str,
        collection: str,
        trace: TraceRecorder,
        top_k: int = 10,
        max_hops: int = 3,
        entity_types: Optional[list[str]] = None,
        filters: dict | None = None,
        enable_reasoning_bank: bool = True,
        reasoning_memory_limit: int = 3,
        turboquant_enabled: bool | None = None,
        turboquant_bits: int | None = None,
        **kwargs,
    ) -> list[dict]:
        if not await self._graph_available():
            raise ValueError(
                "GraphRAG requires Neo4j which is currently offline. "
                "Please use LightRAG or start Neo4j and try again."
            )

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
                "target": "graph-llm-runtime",
            },
        )

        adaptive_hops = self._resolve_hops(max_hops=max_hops, lessons=lessons)

        trace.start_step("entity_extraction", input_summary=f"query_length={len(query)}")
        entities = await self._extract_entities(query, lessons=lessons)
        trace.end_step(
            output_summary=f"entities={entities}",
            result_count=len(entities),
        )

        graph_context = []
        if entities:
            trace.start_step(
                "graph_traversal",
                input_summary=f"entities={len(entities)}, max_hops={adaptive_hops}",
            )
            nodes, edges = await self.graph_store.traverse(
                entity_names=entities,
                max_hops=adaptive_hops,
                collection=collection,
            )
            trace.end_step(
                output_summary=f"nodes={len(nodes)}, edges={len(edges)}",
                result_count=len(nodes),
                details={
                    "node_types": list({n.type for n in nodes}),
                    "edge_types": list({e.type for e in edges}),
                },
            )

            for node in nodes:
                graph_context.append(
                    {
                        "content": (
                            f"Entity: {node.name} (type: {node.type}). "
                            f"Properties: {json.dumps(node.properties, default=str)}"
                        ),
                        "score": 0.9,
                        "metadata": {
                            "source": "knowledge_graph",
                            "entity": node.name,
                            "type": node.type,
                        },
                    }
                )
            for edge in edges:
                graph_context.append(
                    {
                        "content": f"Relationship: {edge.source} --[{edge.type}]--> {edge.target}",
                        "score": 0.85,
                        "metadata": {
                            "source": "knowledge_graph",
                            "relationship": edge.type,
                        },
                    }
                )

        trace.start_step("vector_search", input_summary=f"top_k={top_k}")
        query_vector = await self.embedding.embed_query(query)
        vector_results = await self.vector_store.search(
            collection_name=collection,
            query_vector=query_vector,
            limit=top_k,
            filters=filters,
        )
        trace.end_step(
            output_summary=f"found={len(vector_results)}",
            result_count=len(vector_results),
        )

        vector_context = [
            {
                "content": result.content,
                "score": result.score,
                "metadata": result.metadata,
            }
            for result in vector_results
        ]

        trace.start_step(
            "context_merge",
            input_summary=f"graph={len(graph_context)}, vector={len(vector_context)}",
        )
        merged = self._merge_contexts(graph_context, vector_context, top_k)
        trace.end_step(
            output_summary=f"merged={len(merged)}",
            result_count=len(merged),
        )

        return merged

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
            "Successful graph runs preserved canonical entities and traversed only the relationships required to answer the question."
            if success
            else "Failed graph runs should widen hop depth, retain entity aliases, and fall back to vector context when graph coverage is sparse."
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

    async def _extract_entities(
        self,
        query: str,
        lessons: list[dict] | None = None,
    ) -> list[str]:
        """Extract entity names from query using LLM."""
        hint_terms = []
        for lesson in lessons or []:
            hint_terms.extend(lesson.get("keywords", []))

        hint_block = ""
        if hint_terms:
            deduped = list(dict.fromkeys(hint_terms))[:8]
            hint_block = (
                "Previously useful concepts for similar queries: "
                + ", ".join(deduped)
                + ".\n"
            )

        prompt = (
            "Extract all named entities (people, organizations, concepts, technologies, "
            "locations) from the following query. Return ONLY a JSON array of strings.\n\n"
            f"{hint_block}"
            f"Query: {query}\n\n"
            "Response (JSON array only):"
        )

        try:
            response = await self.llm.structured_extract(prompt, temperature=0.0)
            response = response.strip()
            if response.startswith("```"):
                response = response.split("\n", 1)[1].rsplit("```", 1)[0]
            entities = json.loads(response)
            if isinstance(entities, list):
                return [str(entity) for entity in entities]
        except (json.JSONDecodeError, Exception) as exc:
            logger.warning("Entity extraction failed: %s", exc)

        return []

    @staticmethod
    def _merge_contexts(
        graph_context: list[dict],
        vector_context: list[dict],
        limit: int,
    ) -> list[dict]:
        """Merge graph and vector contexts, deduplicating by content."""
        seen_content = set()
        merged = []

        for item in graph_context:
            content_key = item["content"][:100]
            if content_key not in seen_content:
                seen_content.add(content_key)
                merged.append(item)

        for item in vector_context:
            content_key = item["content"][:100]
            if content_key not in seen_content:
                seen_content.add(content_key)
                merged.append(item)

        return merged[:limit]

    async def _graph_available(self) -> bool:
        """Check if Neo4j graph store is reachable."""
        try:
            return await self.graph_store.health_check()
        except Exception:
            return False

    @staticmethod
    def _resolve_hops(max_hops: int, lessons: list[dict]) -> int:
        """Widen traversal slightly when similar queries previously failed."""
        if any(not lesson.get("success", True) for lesson in lessons):
            return min(max_hops + 1, 5)
        return max_hops
