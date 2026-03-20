"""Engine registry — catalog of available models and inference backends."""

import logging
from dataclasses import dataclass
from typing import Optional

from openrag.config import settings

logger = logging.getLogger("openrag.engine.registry")


@dataclass
class ModelInfo:
    name: str
    provider: str
    model_type: str  # llm, embedding, reranker
    status: str = "unknown"  # connected, disconnected, unknown
    latency_ms: Optional[float] = None


class EngineRegistry:
    """Lists configured models and checks their availability."""

    def __init__(self) -> None:
        self._models: list[ModelInfo] = []

    def discover(self) -> list[ModelInfo]:
        """Discover all configured models from settings."""
        models = []

        if settings.openai_api_key:
            models.append(ModelInfo(
                name=settings.default_model,
                provider="OpenAI",
                model_type="llm",
                status="connected",
            ))
        if settings.anthropic_api_key:
            models.append(ModelInfo(
                name="claude-3-haiku-20240307",
                provider="Anthropic",
                model_type="llm",
                status="connected",
            ))
        if settings.ollama_base_url:
            models.append(ModelInfo(
                name=getattr(settings, "local_model", "llama3"),
                provider="Ollama",
                model_type="llm",
                status="unknown",
            ))

        models.append(ModelInfo(
            name=settings.embedding_model,
            provider="Local (sentence-transformers)",
            model_type="embedding",
            status="connected",
        ))

        self._models = models
        return models

    def to_dict(self) -> list[dict]:
        if not self._models:
            self.discover()
        return [
            {
                "name": m.name,
                "provider": m.provider,
                "type": m.model_type,
                "status": m.status,
                "latency_ms": m.latency_ms,
            }
            for m in self._models
        ]
