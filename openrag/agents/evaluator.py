"""Quality evaluator agent — runs RAGAS evaluation asynchronously."""

import logging

from openrag.learning.evaluation import evaluate_response

logger = logging.getLogger("openrag.evaluator")


class Evaluator:
    """Runs quality evaluation on RAG responses (async, post-response)."""

    async def evaluate(
        self,
        query: str,
        answer: str,
        contexts: list[str],
    ) -> dict:
        """Evaluate RAG response quality using RAGAS metrics."""
        logger.info("Running quality evaluation for query")
        return await evaluate_response(query, answer, contexts)
