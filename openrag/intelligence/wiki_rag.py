"""
Wiki RAG Strategy — persistent knowledge wiki that accumulates across documents.
Based on Karpathy's LLM Wiki pattern: instead of searching raw chunks every time,
build and maintain a structured wiki of entities, concepts, and cross-references.

Pipeline:
1. Load or build wiki from Redis cache
2. Search wiki pages (entity/concept pages) via embedding similarity
3. Supplement with raw chunk search
4. Merge, deduplicate, boost wiki results
"""

import hashlib
import json
import logging

from openrag.tools.cache import RedisService
from openrag.engine.embedding import EmbeddingService
from openrag.engine.llm import LLMService
from openrag.tools.tracing import TraceRecorder
from openrag.tools.vector_store import QdrantService
from openrag.intelligence.base import BaseRAGStrategy

logger = logging.getLogger("openrag.wiki_rag")

# Wiki config
WIKI_TTL = 604800  # 7 days
WIKI_MAX_PAGES = 100
WIKI_BATCH_SIZE = 30  # chunks per LLM batch for extraction
WIKI_COLLECTION_SUFFIX = "_wiki"

ENTITY_EXTRACT_PROMPT = """Analyze these document chunks and extract structured knowledge.

Return a JSON object with:
{{
  "entities": [
    {{"name": "...", "type": "PERSON|ORG|CONCEPT|TECHNOLOGY|LOCATION|EVENT", "description": "..."}}
  ],
  "concepts": [
    {{"name": "...", "description": "...", "related_entities": ["..."]}}
  ],
  "contradictions": [
    {{"topic": "...", "claim_a": "...", "claim_b": "...", "sources": ["..."]}}
  ]
}}

Chunks:
{chunks}
"""

WIKI_PAGE_TEMPLATE = """# {name}
**Type:** {type}

## Description
{description}

## Sources
{sources}

## Related
{related}
"""


class WikiRAGStrategy(BaseRAGStrategy):
    """Persistent knowledge wiki that accumulates across documents."""

    SYSTEM_PROMPT = (
        "You are a knowledge wiki analyst with deep understanding of the document collection. "
        "Your answers are backed by a structured, cross-referenced wiki built from all documents. "
        "Cite specific wiki pages and source documents using [N] notation. "
        "Flag any contradictions between sources explicitly. "
        "Provide comprehensive, well-structured answers that leverage the accumulated knowledge."
    )

    def __init__(
        self,
        embedding_service: EmbeddingService,
        llm_service: LLMService,
        vector_store: QdrantService,
        cache: RedisService,
        light_model: str = "openai/gpt-5.4-mini",
    ) -> None:
        super().__init__(
            embedding_service=embedding_service,
            llm_service=llm_service,
            vector_store=vector_store,
        )
        self.cache = cache
        self.light_model = light_model

    async def retrieve(
        self,
        query: str,
        collection: str,
        trace: TraceRecorder,
        top_k: int = 10,
        filters: dict | None = None,
        **kwargs,
    ) -> list[dict]:
        """Wiki-augmented retrieval: search wiki pages + raw chunks."""

        # Phase 1: Load or build wiki
        wiki_pages = await self._get_or_build_wiki(collection, trace)

        # Phase 2: Search wiki pages
        trace.start_step(
            "wiki_search",
            input_summary=f"pages={len(wiki_pages)}, top_k={top_k // 2 + 1}",
        )
        wiki_results = await self._search_wiki(
            query, wiki_pages, top_k=top_k // 2 + 1,
        )
        trace.end_step(
            output_summary=f"wiki_hits={len(wiki_results)}",
            result_count=len(wiki_results),
        )

        # Phase 3: Supplement with raw chunk search
        trace.start_step(
            "raw_search",
            input_summary=f"collection={collection}, top_k={top_k // 2}",
        )
        raw_results = await self._raw_chunk_search(
            query, collection, top_k=top_k // 2, filters=filters,
        )
        trace.end_step(
            output_summary=f"raw_hits={len(raw_results)}",
            result_count=len(raw_results),
        )

        # Phase 4: Merge and deduplicate
        trace.start_step(
            "merge",
            input_summary=f"wiki={len(wiki_results)}, raw={len(raw_results)}",
        )
        merged = self._merge_results(wiki_results, raw_results, top_k)
        trace.end_step(
            output_summary=f"merged={len(merged)}",
            result_count=len(merged),
        )

        return merged

    async def _get_or_build_wiki(
        self, collection: str, trace: TraceRecorder,
    ) -> list[dict]:
        """Load wiki from Redis cache, or build from scratch."""
        cache_key = f"openrag:wiki:{collection}:pages"
        trace.start_step("wiki_load", input_summary=f"collection={collection}")

        try:
            cached = await self.cache._client.get(cache_key)
            if cached:
                pages = json.loads(cached)
                trace.end_step(
                    output_summary=f"cache_hit, pages={len(pages)}",
                    details={"source": "cache"},
                )
                return pages
        except Exception:
            pass

        trace.end_step(output_summary="cache_miss, building wiki")

        return await self._build_wiki(collection, trace)

    async def _build_wiki(
        self, collection: str, trace: TraceRecorder,
    ) -> list[dict]:
        """Build wiki by extracting entities/concepts from all chunks."""
        model = self.light_model
        trace.start_step(
            "wiki_build",
            input_summary=f"collection={collection}, model={model}",
        )

        all_results = await self.vector_store.scroll(
            collection_name=collection, limit=200,
        )
        if not all_results:
            trace.end_step(output_summary="empty_collection")
            return []

        chunk_texts = [r.content for r in all_results if r.content]

        all_entities: list[dict] = []
        all_concepts: list[dict] = []
        all_contradictions: list[dict] = []

        for i in range(0, len(chunk_texts), WIKI_BATCH_SIZE):
            batch = chunk_texts[i : i + WIKI_BATCH_SIZE]
            batch_text = "\n---\n".join(
                f"[Chunk {i + j + 1}]: {t}" for j, t in enumerate(batch)
            )
            prompt = ENTITY_EXTRACT_PROMPT.format(chunks=batch_text)

            try:
                response = await self.llm.structured_extract(
                    prompt=prompt, model=model, temperature=0.0,
                )
                data = self._parse_json_response(response)
                all_entities.extend(data.get("entities", []))
                all_concepts.extend(data.get("concepts", []))
                all_contradictions.extend(data.get("contradictions", []))
            except Exception as exc:
                logger.warning("Wiki extraction batch failed: %s", exc)
                continue

        # Deduplicate entities by name
        seen_names: set[str] = set()
        unique_entities: list[dict] = []
        for entity in all_entities:
            name = entity.get("name", "").lower().strip()
            if name and name not in seen_names:
                seen_names.add(name)
                unique_entities.append(entity)

        pages = self._build_pages(unique_entities, all_concepts, all_contradictions, collection)

        # Cache wiki in Redis
        cache_key = f"openrag:wiki:{collection}:pages"
        try:
            await self.cache._client.set(
                cache_key, json.dumps(pages), ex=WIKI_TTL,
            )
        except Exception as exc:
            logger.warning("Failed to cache wiki: %s", exc)

        trace.end_step(
            output_summary=(
                f"entities={len(unique_entities)}, concepts={len(all_concepts)}, "
                f"contradictions={len(all_contradictions)}, pages={len(pages)}"
            ),
            result_count=len(pages),
            details={
                "entities": len(unique_entities),
                "concepts": len(all_concepts),
                "contradictions": len(all_contradictions),
                "total_pages": len(pages),
            },
        )

        return pages

    async def _search_wiki(
        self, query: str, pages: list[dict], top_k: int = 5,
    ) -> list[dict]:
        """Search wiki pages by embedding similarity."""
        if not pages:
            return []

        page_texts = [p.get("content", "") for p in pages]
        all_texts = [query] + page_texts

        try:
            embeddings = await self.embedding.embed(all_texts)
        except Exception:
            return []

        query_emb = embeddings[0]
        page_embs = embeddings[1:]

        scored: list[tuple[float, int]] = []
        for idx, page_emb in enumerate(page_embs):
            sim = self._cosine_sim(query_emb, page_emb)
            scored.append((sim, idx))

        scored.sort(reverse=True)

        results: list[dict] = []
        for score, idx in scored[:top_k]:
            page = pages[idx]
            results.append({
                "content": page.get("content", ""),
                "score": score * 1.2,  # Boost wiki results
                "metadata": {
                    "source": f"wiki:{page.get('name', 'unknown')}",
                    "type": page.get("type", "CONCEPT"),
                    "wiki_page": True,
                },
            })

        return results

    async def _raw_chunk_search(
        self,
        query: str,
        collection: str,
        top_k: int,
        filters: dict | None = None,
    ) -> list[dict]:
        """Fallback raw vector search for supplementary results."""
        try:
            vector = await self.embedding.embed_query(query)
            search_results = await self.vector_store.search(
                collection_name=collection,
                query_vector=vector,
                limit=top_k,
                filters=filters,
            )
            return [
                {
                    "content": r.content,
                    "score": r.score,
                    "metadata": r.metadata,
                }
                for r in search_results
            ]
        except Exception as exc:
            logger.warning("Raw search fallback failed: %s", exc)
            return []

    @staticmethod
    def _cosine_sim(a: list[float], b: list[float]) -> float:
        """Compute cosine similarity between two vectors."""
        dot = sum(x * y for x, y in zip(a, b))
        norm_a = sum(x * x for x in a) ** 0.5
        norm_b = sum(x * x for x in b) ** 0.5
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot / (norm_a * norm_b)

    @staticmethod
    def _merge_results(
        wiki_results: list[dict],
        raw_results: list[dict],
        top_k: int,
    ) -> list[dict]:
        """Merge wiki and raw results, deduplicate, return top_k."""
        seen: set[str] = set()
        merged: list[dict] = []

        for result in wiki_results + raw_results:
            content_hash = hashlib.md5(
                result["content"].encode(),
            ).hexdigest()
            if content_hash not in seen:
                seen.add(content_hash)
                merged.append(result)

        merged.sort(key=lambda x: x.get("score", 0), reverse=True)
        return merged[:top_k]

    @staticmethod
    def _parse_json_response(raw: str) -> dict:
        """Parse JSON object from LLM response, handling code fences."""
        text = raw.strip()
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]

        try:
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                return json.loads(text[start:end])
        except (json.JSONDecodeError, ValueError):
            pass

        return {}

    @staticmethod
    def _build_pages(
        entities: list[dict],
        concepts: list[dict],
        contradictions: list[dict],
        collection: str,
    ) -> list[dict]:
        """Build wiki pages from extracted entities, concepts, and contradictions."""
        pages: list[dict] = []

        for entity in entities[:WIKI_MAX_PAGES]:
            pages.append({
                "name": entity.get("name", "Unknown"),
                "type": entity.get("type", "CONCEPT"),
                "content": WIKI_PAGE_TEMPLATE.format(
                    name=entity.get("name", "Unknown"),
                    type=entity.get("type", "CONCEPT"),
                    description=entity.get("description", "No description"),
                    sources=f"Extracted from collection '{collection}'",
                    related=(
                        ", ".join(entity.get("related", []))
                        if entity.get("related")
                        else "None"
                    ),
                ),
            })

        remaining = WIKI_MAX_PAGES - len(pages)
        for concept in concepts[:remaining]:
            pages.append({
                "name": concept.get("name", "Unknown"),
                "type": "CONCEPT",
                "content": WIKI_PAGE_TEMPLATE.format(
                    name=concept.get("name", "Unknown"),
                    type="CONCEPT",
                    description=concept.get("description", "No description"),
                    sources=f"Extracted from collection '{collection}'",
                    related=(
                        ", ".join(concept.get("related_entities", []))
                        if concept.get("related_entities")
                        else "None"
                    ),
                ),
            })

        if contradictions:
            contradiction_text = "\n\n".join(
                f"**{c.get('topic', 'Unknown')}**: "
                f"Source A says: {c.get('claim_a', '?')} | "
                f"Source B says: {c.get('claim_b', '?')}"
                for c in contradictions
            )
            pages.append({
                "name": "Contradictions",
                "type": "META",
                "content": f"# Contradictions\n\n{contradiction_text}",
            })

        return pages
