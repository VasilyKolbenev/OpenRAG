"""OpenRAG CLI — command-line interface for the OpenRAG platform."""

import json
import logging
import os
import subprocess
import sys
from pathlib import Path
from typing import Optional

import typer
import httpx

app = typer.Typer(
    name="openrag",
    help="OpenRAG — Open-source RAG platform with 5-primitive architecture.",
    no_args_is_help=True,
)

logger = logging.getLogger("openrag.cli")

API_URL = os.getenv("OPENRAG_API_URL", "http://localhost:8000")
API_KEY = os.getenv("OPENRAG_API_KEY", "")


def _headers() -> dict[str, str]:
    headers = {"Content-Type": "application/json"}
    if API_KEY:
        headers["X-API-Key"] = API_KEY
    return headers


def _api_get(path: str) -> dict:
    try:
        resp = httpx.get(f"{API_URL}/api{path}", headers=_headers(), timeout=30)
        resp.raise_for_status()
        return resp.json()
    except httpx.ConnectError:
        typer.echo("Error: Cannot connect to OpenRAG API. Is the server running?", err=True)
        raise typer.Exit(1)
    except httpx.HTTPStatusError as e:
        typer.echo(f"Error: API returned {e.response.status_code}", err=True)
        raise typer.Exit(1)


def _api_post(path: str, data: dict) -> dict:
    try:
        resp = httpx.post(f"{API_URL}/api{path}", json=data, headers=_headers(), timeout=120)
        resp.raise_for_status()
        return resp.json()
    except httpx.ConnectError:
        typer.echo("Error: Cannot connect to OpenRAG API. Is the server running?", err=True)
        raise typer.Exit(1)
    except httpx.HTTPStatusError as e:
        typer.echo(f"Error: API returned {e.response.status_code}", err=True)
        raise typer.Exit(1)


@app.command()
def serve(
    port: int = typer.Option(8000, help="Port to listen on"),
    workers: int = typer.Option(1, help="Number of workers"),
    reload: bool = typer.Option(False, help="Enable auto-reload (dev mode)"),
) -> None:
    """Start the OpenRAG API server."""
    import uvicorn

    uvicorn.run(
        "openrag.server:app",
        host="0.0.0.0",
        port=port,
        workers=workers if not reload else 1,
        reload=reload,
    )


@app.command()
def up(
    prod: bool = typer.Option(False, help="Use production compose (with Traefik, monitoring)"),
    detach: bool = typer.Option(True, "-d", help="Run in background"),
) -> None:
    """Start the full OpenRAG stack with Docker Compose."""
    cmd = ["docker", "compose"]
    if prod:
        cmd.extend(["-f", "docker-compose.yml", "-f", "docker-compose.prod.yml"])
    cmd.append("up")
    if detach:
        cmd.append("-d")
    typer.echo(f"Running: {' '.join(cmd)}")
    subprocess.run(cmd, check=True)


@app.command()
def down() -> None:
    """Stop the OpenRAG stack."""
    subprocess.run(["docker", "compose", "down"], check=True)


@app.command()
def query(
    text: str = typer.Argument(..., help="Query text"),
    strategy: str = typer.Option("naive", "-s", "--strategy", help="RAG strategy"),
    collection: str = typer.Option("default", "-c", "--collection", help="Collection name"),
    top_k: int = typer.Option(5, "-k", "--top-k", help="Number of results"),
) -> None:
    """Execute a RAG query."""
    result = _api_post("/query", {
        "query": text,
        "strategy": strategy,
        "collection": collection,
        "top_k": top_k,
    })
    typer.echo(f"\n{result.get('answer', 'No answer')}")
    sources = result.get("sources", [])
    if sources:
        typer.echo(f"\nSources ({len(sources)}):")
        for s in sources:
            typer.echo(f"  - {s.get('title', s.get('document_id', 'unknown'))}")


@app.command()
def compare(
    text: str = typer.Argument(..., help="Query text"),
    strategies: list[str] = typer.Option(
        ["naive", "hybrid"], "-s", "--strategy", help="Strategies to compare"
    ),
) -> None:
    """Compare query results across multiple strategies."""
    result = _api_post("/compare", {"query": text, "strategies": strategies})
    for r in result.get("results", []):
        typer.echo(f"\n--- {r['strategy']} ({r.get('latency_ms', '?')}ms) ---")
        typer.echo(r.get("answer", "No answer"))


@app.command()
def upload(
    path: str = typer.Argument(..., help="File or directory to upload"),
    collection: str = typer.Option("default", "-c", "--collection", help="Target collection"),
) -> None:
    """Upload documents for ingestion."""
    p = Path(path)
    if p.is_dir():
        files = list(p.glob("**/*"))
        files = [f for f in files if f.is_file() and f.suffix.lower() in {".pdf", ".docx", ".txt", ".md"}]
    elif p.is_file():
        files = [p]
    else:
        typer.echo(f"Error: {path} not found", err=True)
        raise typer.Exit(1)

    for f in files:
        typer.echo(f"Uploading {f.name}...")
        with open(f, "rb") as fh:
            resp = httpx.post(
                f"{API_URL}/api/documents/upload",
                files={"file": (f.name, fh)},
                data={"collection": collection},
                headers={"X-API-Key": API_KEY} if API_KEY else {},
                timeout=120,
            )
        if resp.status_code in (200, 201):
            typer.echo(f"  OK: {resp.json().get('id', 'uploaded')}")
        else:
            typer.echo(f"  Error: {resp.status_code}", err=True)


@app.command()
def status() -> None:
    """Check health of all OpenRAG services."""
    result = _api_get("/health")
    typer.echo(json.dumps(result, indent=2))


@app.command()
def strategies() -> None:
    """List available RAG strategies."""
    result = _api_get("/strategies")
    for s in result.get("strategies", []):
        typer.echo(f"  {s['name']:12s} — {s.get('description', '')}")


@app.command()
def traces(trace_id: str = typer.Argument(..., help="Trace ID")) -> None:
    """View a pipeline trace."""
    result = _api_get(f"/traces/{trace_id}")
    typer.echo(json.dumps(result, indent=2))


@app.command()
def init() -> None:
    """Interactive first-run setup wizard."""
    typer.echo("OpenRAG Setup Wizard")
    typer.echo("=" * 40)

    try:
        subprocess.run(["docker", "--version"], capture_output=True, check=True)
        typer.echo("[OK] Docker found")
    except (subprocess.CalledProcessError, FileNotFoundError):
        typer.echo("[ERROR] Docker not found. Install Docker first.", err=True)
        raise typer.Exit(1)

    env_path = Path(".env")
    if not env_path.exists():
        example = Path(".env.example")
        if example.exists():
            import shutil
            shutil.copy(example, env_path)
            typer.echo("[OK] .env created from .env.example — edit it to add your API keys")
        else:
            typer.echo("[WARN] No .env.example found, skipping .env generation")
    else:
        typer.echo("[OK] .env already exists")

    typer.echo("\nStarting OpenRAG stack...")
    subprocess.run(["docker", "compose", "pull"], check=False)
    subprocess.run(["docker", "compose", "up", "-d"], check=True)

    typer.echo("Waiting for API to become healthy...")
    import time
    for _ in range(30):
        try:
            resp = httpx.get(f"{API_URL}/api/health", timeout=5)
            if resp.status_code == 200:
                typer.echo("[OK] API is healthy")
                break
        except httpx.ConnectError:
            pass
        time.sleep(2)
    else:
        typer.echo("[WARN] API health check timed out — check logs with: docker compose logs api")

    typer.echo("\n" + "=" * 40)
    typer.echo(f"API:      {API_URL}")
    typer.echo("Frontend: http://localhost:3000")
    typer.echo("=" * 40)
    typer.echo("\nOpenRAG is ready! Try: openrag query 'What is RAG?'")


@app.command()
def mcp(
    transport: str = typer.Option("stdio", help="Transport: stdio or sse"),
    port: int = typer.Option(3001, help="Port for SSE transport"),
) -> None:
    """Start the OpenRAG MCP server."""
    import asyncio
    from openrag.tools.mcp_server import run_stdio

    if transport == "stdio":
        asyncio.run(run_stdio())
    else:
        typer.echo(f"SSE transport on port {port} — not yet implemented", err=True)
        raise typer.Exit(1)


@app.command()
def apikey_create(name: str = typer.Option(..., help="Name for the API key")) -> None:
    """Generate a new API key."""
    import hashlib
    import secrets
    key = f"orag_{secrets.token_hex(24)}"
    hashed = hashlib.sha256(key.encode()).hexdigest()
    try:
        resp = httpx.post(f"{API_URL}/api/apikeys", json={
            "name": name,
            "hashed_key": hashed,
        }, headers=_headers(), timeout=30)
        if resp.status_code == 200:
            typer.echo(f"API Key created: {key}")
            typer.echo(f"Name: {name}")
            typer.echo("Store this key securely — it cannot be retrieved later.")
        else:
            typer.echo(f"API Key generated (store in OPENRAG_API_KEY env var): {key}")
            typer.echo(f"Name: {name}")
    except httpx.ConnectError:
        typer.echo(f"API Key generated (API not running, store manually): {key}")
        typer.echo(f"SHA-256 hash: {hashed}")


@app.command()
def apikey_list() -> None:
    """List active API keys."""
    try:
        result = _api_get("/apikeys")
        keys = result.get("keys", [])
        if not keys:
            typer.echo("No API keys found.")
            return
        for k in keys:
            status_str = "active" if k.get("is_active") else "revoked"
            typer.echo(f"  {k['name']:20s}  {k['id'][:8]}...  [{status_str}]  {k.get('created_at', '')}")
    except SystemExit:
        typer.echo("Could not list keys — API may not be running.", err=True)


@app.command()
def apikey_revoke(key_id: str = typer.Argument(..., help="API key ID to revoke")) -> None:
    """Revoke an API key."""
    try:
        resp = httpx.delete(f"{API_URL}/api/apikeys/{key_id}", headers=_headers(), timeout=30)
        if resp.status_code == 200:
            typer.echo(f"API key {key_id} revoked.")
        else:
            typer.echo(f"Error: {resp.status_code}", err=True)
    except httpx.ConnectError:
        typer.echo("Error: Cannot connect to OpenRAG API.", err=True)
        raise typer.Exit(1)


if __name__ == "__main__":
    app()
