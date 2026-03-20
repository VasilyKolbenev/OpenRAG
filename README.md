<p align="center">
  <h1 align="center">OpenRAG</h1>
  <p align="center"><strong>Open-source RAG platform with 5-primitive architecture: Intelligence · Engine · Agents · Tools · Learning</strong></p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/python-3.12-blue" alt="Python">
  <img src="https://img.shields.io/badge/license-Apache--2.0-green" alt="License">
  <img src="https://img.shields.io/badge/strategies-6-orange" alt="Strategies">
  <img src="https://img.shields.io/badge/MCP-enabled-blueviolet" alt="MCP">
  <img src="https://img.shields.io/badge/docker-compose-2496ED" alt="Docker">
</p>

---

## Architecture

```
                    ┌─────────────────────────────────┐
                    │          Applications            │
                    │   CLI  /  Web UI  /  MCP Client  │
                    └───────────────┬──────────────────┘
                                    │
                    ┌───────────────▼──────────────────┐
                    │         API  Gateway              │
                    │   FastAPI  +  Auth  +  Tracing    │
                    └───────────────┬──────────────────┘
                                    │
          ┌─────────┬───────────┬───┴───┬───────────┬─────────┐
          ▼         ▼           ▼       ▼           ▼         ▼
     ┌─────────┐ ┌──────┐ ┌────────┐ ┌──────┐ ┌────────┐ ┌──────┐
     │ Ingest  │ │Store │ │Retrieve│ │Reason│ │Generate│ │Eval  │
     │(parse,  │ │(vec, │ │(search,│ │(route│ │(LLM +  │ │(RAGAS│
     │ chunk,  │ │graph,│ │ rank,  │ │plan, │ │stream) │ │trace)│
     │ embed)  │ │ SQL) │ │filter) │ │judge)│ │        │ │      │
     └─────────┘ └──────┘ └────────┘ └──────┘ └────────┘ └──────┘
       Primitive    Primitive  Primitive  Primitive  Primitive
          1            2          3          4          5
```

Every RAG strategy is a composition of these 5 primitives. Add a new strategy by wiring them differently.

## 5 Primitives

| Primitive | What It Does |
|-----------|-------------|
| **Intelligence** | 6 RAG strategies + AI Advisor that auto-recommends the best approach for your data |
| **Engine** | Embedding runtime (local MiniLM), vector store (Qdrant), LLM inference (LiteLLM) |
| **Agents** | Background document processing — parse, chunk, embed, index automatically |
| **Tools & Memory** | MCP server (6 tools), CLI (8 commands), semantic memory via Redis |
| **Learning** | Pipeline tracing for every query — analyze, debug, and optimize your RAG pipeline |

## Features

- **6 RAG strategies** -- Simple, Hybrid, Graph, Agentic, MemoRAG, Corrective RAG
- **AI Strategy Advisor** -- Full-page AI that analyzes your use case and recommends the optimal strategy
- **Pipeline tracing** -- Full step-by-step trace for every query (RAG Debugger)
- **A/B Compare** -- Run the same query through multiple strategies side-by-side
- **SSE streaming** -- Real-time token-by-token response streaming
- **MCP integration** -- Use OpenRAG as a tool from Claude Desktop or any MCP client
- **CLI** -- `openrag query`, `openrag compare`, `openrag upload` and more
- **Self-hosted** -- Your data never leaves your infrastructure
- **Multi-tenancy** -- Opt-in tenant isolation via JWT claims

## RAG Strategies

| Strategy | ID | Best For | Latency | Accuracy |
|----------|-----|----------|---------|----------|
| Simple RAG | `naive` | FAQ, single-doc Q&A, prototyping | Low | Medium |
| Hybrid RAG | `hybrid` | Enterprise search, general-purpose | Low-Med | High |
| Graph RAG | `graph` | Entity-rich domains (legal, medical) | Medium | High |
| Agentic RAG | `agentic` | Multi-hop reasoning, complex research | Med-High | Very High |
| MemoRAG | `memo` | Large collections, recurring patterns | Medium | High |
| Corrective RAG | `corrective` | High-stakes, source validation | Medium | High |

## Quick Start

```bash
# 1. Install CLI
pip install openrag

# 2. Initialize (interactive wizard — picks LLM provider, creates .env)
openrag init

# 3. Launch all services
openrag up
```

Open **http://localhost:3000** in your browser. API available at **http://localhost:8000**.

Requirements: Python 3.12+, Docker Engine 24+ with Compose v2.

## CLI Usage

```bash
# Query with a specific strategy
openrag query "What is retrieval augmented generation?" -s hybrid

# A/B compare two strategies
openrag compare "Explain vector search" -s naive -s hybrid

# Upload documents
openrag upload ./docs/

# Check service health
openrag status

# List available strategies
openrag strategies

# View a pipeline trace
openrag traces abc-123-def

# Start MCP server (for Claude Desktop)
openrag mcp
```

Full CLI reference: [docs/CLI.md](docs/CLI.md)

## MCP Integration

Use OpenRAG as a tool from Claude Desktop or any MCP-compatible client.

Add to your Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "openrag": {
      "command": "openrag",
      "args": ["mcp"],
      "env": {
        "OPENRAG_API_URL": "http://localhost:8000",
        "OPENRAG_API_KEY": "your-api-key"
      }
    }
  }
}
```

Available tools: `openrag_query`, `openrag_upload`, `openrag_strategies`, `openrag_compare`, `openrag_collections`, `openrag_status`.

Full MCP reference: [docs/MCP.md](docs/MCP.md)

## API Overview

| Group | Endpoint | Description |
|-------|----------|-------------|
| Health | `GET /api/health` | Service health (PostgreSQL, Redis, Qdrant, Neo4j) |
| Query | `POST /api/query` | RAG query with selected strategy |
| Stream | `POST /api/query/stream` | SSE streaming response |
| Compare | `POST /api/compare` | A/B test multiple strategies |
| Documents | `POST /api/documents/upload` | Upload PDF, DOCX, TXT, MD |
| Collections | `CRUD /api/collections` | Manage vector collections |
| Strategies | `GET /api/strategies` | List available strategies |
| Traces | `GET /api/traces/{id}` | Pipeline trace (RAG Debugger) |
| Advisor | `POST /api/advisor/chat` | AI strategy recommendation |

Full API reference: [docs/API.md](docs/API.md)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **API** | FastAPI, Uvicorn, Python 3.12, Pydantic v2 |
| **LLM** | LiteLLM (OpenAI, Anthropic, Ollama) |
| **Embeddings** | sentence-transformers (all-MiniLM-L6-v2, 384-dim, local) |
| **Vector Store** | Qdrant |
| **Graph Store** | Neo4j Community (optional, graceful degradation) |
| **Database** | PostgreSQL 16 + pgvector |
| **Cache / Queue** | Redis 7, Celery 5.4 |
| **Frontend** | React 18, TypeScript, Tailwind CSS, Zustand, Vite |
| **Observability** | structlog, OpenTelemetry, Prometheus, Grafana |
| **Infrastructure** | Docker Compose, Traefik, Alembic |
| **Integration** | MCP (Model Context Protocol), CLI |

## Documentation

- [Getting Started](docs/GETTING_STARTED.md) -- Installation, first steps, configuration
- [Architecture](docs/ARCHITECTURE.md) -- 5-primitive design, data flow, extension guide
- [API Reference](docs/API.md) -- All endpoints with request/response examples
- [CLI Reference](docs/CLI.md) -- All commands with usage examples
- [MCP Integration](docs/MCP.md) -- MCP tools, resources, and configuration
- [Deployment](docs/DEPLOYMENT.md) -- Docker Compose, production, SSL, backups

## License

Apache License 2.0. See [LICENSE](LICENSE) for details.
