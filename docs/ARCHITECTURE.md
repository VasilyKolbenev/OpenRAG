# OpenRAG Architecture

## 5-Primitive Model

OpenRAG decomposes every RAG pipeline into 5 universal primitives. Each strategy is a unique composition of these primitives.

| # | Primitive | Responsibility | Key Components |
|---|-----------|---------------|----------------|
| 1 | **Ingest** | Parse documents, chunk text, compute embeddings | DocumentProcessor, EmbeddingService |
| 2 | **Store** | Persist vectors, graph triples, relational data | VectorStore (Qdrant), GraphStore (Neo4j), PostgreSQL |
| 3 | **Retrieve** | Search, rank, filter relevant chunks | VectorStore.search, ColBERT reranker, graph traversal |
| 4 | **Reason** | Route queries, plan retrieval, judge relevance | Strategy orchestration, CRAG grading, sufficiency check |
| 5 | **Generate** | Produce answers via LLM, stream tokens | LLMService, SSE streaming |

### Mapping from OpenJarvis Primitives

| OpenJarvis | OpenRAG | Notes |
|------------|---------|-------|
| Ingest | Ingest | Same: parse + chunk + embed |
| Store | Store | Extended: vector + graph + SQL |
| Retrieve | Retrieve | Extended: reranking, graph traversal |
| Reason | Reason | New: strategy routing, CRAG grading, context sufficiency |
| Generate | Generate | Same: LLM completion + streaming |

## Data Flow

```
User Query
    │
    ▼
┌──────────┐     ┌────────────┐     ┌────────────┐
│ API Layer │────▶│ Orchestrator│────▶│  Strategy   │
│ (FastAPI) │     │  (Factory)  │     │ (selected)  │
└──────────┘     └────────────┘     └──────┬─────┘
                                           │
                      ┌────────────────────┼────────────────────┐
                      ▼                    ▼                    ▼
                ┌──────────┐       ┌──────────────┐     ┌────────────┐
                │ Retrieve │       │    Reason     │     │  Generate  │
                │ (vector  │       │ (judge, plan, │     │ (LLM call, │
                │  search) │       │  grade docs)  │     │  stream)   │
                └──────────┘       └──────────────┘     └────────────┘
                      │                    │                    │
                      ▼                    ▼                    ▼
                ┌──────────┐       ┌──────────────┐     ┌────────────┐
                │  Qdrant  │       │   LiteLLM    │     │  Response  │
                │  Neo4j   │       │  (grading)   │     │  + Trace   │
                └──────────┘       └──────────────┘     └────────────┘
```

Every query generates a pipeline trace (accessible via `GET /traces/{id}`) that records timing and output at each step.

## Directory Structure

```
backend/
├── app/
│   ├── main.py                 # App factory with lifespan (init/cleanup)
│   ├── config.py               # pydantic-settings BaseSettings
│   ├── api/v1/                 # API routers
│   │   ├── health.py           # Health checks (Postgres, Redis, Qdrant, Neo4j)
│   │   ├── query.py            # POST /query, POST /query/stream
│   │   ├── documents.py        # Document upload and management
│   │   ├── collections.py      # Vector collection CRUD
│   │   ├── strategies.py       # GET /strategies
│   │   ├── traces.py           # Pipeline trace viewer
│   │   ├── graph.py            # Graph explorer
│   │   ├── metrics.py          # Quality metrics
│   │   └── advisor.py          # AI strategy advisor
│   ├── services/               # Core services
│   │   ├── embedding.py        # Sentence-transformers embedding
│   │   ├── llm.py              # LiteLLM wrapper (OpenAI, Anthropic, Ollama)
│   │   ├── vector_store.py     # Qdrant client
│   │   ├── graph_store.py      # Neo4j client (optional)
│   │   ├── cache.py            # Redis cache
│   │   ├── tracing.py          # Pipeline trace recording
│   │   ├── document_processor.py  # Parse, chunk, embed pipeline
│   │   └── evaluation.py       # RAGAS metrics
│   ├── strategies/             # RAG strategies
│   │   ├── base.py             # BaseRAGStrategy (abstract)
│   │   ├── factory.py          # Strategy registry + factory
│   │   ├── naive.py            # Simple vector search
│   │   ├── hybrid.py           # Keyword + semantic + reranking
│   │   ├── graph_rag.py        # Neo4j graph traversal
│   │   ├── agentic.py          # Multi-step reasoning agent
│   │   ├── memo_rag.py         # Dual-system memory RAG
│   │   └── corrective.py       # Document grading + web fallback
│   ├── models/                 # SQLAlchemy models
│   ├── schemas/                # Pydantic request/response schemas
│   ├── middleware/             # Logging, telemetry, tenant isolation
│   └── workers/                # Celery tasks (document processing)
├── tests/                      # pytest test suite
├── alembic/                    # Database migrations
└── requirements.txt

frontend/
├── src/
│   ├── components/             # React components (TraceViewer, CompareView, etc.)
│   ├── pages/                  # Page-level components
│   ├── stores/                 # Zustand state management
│   ├── hooks/                  # Custom hooks (useStreamQuery)
│   └── lib/                    # API client, utilities
└── package.json

cli/
├── __init__.py
├── main.py                     # Typer CLI app
├── commands/                   # Command modules
└── mcp_server.py               # MCP server (stdio transport)

infra/
├── prometheus/prometheus.yml
├── grafana/dashboards/
├── otel/config.yaml
└── postgres/init.sql
```

## Key Design Decisions

1. **Strategy pattern**: All RAG strategies inherit from `BaseRAGStrategy` and are registered in a factory. The API layer is strategy-agnostic.

2. **Tracing by default**: Every strategy execution records a pipeline trace with step-level timing. This powers the RAG Debugger without any opt-in configuration.

3. **Graceful degradation**: Neo4j is optional. If unavailable, Graph RAG is disabled but all other strategies work. Redis loss only affects caching.

4. **LiteLLM abstraction**: All LLM calls go through LiteLLM, allowing transparent switching between OpenAI, Anthropic, and Ollama with a single config change.

5. **Local embeddings**: Embeddings run locally via sentence-transformers (all-MiniLM-L6-v2, 384 dimensions). No external API calls for embedding, reducing cost and latency.

6. **Async throughout**: FastAPI + SQLAlchemy async + async Qdrant/Neo4j clients. Celery workers use `asyncio.run()` as a bridge for synchronous task execution.

7. **MCP as first-class interface**: The MCP server exposes the same capabilities as the REST API, making OpenRAG accessible from AI assistants without custom integration code.

## How to Add a New RAG Strategy

1. Create a new file in `backend/app/strategies/`:

```python
from app.strategies.base import BaseRAGStrategy


class MyStrategy(BaseRAGStrategy):
    """Description of the strategy."""

    strategy_id = "my_strategy"
    name = "My Strategy"
    description = "What this strategy does"

    async def retrieve(self, query: str, top_k: int = 5) -> list[dict]:
        # Implement retrieval logic using self.vector_store, self.graph_store, etc.
        ...

    async def generate(self, query: str, context: list[dict]) -> str:
        # Implement generation logic using self.llm_service
        ...
```

2. Register it in `backend/app/strategies/factory.py`:

```python
from app.strategies.my_strategy import MyStrategy

STRATEGY_REGISTRY = {
    # ... existing strategies
    "my_strategy": MyStrategy,
}
```

3. Add tests in `backend/tests/test_strategies/test_my_strategy.py`.

The strategy will automatically appear in `GET /strategies` and be available via `POST /query` with `"strategy": "my_strategy"`.

## How to Add a New MCP Tool

1. Define the tool in `cli/mcp_server.py`:

```python
@server.tool("openrag_my_tool")
async def my_tool(params: dict) -> str:
    """Description of what this tool does."""
    response = await api_client.post("/my-endpoint", json=params)
    return format_response(response)
```

2. The tool will be automatically discovered by MCP clients on next connection.

3. Document the tool in `docs/MCP.md` with parameters and usage examples.
