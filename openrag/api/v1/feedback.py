"""Feedback API router."""

from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from openrag.learning.feedback import submit_feedback, get_feedback_summary

router = APIRouter(prefix="/feedback", tags=["feedback"])


class FeedbackRequest(BaseModel):
    query_id: str
    rating: str
    comment: Optional[str] = None


@router.post("")
async def create_feedback(req: FeedbackRequest):
    return await submit_feedback(req.query_id, req.rating, req.comment)


@router.get("")
async def feedback_summary():
    return await get_feedback_summary()
