# OpenRAG Architecture

## 5-Primitive Model

OpenRAG is built on 5 primitives. Each RAG strategy is a unique composition of these primitives.

| # | Primitive | Responsibility | Key Components |
|---|-----------|---------------|----------------|
| 1 | **Intelligence** | Strategy catalog, AI advisor, auto-recommendation | StrategyFactory, AdvisorService, 6 RAG strategies |
| 2 | **Engine** | Embedding, vector store, LLM inference runtime | EmbeddingService, LLMService, VectorStore, GraphStore |
| 3 | **Agents** | Background document processing, pipeline orchestration | Celery workers, DocumentProcessor, Evaluator |
| 4 | **Tools & Memory** | MCP integration, CLI, semantic memory, connectors | MCP Server (6 tools), Typer CLI (8 commands), Redis cache |
| 5 | **Learning** | Pipeline tracing, quality analysis, feedback loop | TracingService, EvaluationService, RAG Debugger |

## RAG Strategies

Each strategy composes the 5 primitives differently:

| Strategy | Retrieve | Reason | Generate | Special |
|----------|----------|--------|----------|---------|
| **Simple (naive)** | Vector search | — | LLM | Fastest, simplest |
| **Hybrid** | Vector + BM25 + reranker | Fusion scoring | LLM | Best general-purpose |
| **Graph** | Graph traversal + vector | Entity reasoning | LLM | Requires Neo4j |
| **Agentic** | Multi-step retrieval | Planning + reflection | LLM | Autonomous agent loop |
| **MemoRAG** | Clue-guided retrieval | Memory → clues | Light + Heavy LLM | Global collection memory |
| **Corrective** | Vector + grading | Relevance scoring | LLM | Web search fallback |

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

Every query generates a pipeline trace (accessible via `GET /api/traces/{id}`).

## Directory Structure

```
openrag/                        # Python package (5-primitive backend)
├── __init__.py
├── config.py                   # pydantic-settings configuration
├── server.py                   # FastAPI app factory + lifespan + seed
├── dependencies.py             # Auth dependencies (API key + JWT)
├── api/                        # API Layer
│   ├── router.py               # Main router aggregator
│   └── v1/                     # Versioned endpoints
│       ├── health.py           # GET /api/health
│       ├── query.py            # POST /api/query, POST /api/query/stream
│       ├── documents.py        # Document upload + CRUD
│       ├── collections.py      # Vector collection management
│       ├── strategies.py       # GET /api/strategies
│       ├── traces.py           # Pipeline trace viewer
│       ├── compare.py          # POST /api/compare
│       ├── graph.py            # Graph explorer
│       ├── metrics.py          # Quality metrics
│       └── advisor.py          # AI strategy advisor
├── intelligence/               # Primitive 1: Intelligence
│   ├── strategies/             # 6 RAG strategy implementations
│   │   ├── base.py             # BaseRAGStrategy (abstract)
│   │   ├── factory.py          # Strategy registry + factory
│   │   ├── naive.py            # Simple vector search
│   │   ├── hybrid.py           # Keyword + semantic + reranking
│   │   ├── graph_rag.py        # Neo4j graph traversal
│   │   ├── agentic.py          # Multi-step reasoning agent
│   │   ├── memo_rag.py         # Dual-system memory RAG
│   │   └── corrective.py       # Document grading + web fallback
│   └── advisor.py              # AI strategy recommendation
├── engine/                     # Primitive 2: Engine
│   ├── embedding.py            # Sentence-transformers (MiniLM-L6-v2)
│   ├── llm.py                  # LiteLLM wrapper (OpenAI, Anthropic, Ollama)
│   ├── vector_store.py         # Qdrant client
│   └── graph_store.py          # Neo4j client (optional)
├── agents/                     # Primitive 3: Agents
│   ├── evaluator.py            # Quality evaluation agent
│   └── workers/                # Celery background tasks
│       └── celery_app.py       # Document processing workers
├── tools/                      # Primitive 4: Tools & Memory
│   ├── mcp_server.py           # MCP server (6 tools, stdio transport)
│   └── cli.py                  # Typer CLI (8 commands)
├── learning/                   # Primitive 5: Learning
│   ├── tracing.py              # Pipeline trace recording
│   ├── evaluation.py           # RAGAS metrics
│   ├── analytics.py            # Usage analytics
│   └── feedback.py             # User feedback collection
├── services/                   # Shared services
│   ├── cache.py                # Redis cache
│   └── document_processor.py   # Parse, chunk, embed pipeline
├── models/                     # SQLAlchemy ORM models
├── schemas/                    # Pydantic request/response schemas
└── middleware/                 # Logging, telemetry, tenant isolation

frontend/                       # React 18 + TypeScript + Tailwind CSS
├── src/
│   ├── pages/
│   │   ├── DashboardPage.tsx   # Command Center (5-primitive cards)
│   │   ├── IntelligencePage.tsx # AI Advisor + Strategy Catalog
│   │   ├── ChatPage.tsx        # Query interface with streaming
│   │   ├── DocumentsPage.tsx   # Document management
│   │   ├── DebuggerPage.tsx    # Pipeline trace viewer
│   │   └── ComparePage.tsx     # A/B strategy comparison
│   ├── components/             # Reusable React components
│   ├── stores/                 # Zustand state management
│   ├── hooks/                  # Custom hooks (useStreamQuery)
│   └── lib/                    # API client, constants, utilities
└── package.json

seed/                           # Demo documents for first launch
docs/                           # Documentation
infra/                          # Infrastructure configs (Prometheus, Grafana, OTel)
tests/                          # pytest test suite (211 tests)
```

## UI Architecture (5-Primitive Mapping)

| Page | Route | Primitive | Purpose |
|------|-------|-----------|---------|
| Command Center | `/dashboard` | All 5 | Overview with primitive cards |
| AI Advisor | `/intelligence` | Intelligence | Strategy recommendation + catalog |
| Chat | `/chat` | Intelligence | Query with streaming |
| Compare | `/compare` | Intelligence | A/B strategy testing |
| Documents | `/documents` | Agents | Document ingest + management |
| Debugger | `/debugger` | Learning | Pipeline trace analysis |

## Key Design Decisions

1. **Strategy pattern**: All RAG strategies inherit from `BaseRAGStrategy` and are registered in a factory. The API layer is strategy-agnostic.

2. **Tracing by default**: Every strategy execution records a pipeline trace with step-level timing. This powers the RAG Debugger without opt-in.

3. **Graceful degradation**: Neo4j is optional. If unavailable, Graph RAG is disabled but all other strategies work.

4. **LiteLLM abstraction**: All LLM calls go through LiteLLM — switch between OpenAI, Anthropic, and Ollama with a config change.

5. **Local embeddings**: all-MiniLM-L6-v2 (384 dims, ~80 MB) runs locally. No external API calls for embedding.

6. **Async throughout**: FastAPI + async Qdrant/Neo4j clients. Celery workers bridge to async via `asyncio.run()`.

7. **MCP as first-class interface**: The MCP server exposes the same capabilities as the REST API.

8. **5-Primitive UI**: Dashboard organized around Intelligence/Engine/Agents/Tools/Learning — each card links to its corresponding feature.

## Adding a New Strategy

1. Create `openrag/intelligence/strategies/my_strategy.py`:

```python
from openrag.intelligence.strategies.base import BaseRAGStrategy

class MyStrategy(BaseRAGStrategy):
    strategy_id = "my_strategy"
    name = "My Strategy"

    async def retrieve(self, query: str, top_k: int = 5) -> list[dict]:
        ...

    async def generate(self, query: str, context: list[dict]) -> str:
        ...
```

2. Register in `openrag/intelligence/strategies/factory.py`
3. Add tests in `tests/test_strategies/`
4. Strategy auto-appears in `GET /api/strategies` and is available via `POST /api/query`
