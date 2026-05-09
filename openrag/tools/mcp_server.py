"""OpenRAG MCP Server — Model Context Protocol interface for RAG operations."""

import json
import logging
import os
from typing import Any

import httpx
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Resource, TextContent, Tool

logger = logging.getLogger("openrag.mcp")

API_URL = os.getenv("OPENRAG_API_URL", "http://localhost:8000")
API_KEY = os.getenv("OPENRAG_API_KEY", "")


def _headers() -> dict[str, str]:
    headers = {"Content-Type": "application/json"}
    if API_KEY:
        headers["X-API-Key"] = API_KEY
    return headers


TOOL_DEFINITIONS = [
    {"name": "openrag_query", "inputSchema": {"type": "object", "properties": {"query": {"type": "string"}, "strategy": {"type": "string"}, "collection": {"type": "string"}, "top_k": {"type": "integer"}}, "required": ["query"]}},
    {"name": "openrag_upload", "inputSchema": {"type": "object", "properties": {"content": {"type": "string"}, "filename": {"type": "string"}, "collection": {"type": "string"}}, "required": ["content", "filename"]}},
    {"name": "openrag_strategies", "inputSchema": {"type": "object", "properties": {}}},
    {"name": "openrag_compare", "inputSchema": {"type": "object", "properties": {"query": {"type": "string"}, "strategies": {"type": "array", "items": {"type": "string"}}}, "required": ["query", "strategies"]}},
    {"name": "openrag_collections", "inputSchema": {"type": "object", "properties": {"action": {"type": "string"}, "name": {"type": "string"}}, "required": ["action"]}},
    {"name": "openrag_status", "inputSchema": {"type": "object", "properties": {}}},
]

RESOURCE_DEFINITIONS = [
    {"uri": "openrag://metrics", "name": "Quality Metrics", "description": "Current RAG quality metrics"},
    {"uri": "openrag://traces/{trace_id}", "name": "Pipeline Trace", "description": "Pipeline trace data"},
]


def create_mcp_server() -> Server:
    """Create and configure the OpenRAG MCP server."""
    server = Server("openrag")

    @server.list_tools()
    async def list_tools() -> list[Tool]:
        return [
            Tool(
                name="openrag_query",
                description="Execute a RAG query against your document collection",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "The question to answer"},
                        "strategy": {
                            "type": "string",
                            "enum": ["naive", "hybrid", "graph", "agentic", "memo", "corrective"],
                            "description": "RAG strategy to use (default: naive)",
                        },
                        "collection": {"type": "string", "description": "Collection name (default: default)"},
                        "top_k": {"type": "integer", "description": "Number of results (default: 5)"},
                    },
                    "required": ["query"],
                },
            ),
            Tool(
                name="openrag_upload",
                description="Upload a document for ingestion into the RAG system",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "content": {"type": "string", "description": "Document content (text or base64)"},
                        "filename": {"type": "string", "description": "Filename with extension"},
                        "collection": {"type": "string", "description": "Target collection (default: default)"},
                    },
                    "required": ["content", "filename"],
                },
            ),
            Tool(
                name="openrag_strategies",
                description="List available RAG strategies with descriptions",
                inputSchema={"type": "object", "properties": {}},
            ),
            Tool(
                name="openrag_compare",
                description="Compare query results across multiple RAG strategies",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "The question to answer"},
                        "strategies": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "List of strategies to compare",
                        },
                    },
                    "required": ["query", "strategies"],
                },
            ),
            Tool(
                name="openrag_collections",
                description="Manage document collections",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "action": {"type": "string", "enum": ["list", "create", "delete"]},
                        "name": {"type": "string", "description": "Collection name (for create/delete)"},
                    },
                    "required": ["action"],
                },
            ),
            Tool(
                name="openrag_status",
                description="Check health of all OpenRAG services",
                inputSchema={"type": "object", "properties": {}},
            ),
        ]

    @server.call_tool()
    async def call_tool(name: str, arguments: dict[str, Any]) -> list[TextContent]:
        async with httpx.AsyncClient(base_url=API_URL, headers=_headers(), timeout=120) as client:
            if name == "openrag_query":
                resp = await client.post("/api/query", json={
                    "query": arguments["query"],
                    "strategy": arguments.get("strategy", "naive"),
                    "collection": arguments.get("collection", "default"),
                    "top_k": arguments.get("top_k", 5),
                })
            elif name == "openrag_strategies":
                resp = await client.get("/api/strategies")
            elif name == "openrag_compare":
                resp = await client.post("/api/compare", json={
                    "query": arguments["query"],
                    "strategies": arguments["strategies"],
                })
            elif name == "openrag_status":
                resp = await client.get("/api/health")
            elif name == "openrag_collections":
                action = arguments["action"]
                if action == "list":
                    resp = await client.get("/api/collections")
                elif action == "create":
                    resp = await client.post("/api/collections", json={"name": arguments["name"]})
                elif action == "delete":
                    resp = await client.delete(f"/api/collections/{arguments['name']}")
                else:
                    return [TextContent(type="text", text=f"Unknown action: {action}")]
            elif name == "openrag_upload":
                filename = arguments["filename"]
                content = arguments["content"].encode("utf-8")
                collection = arguments.get("collection", "default")
                # Backend expects multipart file upload
                resp = await client.post(
                    "/api/documents/upload",
                    files={"file": (filename, content, "text/plain")},
                    data={"collection": collection},
                )
            else:
                return [TextContent(type="text", text=f"Unknown tool: {name}")]

            resp.raise_for_status()
            return [TextContent(type="text", text=json.dumps(resp.json(), indent=2))]

    @server.list_resources()
    async def list_resources() -> list[Resource]:
        return [
            Resource(uri="openrag://metrics", name="Quality Metrics", description="Current RAG quality metrics"),
            Resource(uri="openrag://traces/{trace_id}", name="Pipeline Trace", description="Pipeline trace data (JSON)"),
        ]

    @server.read_resource()
    async def read_resource(uri: str) -> str:
        async with httpx.AsyncClient(base_url=API_URL, headers=_headers(), timeout=30) as client:
            if uri == "openrag://metrics":
                resp = await client.get("/api/metrics/quality")
                resp.raise_for_status()
                return json.dumps(resp.json(), indent=2)
            if uri.startswith("openrag://traces/"):
                trace_id = uri.split("/")[-1]
                resp = await client.get(f"/api/traces/{trace_id}")
                resp.raise_for_status()
                return json.dumps(resp.json(), indent=2)
            return f"Unknown resource: {uri}"

    return server


async def run_stdio():
    """Run MCP server with stdio transport."""
    server = create_mcp_server()
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())
