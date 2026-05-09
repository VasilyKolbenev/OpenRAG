"""Reranker service — cross-encoder and ColBERT reranking."""

import logging

logger = logging.getLogger("openrag.reranker")


class Reranker:
    """Reranks retrieved documents using cross-encoder or ColBERT."""

    def __init__(self, reranker_type: str = "cross-encoder") -> None:
        self.reranker_type = reranker_type
        self._model = None

    async def rerank(
        self, query: str, documents: list[dict], top_k: int = 5
    ) -> list[dict]:
        """Rerank documents by relevance to query."""
        if self.reranker_type == "colbert":
            return await self._rerank_colbert(query, documents, top_k)
        return await self._rerank_cross_encoder(query, documents, top_k)

    async def _rerank_cross_encoder(
        self, query: str, documents: list[dict], top_k: int
    ) -> list[dict]:
        try:
            from sentence_transformers import CrossEncoder
            if self._model is None:
                self._model = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
            pairs = [(query, doc.get("text", "")) for doc in documents]
            scores = self._model.predict(pairs)
            scored = list(zip(documents, scores))
            scored.sort(key=lambda x: x[1], reverse=True)
            return [doc for doc, _ in scored[:top_k]]
        except ImportError:
            logger.warning("sentence-transformers not available, skipping reranking")
            return documents[:top_k]

    async def _rerank_colbert(
        self, query: str, documents: list[dict], top_k: int
    ) -> list[dict]:
        try:
            from ragatouille import RAGPretrainedModel
            if self._model is None:
                self._model = RAGPretrainedModel.from_pretrained("colbert-ir/colbertv2.0")
            texts = [doc.get("text", "") for doc in documents]
            results = self._model.rerank(query=query, documents=texts, k=top_k)
            reranked = []
            for r in results:
                idx = r.get("result_index", 0)
                if idx < len(documents):
                    reranked.append(documents[idx])
            return reranked
        except ImportError:
            logger.warning("RAGatouille not available, falling back to cross-encoder")
            return await self._rerank_cross_encoder(query, documents, top_k)
