# OpenRAG — Getting Started

## 1. Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Docker Engine | 24+ with Compose v2 | `docker compose version` to verify |
| Python | 3.12+ | Required only for CLI or local development |
| Node.js | 18+ | Required only for frontend development |
| LLM API key | Any one of: OpenAI, Anthropic, or Ollama running locally | Routed through LiteLLM |

Embedding runs locally using `all-MiniLM-L6-v2` (384 dimensions, ~80 MB). No external API is needed for embeddings.

Neo4j is optional. If unavailable, Graph RAG is disabled automatically; all other strategies work without it.

## 2. Quick Start

```bash
# Clone and enter the project
git clone <repo-url> && cd serpent-rag-platform

# Copy environment config and set your LLM API key
cp .env.example .env
# Edit .env — set at least OPENAI_API_KEY or ANTHROPIC_API_KEY

# Start all services
docker compose up -d
```

Wait roughly 30 seconds for services to initialize. Verify:

```bash
curl http://localhost:8000/api/health
```

A healthy response returns `{"status": "ok"}` with component statuses for PostgreSQL, Redis, and Qdrant.

## 3. First Steps

### Open the UI

Navigate to **http://localhost:3000** in your browser. The dashboard shows system status, active collections, and pipeline metrics.

### Upload a document

1. Go to **Documents** in the sidebar.
2. Click **Upload**, select a PDF or DOCX file.
3. The file is parsed, chunked, embedded, and indexed via the Celery worker pipeline. Progress is visible in the UI.

Alternatively, via API:

```bash
curl -X POST http://localhost:8000/api/documents/upload \
  -F "file=@report.pdf" \
  -F "collection_id=default"
```

### Ask a question

Enter a query in the **Query** panel. Select a strategy from the dropdown (defaults to Hybrid). Responses stream in real time via SSE.

Via API:

```bash
curl -X POST http://localhost:8000/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What are the key findings?", "strategy": "hybrid"}'
```

### Explore the API

Full interactive documentation is available at **http://localhost:8000/docs** (Swagger UI).

## 4. Understanding the 5 Primitives

OpenRAG is built on five architectural primitives that separate concerns across the retrieval-augmented generation pipeline.

**Intelligence** — The LLM layer. All model calls are routed through LiteLLM, which provides a unified interface to OpenAI, Anthropic, and Ollama. Swap providers by changing a single environment variable.

**Engine** — The retrieval and ranking core. Handles vector search (Qdrant), graph traversal (Neo4j), BM25 keyword search, and reranking (ColBERT or cross-encoder). Each RAG strategy composes these engines differently.

**Agents** — Orchestration logic that coordinates multi-step reasoning. The Agentic RAG strategy uses tool-calling agents that decide when to retrieve, when to search the web, and when to answer. The AI Advisor chatbot is also agent-driven.

**Tools & Memory** — External capabilities (web search, document parsing) and persistent state (Redis cache, conversation history, MemoRAG's global memory). Tools extend what agents can do; memory retains context across interactions.

**Learning** — Evaluation and feedback. RAGAS quality metrics, pipeline tracing, and A/B comparison provide data to measure and improve retrieval quality over time.

## 5. Choosing a Strategy

| Strategy | Best for | How it works | Requires |
|---|---|---|---|
| **Simple (Naive)** | Quick prototyping, small collections | Top-k vector similarity search, pass to LLM | Qdrant |
| **Hybrid** | General-purpose production use | Vector + BM25 keyword search, reciprocal rank fusion, optional ColBERT reranking | Qdrant |
| **Graph** | Entity-rich domains (legal, biomedical) | Extracts entities/relations, traverses Neo4j knowledge graph, combines with vector results | Qdrant + Neo4j |
| **Agentic** | Complex multi-step questions | LLM-as-agent decides retrieval actions, can call tools iteratively | Qdrant |
| **MemoRAG** | Repeated queries over stable corpora | Builds global memory with a light LLM, generates retrieval clues, clue-guided search | Qdrant + Redis |
| **Corrective RAG** | High-precision requirements | Grades each retrieved document for relevance, discards low-quality results, optional web search fallback | Qdrant |

Pass the strategy name in API requests: `"strategy": "hybrid"`. In the UI, select from the strategy dropdown.

## 6. CLI Usage

The `openrag` CLI provides direct access to all platform capabilities.

```bash
# Start all services
openrag up

# Stop all services
openrag down

# Initialize a new project with default config
openrag init

# Check service status
openrag status

# Upload a document
openrag upload report.pdf --collection default

# Run a query
openrag query "What are the main risks?" --strategy hybrid

# Compare strategies side by side
openrag compare "Summarize the findings" --strategies naive,hybrid,graph

# List available strategies
openrag strategies

# View pipeline trace by ID
openrag traces <trace-id>

# Start the API server (without Docker)
openrag serve

# Launch MCP server for Claude Desktop
openrag mcp
```

## 7. MCP Integration

OpenRAG exposes an MCP server with 6 tools for integration with Claude Desktop via stdio transport.

### Setup

Add to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "openrag": {
      "command": "openrag",
      "args": ["mcp"],
      "transport": "stdio"
    }
  }
}
```

### Available MCP Tools

| Tool | Description |
|---|---|
| `query` | Run a RAG query against your documents |
| `upload` | Upload and index a document |
| `compare` | Compare results across multiple strategies |
| `status` | Check platform health and service status |
| `strategies` | List available RAG strategies |
| `traces` | Retrieve pipeline trace details |

Once configured, Claude Desktop can search your documents, compare strategies, and inspect traces directly from the chat interface.

## 8. Configuration

Key environment variables in `.env`:

### LLM

| Variable | Default | Description |
|---|---|---|
| `LLM_PROVIDER` | `openai` | LLM provider: `openai`, `anthropic`, `ollama` |
| `LLM_MODEL` | `gpt-4o-mini` | Model name passed to LiteLLM |
| `OPENAI_API_KEY` | — | Required if using OpenAI |
| `ANTHROPIC_API_KEY` | — | Required if using Anthropic |
| `OLLAMA_BASE_URL` | `http://ollama:11434` | Ollama endpoint |

### Embedding

| Variable | Default | Description |
|---|---|---|
| `EMBEDDING_MODEL` | `all-MiniLM-L6-v2` | Sentence Transformers model |
| `EMBEDDING_DIMENSIONS` | `384` | Must match the model output |

### Infrastructure

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://...` | PostgreSQL connection string |
| `REDIS_URL` | `redis://redis:6379/0` | Redis connection string |
| `QDRANT_URL` | `http://qdrant:6333` | Qdrant vector store URL |
| `NEO4J_URI` | `bolt://neo4j:7687` | Neo4j connection (optional) |

### Auth

| Variable | Default | Description |
|---|---|---|
| `AUTH_ENABLED` | `false` | Enable authentication |
| `API_KEY` | — | Static API key for `X-API-Key` header |
| `JWT_SECRET` | — | Secret for JWT token validation |

### Features

| Variable | Default | Description |
|---|---|---|
| `MULTI_TENANCY_ENABLED` | `false` | Enable tenant isolation |
| `CRAG_WEB_SEARCH_ENABLED` | `false` | Enable web search fallback for Corrective RAG |
| `TAVILY_API_KEY` | — | Required if web search is enabled |

## 9. Troubleshooting

**Services fail to start or restart in a loop**
Check logs with `docker compose logs <service>`. Common cause: missing API keys in `.env`. The API container requires at least one LLM provider key.

**Embedding model takes too long to load**
Ensure `EMBEDDING_MODEL=all-MiniLM-L6-v2`. Larger models like BGE-M3 require significant memory and load time on CPU.

**File upload returns 413**
The default nginx body size limit may be too low. Ensure `client_max_body_size 50m;` is set in the nginx config.

**Qdrant collection dimension mismatch**
If you changed the embedding model, delete existing collections in Qdrant and re-upload documents. The `EMBEDDING_DIMENSIONS` value must match the model output.

**Neo4j connection refused**
Neo4j is optional. If not running, Graph RAG is automatically disabled. Other strategies are unaffected.

**Health check shows component as unhealthy**
Run `curl http://localhost:8000/api/health` and inspect the per-component status. Each component (PostgreSQL, Redis, Qdrant, Neo4j) reports independently.

**Frontend shows blank page or API errors**
Verify the API is reachable at `http://localhost:8000/api/health`. If running the frontend in dev mode, ensure the proxy target in `vite.config.ts` points to the correct API host.

**Docker Compose v5 restart issues**
Docker Compose v5 may ignore `start_period` in health checks, causing premature restarts. The production config uses dependency ordering instead of health-check gating.
