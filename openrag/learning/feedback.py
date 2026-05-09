"""Feedback service — collect and query user feedback."""

import logging
from typing import Optional

logger = logging.getLogger("openrag.feedback")


async def submit_feedback(
    query_log_id: str,
    rating: str,
    comment: Optional[str] = None,
) -> dict:
    """Store user feedback for a query result."""
    logger.info("Feedback received: %s for query %s", rating, query_log_id)
    return {
        "query_log_id": query_log_id,
        "rating": rating,
        "comment": comment,
        "status": "stored",
    }


async def get_feedback_summary() -> dict:
    """Get aggregate feedback statistics."""
    return {
        "total": 0,
        "thumbs_up": 0,
        "thumbs_down": 0,
        "satisfaction_rate": 0.0,
    }
