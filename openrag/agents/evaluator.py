"""Quality evaluator agent — runs RAGAS evaluation asynchronously."""

import logging

from openrag.learning.evaluation import EvaluationService

logger = logging.getLogger("openrag.evaluator")


class Evaluator:
    """Runs quality evaluation on RAG responses (async, post-response)."""

    def __init__(self) -> None:
        self._eval_service = EvaluationService()

    async def evaluate(
        self,
        query: str,
        answer: str,
        contexts: list[str],
    ) -> dict:
        """Evaluate RAG response quality using RAGAS metrics."""
        logger.info("Running quality evaluation for query")
        return await self._eval_service.evaluate(query, answer, contexts)
