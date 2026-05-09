"""
ReasoningBank helper for lightweight retrieval memory.
"""

from __future__ import annotations

import hashlib
import re
from datetime import datetime, timezone

from app.config import settings
from app.services.cache import RedisService

TOKEN_RE = re.compile(r"[A-Za-zА-Яа-я0-9_/-]{3,}")
STOPWORDS = {
    "about",
    "after",
    "before",
    "from",
    "into",
    "that",
    "their",
    "there",
    "these",
    "this",
    "what",
    "when",
    "where",
    "with",
    "your",
    "как",
    "для",
    "или",
    "над",
    "под",
    "про",
    "что",
    "это",
}


class ReasoningBankService:
    """Stores and recalls retrieval lessons using lightweight keyword matching."""

    def __init__(self, cache: RedisService | None, strategy_id: str) -> None:
        self.cache = cache
        self.strategy_id = strategy_id

    async def recall(
        self,
        query: str,
        collection: str,
        limit: int = 3,
    ) -> list[dict]:
        """Return the most relevant lessons for the current query."""
        if not self.cache or limit <= 0:
            return []

        entries = await self.cache.get_reasoning_bank(collection, self.strategy_id)
        if not entries:
            return []

        query_tokens = self._tokenize(query)
        ranked: list[tuple[int, int, str, dict]] = []
        for entry in entries:
            keywords = set(entry.get("keywords", []))
            overlap = len(query_tokens & keywords)
            if overlap == 0:
                continue
            ranked.append(
                (
                    overlap,
                    1 if entry.get("success") else 0,
                    entry.get("created_at", ""),
                    entry,
                )
            )

        ranked.sort(reverse=True)
        return [entry for *_meta, entry in ranked[:limit]]

    async def remember(
        self,
        collection: str,
        query: str,
        success: bool,
        lesson: str,
        metadata: dict | None = None,
    ) -> None:
        """Persist a compact lesson distilled from a retrieval run."""
        if not self.cache:
            return

        keywords = sorted(self._tokenize(query))[:8]
        signature = hashlib.sha256(
            f"{query}|{lesson}|{self.strategy_id}".encode("utf-8")
        ).hexdigest()[:16]
        entry = {
            "signature": signature,
            "title": "Successful retrieval pattern" if success else "Retrieval failure pattern",
            "keywords": keywords,
            "lesson": lesson,
            "success": success,
            "metadata": metadata or {},
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await self.cache.append_reasoning_bank(
            collection=collection,
            strategy=self.strategy_id,
            entry=entry,
            ttl=settings.reasoning_bank_ttl,
            max_items=settings.reasoning_bank_max_entries,
        )

    @staticmethod
    def _tokenize(text: str) -> set[str]:
        tokens = {
            token.lower()
            for token in TOKEN_RE.findall(text)
            if token.lower() not in STOPWORDS
        }
        return tokens
