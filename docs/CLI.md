# OpenRAG CLI Reference

The package and command name are `openrag`. The CLI is a thin wrapper over the
REST API.

## Install

```bash
pip install openrag
```

## Core Commands

### `openrag init`

Creates local configuration and walks through provider setup.

### `openrag up`

Starts the platform with Docker Compose.

```bash
openrag up
openrag up --prod
```

### `openrag down`

Stops the platform services.

### `openrag query`

Runs a single engine query.

```bash
openrag query "Summarize the main findings" -s lightrag
openrag query "Trace every counterparty obligation" -s agentic
openrag query "List related entities and obligations" -s graph -c legal
```

Canonical engine values:

- `lightrag`
- `agentic`
- `graph`

### `openrag compare`

Runs the same question through two or three canonical engines.

```bash
openrag compare "What changed in the renewal clause?" -s lightrag -s graph
openrag compare "Trace renewal obligations" -s lightrag -s agentic -s graph
```

The compare endpoint accepts between two and three strategies.

### `openrag upload`

Uploads files or directories for ingestion.

```bash
openrag upload ./report.pdf
openrag upload ./docs -c research
```

### `openrag status`

Shows service health.

### `openrag strategies`

Lists the active engines exposed by the API.

### `openrag traces`

Fetches a pipeline trace by id.

### `openrag mcp`

Starts the MCP server for external agent clients.

## Compatibility Note

Legacy strategy ids may still work against the backend, but new scripts should
only emit canonical ids:

- `lightrag`
- `agentic`
- `graph`

## Environment Variables

| Variable | Purpose |
|---|---|
| `OPENRAG_API_URL` | API base URL |
| `OPENRAG_API_KEY` | Bearer JWT used in the `Authorization` header when auth is enabled |
