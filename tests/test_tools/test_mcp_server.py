"""MCP server tool tests."""

import pytest

try:
    from openrag.tools.mcp_server import TOOL_DEFINITIONS, RESOURCE_DEFINITIONS
    HAS_MCP = True
except ImportError:
    HAS_MCP = False

pytestmark = pytest.mark.skipif(not HAS_MCP, reason="mcp package not installed")


def test_mcp_server_has_required_tools():
    tool_names = [t["name"] for t in TOOL_DEFINITIONS]
    assert "openrag_query" in tool_names
    assert "openrag_upload" in tool_names
    assert "openrag_strategies" in tool_names
    assert "openrag_status" in tool_names
    assert "openrag_compare" in tool_names
    assert "openrag_collections" in tool_names


def test_mcp_server_has_required_resources():
    resource_uris = [r["uri"] for r in RESOURCE_DEFINITIONS]
    assert "openrag://metrics" in resource_uris


def test_openrag_query_tool_has_required_params():
    query_tool = next(t for t in TOOL_DEFINITIONS if t["name"] == "openrag_query")
    props = query_tool["inputSchema"]["properties"]
    assert "query" in props
    assert "strategy" in props
