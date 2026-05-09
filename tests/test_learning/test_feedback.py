"""Feedback service tests."""

import pytest

from openrag.learning.feedback import submit_feedback, get_feedback_summary


@pytest.mark.asyncio
async def test_submit_feedback_returns_stored():
    result = await submit_feedback("test-query-id", "thumbs_up", "Great answer!")
    assert result["status"] == "stored"
    assert result["rating"] == "thumbs_up"


@pytest.mark.asyncio
async def test_submit_feedback_without_comment():
    result = await submit_feedback("test-query-id", "thumbs_down")
    assert result["comment"] is None


@pytest.mark.asyncio
async def test_get_feedback_summary_returns_dict():
    result = await get_feedback_summary()
    assert "total" in result
    assert "satisfaction_rate" in result
