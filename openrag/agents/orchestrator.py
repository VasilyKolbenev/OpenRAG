"""Strategy orchestrator — dispatches queries to the appropriate RAG strategy.

v1: Pass-through to StrategyFactory (user selects strategy explicitly).
v2 (future): AI-based auto-selection based on query analysis.
"""

import logging
from typing import Optional

from openrag.intelligence.factory import StrategyFactory

logger = logging.getLogger("openrag.orchestrator")


class Orchestrator:
    """Dispatches queries to RAG strategies."""

    def __init__(self, factory: StrategyFactory) -> None:
        self._factory = factory

    def get_strategy(self, strategy_name: Optional[str] = None):
        """Get strategy instance by name. Defaults to 'naive'."""
        name = strategy_name or "naive"
        logger.info("Dispatching to strategy: %s", name)
        return self._factory.create(name)
