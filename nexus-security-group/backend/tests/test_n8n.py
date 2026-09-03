"""Tests for backend/routers/n8n.py — settings integration and proxy behavior."""
import ast
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient
from httpx import AsyncClient, ASGITransport, ConnectError, Response
import pytest

from routers.n8n import get_current_user, router


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

    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_current_user] = lambda: object()

    # Patch the AsyncClient that the n8n router creates internally.
    # We patch the __aenter__ return value so context-manager usage is intercepted.
    mock_client_instance = AsyncMock()
    mock_client_instance.post = AsyncMock(
        return_value=Response(
            200,
            json={"status": "ok"},
            headers={"content-type": "application/json"},
        )
    )
    mock_async_client = MagicMock()
    mock_async_client.__aenter__ = AsyncMock(return_value=mock_client_instance)
    mock_async_client.__aexit__ = AsyncMock(return_value=None)

    with patch("routers.n8n.httpx.AsyncClient", return_value=mock_async_client):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/n8n/webhook/test-id",
                headers={"Content-Type": "application/vnd.nsg+json"},
                content=b"{}",
            )

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert mock_client_instance.post.called
    call_url = mock_client_instance.post.call_args[0][0]
    assert call_url.startswith(settings.N8N_INTERNAL_URL), (
        f"Expected URL to start with {settings.N8N_INTERNAL_URL!r}, got {call_url!r}"
    )
    assert mock_client_instance.post.call_args.kwargs["content"] == b"{}"
    assert mock_client_instance.post.call_args.kwargs["headers"] == {
        "Content-Type": "application/vnd.nsg+json"
    }


def test_proxy_webhook_declares_auth_dependency_and_passthrough_contract():
    routes_by_path = {route.path: route for route in router.routes}

    webhook_route = routes_by_path["/api/n8n/webhook/{webhook_id}"]

    assert webhook_route.response_model is None
    assert any(dep.call is get_current_user for dep in webhook_route.dependant.dependencies)


def test_proxy_webhook_rejects_missing_auth_token():
    app = FastAPI()
    app.include_router(router)

    response = TestClient(app).post("/api/n8n/webhook/test-id", json={"trigger": "scan"})

    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"


@pytest.mark.anyio
async def test_proxy_webhook_propagates_workflow_error_status_and_payload():
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_current_user] = lambda: object()

    mock_client_instance = AsyncMock()
    mock_client_instance.post = AsyncMock(
        return_value=Response(
            400,
            json={"error": "missing target"},
            headers={"content-type": "application/json"},
        )
    )
    mock_async_client = MagicMock()
    mock_async_client.__aenter__ = AsyncMock(return_value=mock_client_instance)
    mock_async_client.__aexit__ = AsyncMock(return_value=None)

    with patch("routers.n8n.httpx.AsyncClient", return_value=mock_async_client):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post("/api/n8n/webhook/test-id", json={"trigger": "scan"})

    assert response.status_code == 400
    assert response.json() == {"error": "missing target"}


@pytest.mark.anyio
async def test_proxy_webhook_normalizes_transport_errors_as_bad_gateway():
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_current_user] = lambda: object()

    mock_client_instance = AsyncMock()
    mock_client_instance.post = AsyncMock(side_effect=ConnectError("connection refused"))
    mock_async_client = MagicMock()
    mock_async_client.__aenter__ = AsyncMock(return_value=mock_client_instance)
    mock_async_client.__aexit__ = AsyncMock(return_value=None)

    with patch("routers.n8n.httpx.AsyncClient", return_value=mock_async_client):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post("/api/n8n/webhook/test-id", json={"trigger": "scan"})

    assert response.status_code == 502
    assert response.json() == {"detail": "n8n workflow service unavailable"}


@pytest.mark.anyio
async def test_proxy_webhook_passes_through_non_json_workflow_response():
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_current_user] = lambda: object()

    mock_client_instance = AsyncMock()
    mock_client_instance.post = AsyncMock(
        return_value=Response(
            202,
            content=b"accepted",
            headers={"content-type": "text/plain"},
        )
    )
    mock_async_client = MagicMock()
    mock_async_client.__aenter__ = AsyncMock(return_value=mock_client_instance)
    mock_async_client.__aexit__ = AsyncMock(return_value=None)

    with patch("routers.n8n.httpx.AsyncClient", return_value=mock_async_client):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post("/api/n8n/webhook/test-id", json={"trigger": "scan"})

    assert response.status_code == 202
    assert response.text == "accepted"
