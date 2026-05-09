"""Analytics API router."""

from fastapi import APIRouter

from openrag.learning.analytics import get_analytics

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("")
async def analytics():
    return await get_analytics()
