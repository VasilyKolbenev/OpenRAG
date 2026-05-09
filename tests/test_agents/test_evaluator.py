"""Evaluator agent tests."""

import pytest
from unittest.mock import AsyncMock, patch

from openrag.agents.evaluator import Evaluator


@pytest.mark.asyncio
async def test_evaluator_calls_evaluation_service():
    evaluator = Evaluator()
    with patch.object(evaluator._eval_service, "evaluate", new_callable=AsyncMock) as mock_eval:
        mock_eval.return_value = {"faithfulness": 0.9, "relevance": 0.8}
        result = await evaluator.evaluate("question", "answer", ["ctx1"])
        mock_eval.assert_called_once_with("question", "answer", ["ctx1"])
        assert result["faithfulness"] == 0.9
