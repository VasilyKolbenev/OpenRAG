# OpenRAG API Reference

Base URL: `http://localhost:8000/api`

Interactive docs (Swagger UI): `http://localhost:8000/docs`

## Authentication

All endpoints except `/api/health` require an API key:

```
X-API-Key: your-api-key
```

Set `OPENRAG_API_KEY` in your `.env` file or use the master key from configuration.

JWT authentication is available as an opt-in fallback:

```
Authorization: Bearer <jwt-token>
```

## Endpoints

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | No | Service health (PostgreSQL, Redis, Qdrant, Neo4j) |

Response:

```json
{
  "status": "healthy",
  "services": {
    "postgres": "healthy",
    "redis": "healthy",
    "qdrant": "healthy",
    "neo4j": "degraded"
  }
}
```

### Query

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/query` | Yes | Execute RAG query with selected strategy |
| POST | `/api/query/stream` | Yes | SSE streaming RAG query |

**POST /api/query**

Request:

```json
{
  "query": "What is retrieval augmented generation?",
  "strategy": "hybrid",
  "collection": "my-docs",
  "model": "gpt-4o",
  "top_k": 5,
  "temperature": 0.1,
  "check_sufficiency": false
}
```

Response:

```json
{
  "answer": "Retrieval augmented generation is...",
  "sources": [
    {"chunk_id": "abc-123", "text": "...", "score": 0.92, "metadata": {}}
  ],
  "trace_id": "trace-456",
  "strategy": "hybrid",
  "model": "gpt-4o",
  "latency_ms": 1250
}
```

**POST /api/query/stream**

Same request body. Returns `text/event-stream` (SSE):

```
data: {"token": "Retrieval"}
data: {"token": " augmented"}
data: {"token": " generation"}
data: {"done": true, "sources": [...], "trace_id": "abc-123"}
```

### Compare (A/B Testing)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/compare` | Yes | Run query through multiple strategies |

Request:

```json
{
  "query": "Explain vector search",
  "strategies": ["naive", "hybrid", "graph"],
  "collection": "my-docs"
}
```

Response:

```json
{
  "results": [
    {"strategy": "naive", "answer": "...", "sources": [...], "latency_ms": 800},
    {"strategy": "hybrid", "answer": "...", "sources": [...], "latency_ms": 1100},
    {"strategy": "graph", "answer": "...", "sources": [...], "latency_ms": 1400}
  ]
}
```

### Documents

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/documents/upload` | Yes | Upload document (PDF, DOCX, TXT, MD, CSV) |
| GET | `/api/documents` | Yes | List all documents |
| GET | `/api/documents/{id}` | Yes | Get document details |
| DELETE | `/api/documents/{id}` | Yes | Delete document and its chunks |

**POST /api/documents/upload**

Multipart form upload:

```bash
curl -X POST http://localhost:8000/api/documents/upload \
  -H "X-API-Key: your-key" \
  -F "file=@report.pdf" \
  -F "collection=research"
```

Response:

```json
{
  "document_id": "doc-789",
  "filename": "report.pdf",
  "status": "processing",
  "collection": "research",
  "task_id": "celery-task-abc"
}
```

### Collections

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/collections` | Yes | List all vector collections |
| POST | `/api/collections` | Yes | Create new collection |
| DELETE | `/api/collections/{name}` | Yes | Delete collection |

### Strategies

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/strategies` | Yes | List available RAG strategies with metadata |

Response:

```json
[
  {
    "id": "naive",
    "name": "Simple RAG",
    "description": "Basic vector similarity search",
    "latency": "low",
    "accuracy": "medium"
  }
]
```

### Pipeline Traces (RAG Debugger)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/traces/{trace_id}` | Yes | Get full pipeline trace |
| GET | `/api/traces` | Yes | List recent traces |

### AI Advisor

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/advisor/chat` | Yes | Chat with AI advisor for strategy recommendations |

Request:

```json
{
  "message": "I have technical documentation, ~500 pages",
  "session_id": "optional-session-id"
}
```

Response:

```json
{
  "reply": "For technical documentation of that size, I recommend...",
  "session_id": "session-abc",
  "recommendation": {
    "strategy": "hybrid",
    "confidence": 0.85,
    "reasoning": "Hybrid RAG balances keyword and semantic search..."
  }
}
```

## Error Responses

All errors follow a consistent format:

```json
{
  "detail": "Error description",
  "status_code": 400
}
```

| Code | Meaning |
|------|---------|
| 400 | Bad request (invalid parameters) |
| 401 | Unauthorized (missing or invalid API key / JWT) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Resource not found |
| 413 | Payload too large (file upload exceeds limit) |
| 422 | Validation error (Pydantic schema mismatch) |
| 429 | Rate limit exceeded |
| 500 | Internal server error |
| 503 | Service unavailable (dependency down) |
