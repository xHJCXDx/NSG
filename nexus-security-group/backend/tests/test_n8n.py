"""Tests for backend/routers/n8n.py — settings integration and proxy behavior."""
import ast
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient
from httpx import AsyncClient, ASGITransport, ConnectError, Response
import pytest

from auth import get_current_user
from database import get_db
from models import UserActivity
from routers.n8n import _safe_webhook_ref, router
from schemas.auth import TokenData


N8N_PATH = Path(__file__).parent.parent / "routers" / "n8n.py"


class FakeDb:
    def __init__(self):
        self.added = []
        self.committed = False
        self.rolled_back = False

    def add(self, obj):
        self.added.append(obj)

    def commit(self):
        self.committed = True

    def rollback(self):
        self.rolled_back = True


class CommitFailingDb(FakeDb):
    def commit(self):
        self.committed = True
        raise RuntimeError("audit commit failed")


@pytest.fixture(autouse=True)
def auth_env(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://test-user:test-password@localhost:5432/osint_db")
    monkeypatch.setenv("JWT_SECRET_KEY", "test-jwt-secret-that-is-at-least-32-characters-long")
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
    app.dependency_overrides[get_current_user] = lambda: TokenData(
        username="analyst1", role="analyst", auth_source="database",
        permissions=["workflows:execute"],
    )
    fake_db = FakeDb()
    app.dependency_overrides[get_db] = lambda: fake_db

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
    webhook_ref = _safe_webhook_ref("test-id")
    activity = fake_db.added[0]
    assert isinstance(activity, UserActivity)
    assert activity.activity_type == "execute_workflow"
    assert activity.username == "analyst1"
    assert activity.user_role == "analyst"
    assert activity.activity_description == f"Executed workflow webhook ref={webhook_ref}"
    assert "test-id" not in activity.activity_description
    assert activity.activity_data == {
        "webhook_ref": webhook_ref,
        "response_status_code": 200,
    }
    assert "test-id" not in str(activity.activity_data)
    assert fake_db.committed is True


def test_proxy_webhook_declares_auth_dependency_and_passthrough_contract():
    routes_by_path = {route.path: route for route in router.routes}

    webhook_route = routes_by_path["/api/n8n/webhook/{webhook_id}"]

    assert webhook_route.response_model is None
    assert any(
        getattr(dep.call, "required_permission", None) == "workflows:execute"
        for dep in webhook_route.dependant.dependencies
    )


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
    app.dependency_overrides[get_current_user] = lambda: TokenData(
        username="analyst1", role="analyst", auth_source="database",
        permissions=["workflows:execute"],
    )
    fake_db = FakeDb()
    app.dependency_overrides[get_db] = lambda: fake_db

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
    assert fake_db.added == []
    assert fake_db.committed is False


@pytest.mark.anyio
async def test_proxy_webhook_normalizes_transport_errors_as_bad_gateway():
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_current_user] = lambda: TokenData(
        username="analyst1", role="analyst", auth_source="database",
        permissions=["workflows:execute"],
    )
    app.dependency_overrides[get_db] = lambda: FakeDb()

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
    app.dependency_overrides[get_current_user] = lambda: TokenData(
        username="analyst1", role="analyst", auth_source="database",
        permissions=["workflows:execute"],
    )
    fake_db = FakeDb()
    app.dependency_overrides[get_db] = lambda: fake_db

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
    webhook_ref = _safe_webhook_ref("test-id")
    assert fake_db.added[0].activity_type == "execute_workflow"
    assert fake_db.added[0].activity_description == f"Executed workflow webhook ref={webhook_ref}"
    assert "test-id" not in fake_db.added[0].activity_description
    assert fake_db.added[0].activity_data == {
        "webhook_ref": webhook_ref,
        "response_status_code": 202,
    }
    assert "test-id" not in str(fake_db.added[0].activity_data)


@pytest.mark.anyio
async def test_proxy_webhook_audit_commit_failure_does_not_break_success_response():
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_current_user] = lambda: TokenData(
        username="analyst1", role="analyst", auth_source="database",
        permissions=["workflows:execute"],
    )
    fake_db = CommitFailingDb()
    app.dependency_overrides[get_db] = lambda: fake_db

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
            response = await client.post("/api/n8n/webhook/test-id", json={"trigger": "scan"})

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert fake_db.committed is True
    assert fake_db.rolled_back is True


def test_proxy_webhook_rejects_user_without_workflows_execute_permission():
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_current_user] = lambda: TokenData(
        username="analyst1",
        role="analyst",
        auth_source="database",
        permissions=["dashboard:read"],
    )

    response = TestClient(app).post("/api/n8n/webhook/test-id", json={"trigger": "scan"})

    assert response.status_code == 403
    assert "workflows:execute" in response.json()["detail"]
