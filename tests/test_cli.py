"""CLI command tests using Typer CliRunner."""

from typer.testing import CliRunner
from openrag.cli import app

runner = CliRunner()


def test_cli_status_command_exists():
    result = runner.invoke(app, ["status", "--help"])
    assert result.exit_code == 0
    assert "status" in result.output.lower() or "health" in result.output.lower()


def test_cli_serve_command_exists():
    result = runner.invoke(app, ["serve", "--help"])
    assert result.exit_code == 0


def test_cli_query_command_exists():
    result = runner.invoke(app, ["query", "--help"])
    assert result.exit_code == 0


def test_cli_upload_command_exists():
    result = runner.invoke(app, ["upload", "--help"])
    assert result.exit_code == 0


def test_cli_strategies_command_exists():
    result = runner.invoke(app, ["strategies", "--help"])
    assert result.exit_code == 0


def test_cli_init_command_exists():
    result = runner.invoke(app, ["init", "--help"])
    assert result.exit_code == 0


def test_cli_apikey_create_command_exists():
    result = runner.invoke(app, ["apikey-create", "--help"])
    assert result.exit_code == 0


def test_cli_apikey_list_command_exists():
    result = runner.invoke(app, ["apikey-list", "--help"])
    assert result.exit_code == 0


def test_cli_apikey_revoke_command_exists():
    result = runner.invoke(app, ["apikey-revoke", "--help"])
    assert result.exit_code == 0
