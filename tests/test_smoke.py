"""
Smoke / contract tests — verify integration points are wired correctly.
These catch the kind of bugs that slip through unit tests:
  - CLI uses correct API paths
  - MCP tool handlers call existing endpoints
  - Auth accepts API key as primary
  - Seed documents directory exists and has content
  - Frontend build stays green (checked separately via npm)
"""

import inspect
from pathlib import Path
from unittest.mock import patch

import pytest

from openrag.cli import app as cli_app, _api_get, _api_post

try:
    from openrag.tools.mcp_server import TOOL_DEFINITIONS
    HAS_MCP = True
except ImportError:
    HAS_MCP = False
    TOOL_DEFINITIONS = []


# ── CLI Contract Tests ──────────────────────────────


class TestCLIContract:
    """Verify CLI commands hit correct API paths (no /api/v1)."""

    def test_cli_api_get_uses_correct_base(self):
        """_api_get builds URLs with /api prefix, not /api/v1."""
        src = inspect.getsource(_api_get)
        assert "/api/v1" not in src, "CLI _api_get still uses /api/v1"
        assert "/api{path}" in src or '"/api"' in src

    def test_cli_api_post_uses_correct_base(self):
        """_api_post builds URLs with /api prefix, not /api/v1."""
        src = inspect.getsource(_api_post)
        assert "/api/v1" not in src, "CLI _api_post still uses /api/v1"

    def test_cli_upload_accepts_201(self):
        """Upload command accepts 201 status (backend returns 201 on success)."""
        from openrag.cli import upload
        src = inspect.getsource(upload)
        assert "201" in src, "CLI upload should accept 201 status code"

    def test_cli_upload_reads_id_field(self):
        """Upload response parsing uses 'id' not 'document_id'."""
        from openrag.cli import upload
        src = inspect.getsource(upload)
        assert "'id'" in src, "CLI upload should read 'id' from response"


# ── MCP Contract Tests ──────────────────────────────


@pytest.mark.skipif(not HAS_MCP, reason="mcp package not installed")
class TestMCPContract:
    """Verify MCP server tools call correct backend endpoints."""

    def test_mcp_no_v1_paths(self):
        """MCP call_tool handler must not use /api/v1/ paths."""
        from openrag.tools import mcp_server
        src = inspect.getsource(mcp_server)
        assert "/api/v1/" not in src, "MCP server still uses /api/v1/ paths"

    def test_mcp_upload_uses_multipart(self):
        """MCP upload tool sends multipart file, not JSON data."""
        from openrag.tools import mcp_server
        src = inspect.getsource(mcp_server)
        assert 'files={' in src or "files={" in src, "MCP upload should use multipart"

    def test_mcp_has_all_6_tools(self):
        tool_names = {t["name"] for t in TOOL_DEFINITIONS}
        expected = {
            "openrag_query",
            "openrag_upload",
            "openrag_strategies",
            "openrag_compare",
            "openrag_collections",
            "openrag_status",
        }
        assert expected == tool_names

    def test_mcp_query_tool_schema(self):
        query_tool = next(t for t in TOOL_DEFINITIONS if t["name"] == "openrag_query")
        props = query_tool["inputSchema"]["properties"]
        assert "query" in props
        assert "strategy" in props
        assert "collection" in props
        assert "top_k" in props
        assert query_tool["inputSchema"]["required"] == ["query"]


# ── Auth Contract Tests ──────────────────────────────


class TestAuthContract:
    """Verify API key auth works as primary authentication."""

    @pytest.mark.asyncio
    async def test_api_key_auth_accepts_valid_key(self, app):
        """X-API-Key header with master key should authenticate."""
        master_key = "test-master-key-123"
        with patch("openrag.dependencies.settings") as mock_settings:
            mock_settings.api_key_master = master_key
            mock_settings.is_production = True
            mock_settings.jwt_secret = "test"
            mock_settings.jwt_algorithm = "HS256"

            from openrag.dependencies import get_api_key_or_jwt
            result = await get_api_key_or_jwt(
                x_api_key=master_key,
                authorization=None,
            )
            assert result is not None
            assert result["type"] == "api_key"

    @pytest.mark.asyncio
    async def test_api_key_auth_rejects_invalid_key(self, app):
        """Invalid X-API-Key should raise 401."""
        from fastapi import HTTPException
        with patch("openrag.dependencies.settings") as mock_settings:
            mock_settings.api_key_master = "real-key"
            mock_settings.is_production = True

            from openrag.dependencies import get_api_key_or_jwt
            with pytest.raises(HTTPException) as exc_info:
                await get_api_key_or_jwt(
                    x_api_key="wrong-key",
                    authorization=None,
                )
            assert exc_info.value.status_code == 401

    @pytest.mark.asyncio
    async def test_dev_mode_allows_no_auth(self, app):
        """In dev mode, no auth headers should return None (not 401)."""
        with patch("openrag.dependencies.settings") as mock_settings:
            mock_settings.is_production = False
            mock_settings.api_key_master = ""

            from openrag.dependencies import get_api_key_or_jwt
            result = await get_api_key_or_jwt(
                x_api_key=None,
                authorization=None,
            )
            assert result is None

    @pytest.mark.asyncio
    async def test_garbage_authorization_header_returns_401(self, app):
        """Authorization: garbage must not bypass auth."""
        from fastapi import HTTPException
        with patch("openrag.dependencies.settings") as mock_settings:
            mock_settings.is_production = True
            mock_settings.api_key_master = ""

            from openrag.dependencies import get_api_key_or_jwt
            with pytest.raises(HTTPException) as exc_info:
                await get_api_key_or_jwt(
                    x_api_key=None,
                    authorization="garbage",
                )
            assert exc_info.value.status_code == 401

    @pytest.mark.asyncio
    async def test_basic_auth_header_returns_401(self, app):
        """Authorization: Basic xyz must not bypass auth."""
        from fastapi import HTTPException
        with patch("openrag.dependencies.settings") as mock_settings:
            mock_settings.is_production = True
            mock_settings.api_key_master = ""

            from openrag.dependencies import get_api_key_or_jwt
            with pytest.raises(HTTPException) as exc_info:
                await get_api_key_or_jwt(
                    x_api_key=None,
                    authorization="Basic dXNlcjpwYXNz",
                )
            assert exc_info.value.status_code == 401

    @pytest.mark.asyncio
    async def test_empty_bearer_token_returns_401(self, app):
        """Authorization: Bearer <invalid> must return 401."""
        from fastapi import HTTPException
        with patch("openrag.dependencies.settings") as mock_settings:
            mock_settings.is_production = True
            mock_settings.api_key_master = ""
            mock_settings.jwt_secret = "test-secret"
            mock_settings.jwt_algorithm = "HS256"

            from openrag.dependencies import get_api_key_or_jwt
            with pytest.raises(HTTPException) as exc_info:
                await get_api_key_or_jwt(
                    x_api_key=None,
                    authorization="Bearer invalid-token-here",
                )
            assert exc_info.value.status_code == 401


# ── Seed Data Contract Tests ─────────────────────────


class TestSeedData:
    """Verify seed documents exist and are valid."""

    def test_seed_directory_exists(self):
        seed_dir = Path(__file__).parent.parent / "seed" / "documents"
        assert seed_dir.exists(), f"Seed directory not found: {seed_dir}"

    def test_seed_has_markdown_files(self):
        seed_dir = Path(__file__).parent.parent / "seed" / "documents"
        md_files = list(seed_dir.glob("*.md"))
        assert len(md_files) >= 2, f"Expected at least 2 seed docs, found {len(md_files)}"

    def test_seed_files_have_content(self):
        seed_dir = Path(__file__).parent.parent / "seed" / "documents"
        for md_file in seed_dir.glob("*.md"):
            content = md_file.read_text(encoding="utf-8")
            assert len(content) > 100, f"Seed file {md_file.name} is too small ({len(content)} chars)"

    def test_seed_ingestion_code_uses_document_processor(self):
        """server.py seed logic should use DocumentProcessorService, not just set a flag."""
        from openrag import server
        src = inspect.getsource(server.lifespan)
        assert "DocumentProcessorService" in src, "Seed should use real document processing"
        assert "process_file" in src, "Seed should call process_file for each document"


# ── API Route Existence Tests ────────────────────────


class TestAPIRoutes:
    """Verify critical API routes exist and respond."""

    @pytest.mark.asyncio
    async def test_health_endpoint(self, client):
        resp = await client.get("/api/health")
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_strategies_endpoint(self, client):
        resp = await client.get("/api/strategies")
        assert resp.status_code == 200
        data = resp.json()
        assert "strategies" in data

    @pytest.mark.asyncio
    async def test_collections_endpoint(self, client):
        resp = await client.get("/api/collections")
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_query_endpoint_exists(self, client):
        resp = await client.post("/api/query", json={
            "query": "test",
            "strategy": "naive",
            "collection": "default",
        })
        # Should not be 404/405
        assert resp.status_code != 404
        assert resp.status_code != 405
