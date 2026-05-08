# OpenRAG Getting Started

## Prerequisites

| Requirement | Notes |
|---|---|
| Docker Engine 24+ with Compose v2 | easiest way to run the full stack |
| Python 3.12+ | needed for CLI and local backend work |
| Node.js 18+ | needed for frontend development |
| At least one model provider key | OpenAI, Anthropic, or a local provider |

Neo4j is optional, but it is required if you want `GraphRAG`.

## Quick Start

```bash
git clone <repo-url>
cd serpent-rag-platform
cp .env.example .env
# configure at least one model provider
docker compose up -d
```

Check health:

```bash
curl http://localhost:8000/api/health
```

Open:

- UI: `http://localhost:3000`
- Swagger: `http://localhost:8000/docs`

## First Workflow

1. Upload one or more documents in the `Documents` page.
2. Start with `LightRAG` in the chat UI.
3. Switch to `AgenticRAG` when the question hides several sub-questions and
   needs deliberate research.
4. Switch to `GraphRAG` when the answer depends on entities, links, or lineage.
5. Use the compare page to run two or all three engines on the same question.
6. Open the debugger to inspect the pipeline trace.

## Choosing an Engine

| Engine | Use it when | Operational note |
|---|---|---|
| `LightRAG` | you want the default for PDFs, notes, tables, and mixed corpora | lowest-friction starting point |
| `AgenticRAG` | one question hides several sub-questions and you need a reasoning trail | bounded by an iteration cap |
| `GraphRAG` | you need explainable traversal across related entities | requires Neo4j |

All three engines can use:

- ReasoningBank-style retrieval memory
- TurboQuant runtime controls

## API Example

```bash
curl -X POST http://localhost:8000/api/query \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"What changed in the policy?\",\"strategy\":\"lightrag\"}"
```

## CLI Example

```bash
openrag query "What changed in the policy?" -s lightrag
openrag query "Trace every counterparty obligation" -s agentic
openrag compare "Summarize the obligations" -s lightrag -s agentic -s graph
```

## Migration Note

Older strategy ids are still accepted by the backend for compatibility:

- `hybrid`, `naive`, `memo`, `wiki` map to `lightrag`
- `corrective` maps to `graph`
- `agentic` is now its own canonical engine (no longer aliased to `graph`)

New code should use only `lightrag`, `agentic`, and `graph`.

## Common Issues

### Neo4j unavailable

`GraphRAG` depends on Neo4j. If Neo4j is down, use `LightRAG` or `AgenticRAG`
until graph storage is restored.

### Uploads succeed but answers are weak

Open the debugger and compare traces. In most cases this means:

- the collection needs more relevant documents
- `LightRAG` needs a better query
- the task actually belongs in `AgenticRAG` (multi-step reasoning) or `GraphRAG`
  (entity traversal)

### Frontend cannot reach the backend

Verify:

```bash
curl http://localhost:8000/api/health
```

If that succeeds, check the frontend proxy and environment configuration.
