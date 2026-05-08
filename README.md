# OpenRAG Platform

Self-hosted document intelligence platform built around **three retrieval
engines**:

- **LightRAG** — fast dual-level retrieval for mixed corpora and general Q&A
- **AgenticRAG** — autonomous multi-step research with planning and reflection
- **GraphRAG** — knowledge-graph traversal for relationship-heavy reasoning

> The product surface is intentionally narrow: three engines, one advisor, one
> compare flow, one traceable runtime. Legacy strategy ids (`hybrid`, `naive`,
> `memo`, `corrective`, `wiki`) are still accepted at the API boundary and map
> back to the canonical engines.

## Product Positioning

OpenRAG is a market-ready RAG product, not a strategy catalog. Buyers pick the
right engine for their workload:

| Engine | Best for | Core behavior |
|---|---|---|
| `lightrag` | Enterprise search, mixed documents, multimodal-ready corpora | Dual-level retrieval with dense + sparse signals |
| `agentic` | Investigative research, multi-hop questions, audit-style work | Plan → retrieve → reflect → answer |
| `graph` | Legal, research, compliance, entity-heavy collections | Knowledge-graph traversal with multi-hop evidence |

All three engines share the same platform surface:

- AI advisor for engine recommendation
- Side-by-side compare view (up to three engines)
- Pipeline traces and quality dashboard
- REST API, web UI, and `openrag` CLI
- MCP integration for external agent clients

## Platform Optimizers

Two optimizer layers sit on top of the engines and apply across all of them:

| Optimizer | What it does in the current product |
|---|---|
| ReasoningBank-style memory | Stores retrieval lessons from prior runs and recalls them during later queries |
| TurboQuant controls | Exposes runtime quantization-style tuning knobs so deployments can balance latency and cost |

Optimizers are productized as engine controls, not as separate strategies.

## Why This Shape

OpenRAG used to ship many retrieval modes at once, which made the product
harder to explain, compare, and sell. The current direction simplifies the
message:

- default to `LightRAG` for most collections
- promote `AgenticRAG` when one question hides several sub-questions
- promote `GraphRAG` when relationships and explainability matter
- keep legacy strategy ids working through canonical alias mapping

Legacy ids accepted by the backend:

- `hybrid`, `naive`, `memo`, `wiki` → `lightrag`
- `corrective` → `graph`
- `agentic` is now its own canonical engine

The UI and API responses always normalize back to the canonical engine ids.

## Key Features

- Three-engine advisor that recommends `lightrag`, `agentic`, or `graph`
- Compare workflow that runs the same query against two or three engines
- Trace debugger for every query
- Document ingestion pipeline for PDFs, DOCX, TXT, MD, CSV, and JSON
- Optional Neo4j-backed graph mode
- MCP, CLI, and REST access paths
- Self-hosted deployment with full data sovereignty

## Quick Start

```bash
git clone <repo-url>
cd serpent-rag-platform
cp .env.example .env
# set at least one model provider key (OPENAI_API_KEY or ANTHROPIC_API_KEY)
docker compose up -d
```

Then open:

- UI: `http://localhost:3000`
- API docs: `http://localhost:8000/docs`
- Health: `http://localhost:8000/api/health`

## Query Examples

Use the canonical engine ids in new integrations:

```bash
openrag query "Summarize the main risks" -s lightrag
openrag query "Walk through every counterparty obligation" -s agentic
openrag query "Show related entities and obligations" -s graph
openrag compare "What are the main findings?" -s lightrag -s agentic -s graph
```

Sample API request:

```json
{
  "query": "What changed in the contract renewal clause?",
  "strategy": "lightrag",
  "collection": "contracts",
  "top_k": 10,
  "enable_reasoning_bank": true,
  "turboquant_enabled": true,
  "turboquant_bits": 4
}
```

## Operational Notes

- `GraphRAG` depends on Neo4j. If Neo4j is unavailable, fall back to `LightRAG`
  or `AgenticRAG`.
- The compare endpoint accepts two or three canonical engines per request.
- The strategy list endpoint returns `LightRAG`, `AgenticRAG`, and `GraphRAG`.

## Repository Map

| Path | Purpose |
|---|---|
| `backend/app` | Active FastAPI backend, schemas, services, and engine strategies |
| `frontend/src` | Active React UI |
| `backend/tests` | API and strategy test coverage for the active backend |
| `openrag` | Legacy package and CLI compatibility surface |
| `docs` | Product, architecture, and integration docs |

## Documentation

- [Getting Started](docs/GETTING_STARTED.md)
- [Architecture](docs/ARCHITECTURE.md)
- [API Reference](docs/API.md)
- [CLI Reference](docs/CLI.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Investor Demo Runbook](docs/INVESTOR_DEMO_RUNBOOK.md)
- [Production Readiness Backlog](docs/PROD_READINESS_BACKLOG.md)

## License

Apache License 2.0. See [LICENSE](LICENSE).
