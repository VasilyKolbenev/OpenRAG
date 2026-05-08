"""
OpenRAG — Configuration
Uses pydantic-settings for type-safe environment variable loading.
"""

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @model_validator(mode="after")
    def _validate_production_secrets(self) -> "Settings":
        """Prevent boot with insecure defaults in production."""
        if self.is_production:
            if self.jwt_secret == "change-me-in-production" or len(self.jwt_secret) < 32:
                raise ValueError(
                    "JWT_SECRET must be set to a strong secret (>= 32 chars) in production"
                )
            if not self.encryption_key or len(self.encryption_key) < 32:
                raise ValueError(
                    "ENCRYPTION_KEY must be set to a strong secret (>= 32 chars) in production"
                )
            if not self.admin_password or len(self.admin_password) < 12:
                raise ValueError(
                    "OPENRAG_ADMIN_PASSWORD must be set (>= 12 chars) to enable the auth flow in production"
                )
        return self

    # Database
    database_url: str = "postgresql+asyncpg://serpent:serpent@localhost:5432/serpent"
    redis_url: str = "redis://localhost:6379/0"

    # Vector Store
    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: str = ""

    # Graph Store
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = ""

    # LLM Providers
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    ollama_base_url: str = "http://localhost:11434"

    # Auth
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_hours: int = 24
    encryption_key: str = ""
    # OPENRAG_ADMIN_PASSWORD enables the built-in password -> JWT flow.
    # In production this is required; in development it stays empty so unauthenticated requests work.
    admin_password: str = ""

    # Application
    environment: str = "development"
    upload_dir: str = "/app/uploads"
    max_upload_size: int = 100 * 1024 * 1024  # 100MB
    frontend_url: str = "http://localhost:3000"
    domain: str = "localhost"
    log_level: str = "info"

    # Embedding
    embedding_provider: str = "local"  # local | openai
    embedding_model: str = "BAAI/bge-m3"
    embedding_dimensions: int = 1024

    # Quantization (Engine)
    quantization_enabled: bool = False
    quantization_oversampling: float = 2.0
    turboquant_enabled: bool = True
    turboquant_default_bits: int = 4

    # Web Search (CRAG)
    web_search_api_key: str = ""
    web_search_provider: str = "tavily"  # tavily | serpapi

    # RAG Defaults (C19: extracted magic numbers)
    default_top_k: int = 10
    default_temperature: float = 0.1
    default_model: str = "openai/gpt-5.4"
    advisor_model: str = "openai/gpt-5.4-mini"
    sufficiency_threshold: float = 0.7
    relevance_threshold: float = 0.7
    max_chat_history_messages: int = 20
    memo_memory_ttl: int = 86400  # 24h
    reasoning_bank_ttl: int = 604800  # 7d
    reasoning_bank_max_entries: int = 96
    advisor_session_ttl: int = 3600  # 1h
    chat_session_ttl: int = 14400  # 4h

    # Multi-Tenancy
    multi_tenancy_enabled: bool = False

    # Sync database URL for Celery workers
    @property
    def sync_database_url(self) -> str:
        return self.database_url.replace("+asyncpg", "+psycopg2").replace(
            "postgresql+psycopg2", "postgresql"
        )

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


settings = Settings()
