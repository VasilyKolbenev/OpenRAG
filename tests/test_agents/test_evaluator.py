"""Evaluator agent tests."""

import pytest
from unittest.mock import AsyncMock, patch

from openrag.agents.evaluator import Evaluator


@pytest.mark.asyncio
async def test_evaluator_calls_evaluate_response():
    with patch("openrag.agents.evaluator.evaluate_response", new_callable=AsyncMock) as mock_eval:
        mock_eval.return_value = {"faithfulness": 0.9, "relevance": 0.8}
        evaluator = Evaluator()
        result = await evaluator.evaluate("question", "answer", ["ctx1"])
        mock_eval.assert_called_once_with("question", "answer", ["ctx1"])
        assert result["faithfulness"] == 0.9
