"""Tests for backend/routers/n8n.py — settings integration and proxy behavior."""
import ast
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient, ASGITransport


N8N_PATH = Path(__file__).parent.parent / "routers" / "n8n.py"


@pytest.fixture(autouse=True)
def auth_env(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://test-user:test-password@localhost:5432/osint_db")
    monkeypatch.setenv("JWT_SECRET_KEY", "test-jwt-secret")
    monkeypatch.setenv("ADMIN_USER", "test-admin")
    monkeypatch.setenv("ADMIN_PASSWORD", "test-admin-password")


def test_n8n_no_os_getenv():
    """routers/n8n.py must not call os.getenv() anywhere."""
    source = N8N_PATH.read_text()
    tree = ast.parse(source)
    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            if (
                isinstance(node.func, ast.Attribute)
                and node.func.attr == "getenv"
                and isinstance(node.func.value, ast.Name)
                and node.func.value.id == "os"
            ):
                pytest.fail("routers/n8n.py still contains os.getenv() call — migrate to settings")


def test_n8n_no_import_os():
    """routers/n8n.py must not have 'import os'."""
    source = N8N_PATH.read_text()
    assert "import os" not in source, "routers/n8n.py still contains 'import os' — remove it"


@pytest.mark.anyio
async def test_proxy_webhook_uses_settings_url():
    """Proxy webhook outbound request targets settings.N8N_INTERNAL_URL."""
    from config import settings
    from main import app

    mock_response = MagicMock()
    mock_response.json.return_value = {"status": "ok"}

    # Obtain a valid JWT first (real request, no mock yet)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        login = await client.post(
            "/api/auth/login",
            data={"username": "test-admin", "password": "test-admin-password"},
        )
    token = login.json()["access_token"]

    # Patch the AsyncClient that the n8n router creates internally.
    # We patch the __aenter__ return value so context-manager usage is intercepted.
    mock_client_instance = AsyncMock()
    mock_client_instance.post = AsyncMock(return_value=mock_response)
    mock_async_client = MagicMock()
    mock_async_client.__aenter__ = AsyncMock(return_value=mock_client_instance)
    mock_async_client.__aexit__ = AsyncMock(return_value=None)

    with patch("routers.n8n.httpx.AsyncClient", return_value=mock_async_client):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            await client.post(
                "/api/n8n/webhook/test-id",
                headers={"Authorization": f"Bearer {token}"},
                content=b"{}",
            )

    assert mock_client_instance.post.called
    call_url = mock_client_instance.post.call_args[0][0]
    assert call_url.startswith(settings.N8N_INTERNAL_URL), (
        f"Expected URL to start with {settings.N8N_INTERNAL_URL!r}, got {call_url!r}"
    )
