<p align="center">
  <h1 align="center">OpenRAG</h1>
  <p align="center"><strong>Self-hosted RAG platform that eliminates the "which approach?" problem.<br>6 strategies. AI advisor. One platform.</strong></p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/python-3.12-blue" alt="Python">
  <img src="https://img.shields.io/badge/license-Apache--2.0-green" alt="License">
  <img src="https://img.shields.io/badge/strategies-6-orange" alt="Strategies">
  <img src="https://img.shields.io/badge/tests-211%20passed-brightgreen" alt="Tests">
  <img src="https://img.shields.io/badge/MCP-enabled-blueviolet" alt="MCP">
  <img src="https://img.shields.io/badge/docker-compose-2496ED" alt="Docker">
</p>

---

## The Problem

Every team building RAG faces the same question: **which retrieval strategy works best for our data?** Simple vector search? Hybrid with reranking? Graph-based? The answer depends on your documents, domain, and query patterns. Testing each approach means weeks of engineering.

## The Solution

OpenRAG ships **6 production-ready RAG strategies** with an AI advisor that auto-recommends the best approach. Upload your documents, let the advisor analyze your use case, and start querying. Compare strategies side-by-side. Inspect every pipeline step. All self-hosted, all open-source.

**3 commands to production:**

```bash
openrag init       # Configure LLM provider
openrag up         # Start all services
# Open http://localhost:3000
```

---

## Why OpenRAG

### vs. Frameworks (LangChain, LlamaIndex, Haystack)

Frameworks give you building blocks. OpenRAG gives you a **working product**. No assembly required. 6 strategies work out of the box with per-strategy system prompts, document-level filtering, and pipeline tracing.

### vs. Managed SaaS (Vectara, Cohere RAG)

SaaS means vendor lock-in, per-seat fees, and data leaving your infrastructure. OpenRAG is **self-hosted**: your data stays on your servers. Zero per-seat costs. Bring your own LLM (OpenAI, Anthropic, or local via Ollama).

### vs. Open-Source RAG (RAGFlow, Dify, R2R)

Other open-source tools offer 1-2 strategies. OpenRAG offers **6 strategies** including MemoRAG (dual-system memory) and Corrective RAG (document grading with web fallback) that no competitor provides. Plus an AI advisor, A/B comparison, and per-strategy tuning.

### Feature Comparison

| Capability | LangChain | LlamaIndex | Haystack | Dify | RAGFlow | **OpenRAG** |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Ready-made RAG strategies | - | - | - | 1 | 2 | **6** |
| AI Strategy Advisor | - | - | - | - | - | **yes** |
| A/B Strategy Comparison | - | - | - | - | - | **yes** |
| Pipeline Trace Debugger | paid | - | - | - | - | **built-in** |
| Per-strategy system prompts | - | - | - | - | - | **yes** |
| Document-level filtering | - | - | - | partial | partial | **yes** |
| MCP integration (Claude Desktop) | - | - | - | partial | - | **yes** |
| MemoRAG + Corrective RAG | - | - | - | - | - | **yes** |
| ColBERT reranking | - | DIY | - | - | - | **built-in** |
| Self-hosted, zero per-seat fees | - | - | partial | yes | yes | **yes** |
| Multi-tenancy | - | - | - | - | - | **opt-in** |

---

## 5-Primitive Architecture

OpenRAG decomposes every RAG pipeline into 5 universal primitives. Each strategy wires them differently.

```
                    ┌─────────────────────────────────┐
                    │          Applications            │
                    │   Web UI  /  CLI  /  MCP Client  │
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
     │ Ingest  │ │Store │ │Retrieve│ │Reason│ │Generate│ │ Eval │
     │(parse,  │ │(vec, │ │(search,│ │(route│ │(LLM +  │ │(trace│
     │ chunk,  │ │graph,│ │ rank,  │ │plan, │ │stream) │ │learn)│
     │ embed)  │ │ SQL) │ │filter) │ │judge)│ │        │ │      │
     └─────────┘ └──────┘ └────────┘ └──────┘ └────────┘ └──────┘
```

| Primitive | What It Does |
|-----------|-------------|
| **Intelligence** | 6 RAG strategies + AI Advisor that auto-recommends the best approach for your data |
| **Engine** | Local embeddings (MiniLM-L6-v2), Qdrant vector store, LLM via LiteLLM (cloud or local) |
| **Agents** | Background document processing — parse, chunk, embed, index automatically via Celery |
| **Tools & Memory** | MCP server (6 tools), CLI (8 commands), semantic memory via Redis |
| **Learning** | Pipeline tracing for every query — analyze, compare, and optimize your RAG pipeline |

---

## 6 RAG Strategies

Each strategy has its own **system prompt** optimized for answer quality, completeness, and citation style.

| Strategy | Best For | How It Works | Latency |
|----------|----------|-------------|---------|
| **Simple RAG** | FAQ, single-doc Q&A | Vector search → LLM | ~3s |
| **Hybrid RAG** | Enterprise search | BM25 + vector + ColBERT reranking | ~8s |
| **Graph RAG** | Entity-rich domains (legal, medical) | Knowledge graph traversal + vector | ~11s |
| **Agentic RAG** | Multi-hop reasoning, complex research | Autonomous multi-step planning | ~50s |
| **MemoRAG** | Large collections, recurring patterns | Global memory → clue generation → retrieval | ~5s |
| **Corrective RAG** | High-stakes, source validation | Document grading → web search fallback | ~20s |

**Document-level filtering**: query a specific document or search across the entire collection. Per-request, per-strategy.

---

## Key Features

### AI Strategy Advisor
Full-page conversational AI that interviews you about your use case and recommends the optimal strategy with reasoning. Not a static wizard — a real conversation with an LLM.

### A/B Strategy Comparison
Run the same query through 2-4 strategies simultaneously. See answers, sources, and latency side-by-side. Data-driven strategy selection.

### RAG Pipeline Debugger
Every query generates a detailed pipeline trace: retrieval scores, chunk content, LLM prompts, timing per step. Debug retrieval quality visually.

### Model Provider Flexibility
Connect cloud LLMs (OpenAI GPT-5.4, Anthropic Claude 4.5) or self-hosted models (Ollama, vLLM, SGLang). Switch providers with a single config change via LiteLLM.

### MCP Integration
Use OpenRAG as a tool from Claude Desktop, Cursor, or any MCP client. 6 tools: query, upload, compare, strategies, collections, status.

### Chat History
Persistent chat sessions with strategy and document context. Switch between conversations. History saved in sidebar.

---

## Quick Start

**Requirements:** Python 3.12+, Docker Engine 24+ with Compose v2

```bash
# 1. Clone
git clone https://github.com/VasilyKolbenev/OpenRAG.git
cd OpenRAG

# 2. Configure
cp .env.example .env
# Edit .env: set OPENAI_API_KEY or ANTHROPIC_API_KEY

# 3. Launch
docker compose up -d

# Open http://localhost:3000
```

Or with the CLI:

```bash
pip install openrag
openrag init       # Interactive wizard
openrag up         # Docker Compose launch
```

---

## CLI

```bash
openrag query "What is RAG?" -s hybrid           # Query with strategy
openrag compare "Explain vector search" -s naive -s hybrid  # A/B compare
openrag upload ./docs/                             # Upload documents
openrag status                                     # Service health
openrag strategies                                 # List strategies
openrag traces <trace-id>                          # View pipeline trace
openrag mcp                                        # Start MCP server
```

## MCP Integration

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

## API

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Service health check |
| `POST /api/query` | RAG query with strategy + document filter |
| `POST /api/query/stream` | SSE streaming response |
| `POST /api/compare` | A/B test multiple strategies |
| `POST /api/documents/upload` | Upload PDF, DOCX, TXT, MD, CSV |
| `GET /api/strategies` | List available strategies |
| `GET /api/traces/{id}` | Pipeline trace (RAG Debugger) |
| `POST /api/advisor/chat` | AI strategy recommendation |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **API** | FastAPI, Uvicorn, Python 3.12, Pydantic v2 |
| **LLM** | LiteLLM (OpenAI, Anthropic, Ollama, vLLM, SGLang) |
| **Embeddings** | sentence-transformers (all-MiniLM-L6-v2, 384-dim, local) |
| **Vector Store** | Qdrant (distributed mode for scale) |
| **Graph Store** | Neo4j Community (optional, graceful degradation) |
| **Database** | PostgreSQL 16 + pgvector |
| **Cache / Queue** | Redis 7, Celery 5.4 |
| **Frontend** | React 18, TypeScript, Tailwind CSS, Zustand, Vite |
| **Observability** | structlog, OpenTelemetry, Prometheus, Grafana |
| **Security** | JWT + API key auth, CORS, rate limiting, container hardening |
| **Infrastructure** | Docker Compose, Traefik (TLS), Alembic (migrations) |

---

## Security

11 security layers implemented before first customer. Full details: [SECURITY.md](SECURITY.md)

- **Data sovereignty**: self-hosted = data never leaves your servers
- **Air-gapped support**: offline Docker images + local Ollama
- **Container hardening**: non-root, read-only FS, no-new-privileges
- **TLS**: automatic via Traefik + Let's Encrypt
- **DevSecOps CI/CD**: Bandit, Semgrep, Gitleaks, Trivy, pip-audit

---

## Documentation

| Doc | Description |
|-----|-------------|
| [Getting Started](docs/GETTING_STARTED.md) | Installation, first steps, configuration |
| [Architecture](docs/ARCHITECTURE.md) | 5-primitive design, data flow, extension guide |
| [API Reference](docs/API.md) | All endpoints with examples |
| [CLI Reference](docs/CLI.md) | All commands with usage |
| [MCP Integration](docs/MCP.md) | Claude Desktop setup, tools |
| [Deployment](docs/DEPLOYMENT.md) | Production, SSL, backups, scaling |
| [Roadmap](docs/ROADMAP.md) | Commercialization plan |

---

## License

Apache License 2.0. See [LICENSE](LICENSE) for details.
