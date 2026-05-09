"""Reranker tests."""

import pytest

from openrag.engine.reranker import Reranker


@pytest.mark.asyncio
async def test_reranker_cross_encoder_graceful_without_library():
    reranker = Reranker(reranker_type="cross-encoder")
    docs = [{"text": "doc1"}, {"text": "doc2"}]
    result = await reranker._rerank_cross_encoder("query", docs, 2)
    assert len(result) == 2


@pytest.mark.asyncio
async def test_reranker_colbert_fallback_to_cross_encoder():
    reranker = Reranker(reranker_type="colbert")
    docs = [{"text": "doc1"}]
    result = await reranker.rerank("query", docs, 1)
    assert len(result) <= 1
