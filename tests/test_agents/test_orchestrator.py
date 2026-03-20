"""Orchestrator dispatcher tests."""

from unittest.mock import AsyncMock, MagicMock

from openrag.agents.orchestrator import Orchestrator


def test_orchestrator_dispatches_to_named_strategy():
    mock_factory = MagicMock()
    mock_strategy = AsyncMock()
    mock_factory.create.return_value = mock_strategy
    orch = Orchestrator(mock_factory)
    result = orch.get_strategy("naive")
    mock_factory.create.assert_called_once_with("naive")
    assert result == mock_strategy


def test_orchestrator_dispatches_default_when_none():
    mock_factory = MagicMock()
    mock_strategy = AsyncMock()
    mock_factory.create.return_value = mock_strategy
    orch = Orchestrator(mock_factory)
    result = orch.get_strategy(None)
    mock_factory.create.assert_called_once_with("naive")
