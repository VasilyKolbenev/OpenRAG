# OpenRAG MCP Integration

## What is MCP

Model Context Protocol (MCP) is an open standard for connecting AI assistants to external tools and data sources. OpenRAG implements an MCP server that exposes RAG capabilities as tools, allowing any MCP-compatible client (Claude Desktop, Cursor, etc.) to query documents, upload files, and compare strategies directly from the AI chat interface.

## Setup

### Claude Desktop

Add to your `claude_desktop_config.json`:

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

Transport: **stdio** (default). The CLI starts the MCP server as a subprocess and communicates via stdin/stdout.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENRAG_API_URL` | `http://localhost:8000` | OpenRAG API base URL |
| `OPENRAG_API_KEY` | (none) | API key for authentication |

## Available Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `openrag_query` | Execute a RAG query | `query` (str), `strategy` (str, optional), `collection` (str, optional), `top_k` (int, optional) |
| `openrag_upload` | Upload a document | `file_path` (str), `collection` (str, optional) |
| `openrag_strategies` | List available RAG strategies | (none) |
| `openrag_compare` | A/B compare strategies | `query` (str), `strategies` (list[str]), `collection` (str, optional) |
| `openrag_collections` | List vector collections | (none) |
| `openrag_status` | Check service health | (none) |

## Available Resources

MCP resources provide read-only data that clients can subscribe to.

| URI | Description |
|-----|-------------|
| `openrag://metrics` | Current RAGAS quality metrics |
| `openrag://traces/{id}` | Pipeline trace for a specific query |

## Usage Examples

### Query documents

In Claude Desktop, after connecting OpenRAG:

> "Search my documentation for information about vector indexing"

Claude will call `openrag_query` with the appropriate parameters and return the RAG-augmented answer with sources.

### Compare strategies

> "Compare naive and hybrid strategies for: What is chunking?"

Claude will call `openrag_compare` and present results from both strategies side-by-side.

### Upload a document

> "Upload the file at /path/to/report.pdf to the research collection"

Claude will call `openrag_upload` to ingest the document.

### Check system status

> "Is OpenRAG running? Check the health of all services."

Claude will call `openrag_status` and report the health of PostgreSQL, Redis, Qdrant, and Neo4j.

## How It Works

1. The `openrag mcp` command starts a long-running MCP server using stdio transport
2. The MCP client (Claude Desktop) spawns the process and sends JSON-RPC messages via stdin
3. Each tool call maps to an OpenRAG REST API call under the hood
4. Results are returned as structured content (text + optional metadata)

The MCP server is stateless -- all state lives in the OpenRAG API backend.
