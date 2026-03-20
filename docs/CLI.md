# OpenRAG CLI Reference

## Installation

```bash
pip install openrag
```

Requires Python 3.12+.

## Commands

### `openrag init`

Interactive first-run wizard. Creates `.env` file and configures LLM provider.

```bash
openrag init
```

Prompts for:
- LLM provider (OpenAI, Anthropic, Ollama)
- API keys
- Embedding model preference
- Optional services (Neo4j, monitoring stack)

### `openrag serve`

Start the API server directly (without Docker).

```bash
openrag serve
openrag serve --host 0.0.0.0 --port 8000 --reload
```

| Flag | Default | Description |
|------|---------|-------------|
| `--host` | `127.0.0.1` | Bind address |
| `--port` | `8000` | Bind port |
| `--reload` | off | Auto-reload on code changes |
| `--workers` | `1` | Number of Uvicorn workers |

### `openrag up`

Start all services via Docker Compose.

```bash
openrag up           # Development mode (7 services)
openrag up --prod    # Production mode (+ Traefik, OTel, Prometheus, Grafana)
openrag up -d        # Detached mode
```

### `openrag down`

Stop all services.

```bash
openrag down
openrag down -v      # Also remove volumes
```

### `openrag query`

Execute a RAG query from the command line.

```bash
openrag query "What is retrieval augmented generation?"
openrag query "Explain vector search" -s hybrid
openrag query "Find related entities" -s graph -c my-docs --top-k 10
```

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--strategy` | `-s` | `hybrid` | RAG strategy to use |
| `--collection` | `-c` | `default` | Target collection |
| `--top-k` | `-k` | `5` | Number of chunks to retrieve |
| `--model` | `-m` | (config default) | LLM model override |
| `--json` | | off | Output raw JSON response |

### `openrag compare`

A/B compare multiple strategies on the same query.

```bash
openrag compare "Explain chunking" -s naive -s hybrid
openrag compare "What are embeddings?" -s naive -s hybrid -s graph -c research
```

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--strategy` | `-s` | (required, 2+) | Strategies to compare (repeat flag) |
| `--collection` | `-c` | `default` | Target collection |
| `--json` | | off | Output raw JSON |

### `openrag upload`

Upload documents for processing.

```bash
openrag upload ./report.pdf
openrag upload ./docs/ -c research
openrag upload ./data.csv --chunk-size 512
```

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--collection` | `-c` | `default` | Target collection |
| `--chunk-size` | | `1000` | Chunk size in tokens |
| `--chunk-overlap` | | `200` | Overlap between chunks |

Supported formats: PDF, DOCX, TXT, MD, CSV.

### `openrag status`

Check health of all services.

```bash
openrag status
```

Output:
```
OpenRAG Status
  API:        healthy (http://localhost:8000)
  PostgreSQL: healthy
  Redis:      healthy
  Qdrant:     healthy
  Neo4j:      degraded (optional, Graph RAG disabled)
```

### `openrag strategies`

List available RAG strategies with metadata.

```bash
openrag strategies
openrag strategies --json
```

### `openrag traces`

View a pipeline trace (RAG Debugger).

```bash
openrag traces <trace-id>
openrag traces abc-123-def --json
```

### `openrag mcp`

Start the MCP server for integration with Claude Desktop and other MCP clients.

```bash
openrag mcp
```

Uses stdio transport. See [MCP.md](MCP.md) for configuration details.

### `openrag apikey-create`

Generate a new API key.

```bash
openrag apikey-create --name dev
openrag apikey-create --name production --expires 90d
```

| Flag | Default | Description |
|------|---------|-------------|
| `--name` | (required) | Human-readable key name |
| `--expires` | never | Expiration (e.g., `30d`, `90d`, `1y`) |

### `openrag apikey-list`

List all API keys.

```bash
openrag apikey-list
```

### `openrag apikey-revoke`

Revoke an API key.

```bash
openrag apikey-revoke <key-id>
```

## Environment Variables

The CLI respects the following environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENRAG_API_URL` | `http://localhost:8000` | API base URL |
| `OPENRAG_API_KEY` | (none) | API key for authenticated requests |

These can also be set in a `.env` file in the current directory or via `openrag init`.
