# OpenRAG API Reference

Base URL: `http://localhost:8000/api`

Interactive docs: `http://localhost:8000/docs`

## Canonical Engine IDs

Use these ids in new integrations:

- `lightrag`
- `agentic`
- `graph`

Legacy ids are still accepted for migration, but responses normalize to the
canonical ids.

## Authentication

Most endpoints require a bearer JWT when auth is enabled in production:

```text
Authorization: Bearer <jwt-token>
```

In development mode (`ENVIRONMENT=development`) auth is optional and protected
endpoints accept anonymous requests.

To obtain a token in production, use the auth flow exposed by the platform
(or your external IdP, if integrated). See `docs/DEPLOYMENT.md` for
configuration details.

## Core Endpoints

### `GET /api/health`

Returns service health for the runtime dependencies (PostgreSQL, Redis,
Qdrant, optional Neo4j).

### `POST /api/query`

Runs a single query through one engine.

Request example:

```json
{
  "query": "What are the main risks in the renewal clause?",
  "strategy": "lightrag",
  "collection": "contracts",
  "top_k": 10,
  "temperature": 0.1,
  "enable_reasoning_bank": true,
  "reasoning_memory_limit": 3,
  "turboquant_enabled": true,
  "turboquant_bits": 4
}
```

Response example:

```json
{
  "answer": "The main renewal risks are...",
  "sources": [
    {
      "content": "The agreement renews automatically unless...",
      "score": 0.91,
      "metadata": {
        "filename": "master-service-agreement.pdf"
      }
    }
  ],
  "strategy_used": "lightrag",
  "metadata": {
    "model": "openai/gpt-5.4",
    "top_k": 10,
    "chunks_retrieved": 6,
    "query_rewritten": false,
    "requested_strategy": "lightrag",
    "optimizers": {
      "reasoning_bank": true,
      "turboquant": true,
      "turboquant_bits": 4
    }
  },
  "latency_ms": 1284,
  "trace_id": "trace-123",
  "session_id": "session-456"
}
```

Supported query fields:

| Field | Purpose |
|---|---|
| `strategy` | `lightrag`, `agentic`, or `graph` |
| `max_hops` | Graph traversal depth (GraphRAG) |
| `entity_types` | Optional graph entity filter (GraphRAG) |
| `query_mode` | LightRAG retrieval mode (`local` / `global` / `hybrid`) |
| `sparse_weight` | LightRAG sparse retrieval balance |
| `enable_reranking` | Enable reranker hook |
| `enable_reasoning_bank` | Enable retrieval memory recall |
| `reasoning_memory_limit` | Number of recalled lessons |
| `turboquant_enabled` | Enable runtime quantization profile |
| `turboquant_bits` | Target bit-width for the runtime profile |

### `POST /api/query/stream`

Streaming variant of `/api/query`.

Typical event sequence:

```text
event: status
data: {"phase":"retrieving"}

event: sources
data: [...]

event: status
data: {"phase":"generating"}

event: token
data: {"text":"..."}

event: done
data: {"trace_id":"trace-123","latency_ms":1284,"strategy":"lightrag"}
```

### `POST /api/compare`

Runs the same query through two or three canonical engines.

Request example:

```json
{
  "query": "Summarize the obligations and linked entities",
  "strategies": ["lightrag", "agentic", "graph"],
  "collection": "contracts",
  "top_k": 10,
  "temperature": 0.1
}
```

Important:

- the compare schema accepts between **two** and **three** strategies
- duplicate or legacy ids are canonicalized before execution
- the response only contains canonical engine ids

Response example:

```json
{
  "query": "Summarize the obligations and linked entities",
  "results": [
    {
      "strategy": "lightrag",
      "answer": "...",
      "sources": [],
      "latency_ms": 920,
      "trace_id": "trace-a"
    },
    {
      "strategy": "agentic",
      "answer": "...",
      "sources": [],
      "latency_ms": 2180,
      "trace_id": "trace-b"
    },
    {
      "strategy": "graph",
      "answer": "...",
      "sources": [],
      "latency_ms": 1410,
      "trace_id": "trace-c"
    }
  ]
}
```

### `GET /api/strategies`

Returns the active product engines:

```json
{
  "strategies": [
    {
      "id": "lightrag",
      "name": "LightRAG",
      "description": "Dual-level retrieval with ReasoningBank guidance and TurboQuant-ready runtime profile",
      "complexity": 2,
      "latency": "low-medium",
      "accuracy": "high"
    },
    {
      "id": "agentic",
      "name": "AgenticRAG",
      "description": "Autonomous multi-step planning, tool use, and self-reflection for complex research questions",
      "complexity": 5,
      "latency": "medium-high",
      "accuracy": "very-high"
    },
    {
      "id": "graph",
      "name": "GraphRAG",
      "description": "Knowledge-graph traversal with ReasoningBank guidance for relationship-heavy questions",
      "complexity": 4,
      "latency": "medium",
      "accuracy": "high"
    }
  ]
}
```

### `POST /api/recommend`

Returns a rule-based recommendation across `lightrag`, `agentic`, and `graph`.

### `POST /api/advisor/chat`

Conversational advisor that interviews the user and returns a recommendation
object with:

- `recommended`
- `scores` (one entry per canonical engine)
- `reasoning`
- `settings`

## Document Endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/documents/upload` | Upload a document for processing |
| `GET` | `/api/documents` | List uploaded documents |
| `GET` | `/api/documents/{id}` | Fetch document details |
| `DELETE` | `/api/documents/{id}` | Remove a document and indexed chunks |
| `GET` | `/api/collections` | List collections |

## Error Model

Validation and runtime errors are returned through FastAPI's standard `detail`
payload. Typical statuses:

- `400` invalid request
- `401` unauthorized
- `404` not found
- `422` schema validation failed
- `429` rate limit exceeded
- `500` internal error
