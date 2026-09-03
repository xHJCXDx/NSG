"""Tests for backend/auth.py — settings integration and login endpoint."""
import ast
from pathlib import Path
from types import SimpleNamespace

import pytest
from httpx import AsyncClient, ASGITransport
from jose import jwt
from sqlalchemy.exc import SQLAlchemyError


AUTH_PATH = Path(__file__).parent.parent / "auth.py"


class FakeQuery:
    def __init__(self, first_result=None):
        self.first_result = first_result
        self.filter_args = []

    def filter(self, *args):
        self.filter_args.append(args)
        return self

    def first(self):
        return self.first_result


class FakeDb:
    def __init__(self, first_result=None):
        self.query_obj = FakeQuery(first_result=first_result)
        self.query_args = []

    def query(self, *args):
        self.query_args.append(args)
        return self.query_obj


class FailingDb:
    def query(self, *args):
        raise SQLAlchemyError("database unavailable")


@pytest.fixture(autouse=True)
def auth_env(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://test-user:test-password@localhost:5432/osint_db")
    monkeypatch.setenv("JWT_SECRET_KEY", "test-jwt-secret")
    monkeypatch.setenv("ADMIN_USER", "test-admin")
    monkeypatch.setenv("ADMIN_PASSWORD", "test-admin-password")


def test_auth_no_os_getenv():
    """auth.py must not call os.getenv() anywhere."""
    source = AUTH_PATH.read_text()
    tree = ast.parse(source)
    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            # os.getenv(...)
            if (
                isinstance(node.func, ast.Attribute)
                and node.func.attr == "getenv"
                and isinstance(node.func.value, ast.Name)
                and node.func.value.id == "os"
            ):
                pytest.fail("auth.py still contains os.getenv() call — migrate to settings")


def test_auth_no_import_os():
    """auth.py must not have 'import os'."""
    source = AUTH_PATH.read_text()
    assert "import os" not in source, "auth.py still contains 'import os' — remove it"


@pytest.mark.anyio
async def test_login_success():
    """POST /api/auth/login with configured credentials returns HTTP 200 and access_token."""
    import auth
    from main import app

    def override_db():
        yield FakeDb(first_result=None)

    app.dependency_overrides[auth.get_db] = override_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/auth/login",
            data={"username": "test-admin", "password": "test-admin-password"},
        )
    app.dependency_overrides.clear()
    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"
    claims = jwt.decode(body["access_token"], "test-jwt-secret", algorithms=["HS256"])
    assert claims["role"] == "admin"
    assert claims["auth_source"] == "bootstrap"
    assert "user_id" not in claims


@pytest.mark.anyio
async def test_login_db_user_success():
    import auth
    from main import app

    password_hash = auth.hash_password("user-password")
    user = SimpleNamespace(
        username="analyst1",
        user_id=42,
        password_hash=password_hash,
        role="analyst",
        is_active=True,
    )

    def override_db():
        yield FakeDb(first_result=user)

    app.dependency_overrides[auth.get_db] = override_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/auth/login",
            data={"username": "analyst1", "password": "user-password"},
        )
    app.dependency_overrides.clear()

    assert response.status_code == 200
    claims = jwt.decode(response.json()["access_token"], "test-jwt-secret", algorithms=["HS256"])
    assert claims["sub"] == "analyst1"
    assert claims["role"] == "analyst"
    assert claims["auth_source"] == "database"
    assert claims["user_id"] == 42


@pytest.mark.anyio
async def test_login_inactive_db_user_returns_401():
    import auth
    from main import app

    user = SimpleNamespace(
        username="analyst1",
        user_id=42,
        password_hash=auth.hash_password("user-password"),
        role="analyst",
        is_active=False,
    )

    def override_db():
        yield FakeDb(first_result=user)

    app.dependency_overrides[auth.get_db] = override_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/auth/login",
            data={"username": "analyst1", "password": "user-password"},
        )
    app.dependency_overrides.clear()

    assert response.status_code == 401


@pytest.mark.anyio
async def test_login_env_admin_blocked_when_any_db_user_exists():
    import auth
    from main import app

    user = SimpleNamespace(
        username="someone-else",
        user_id=42,
        password_hash=auth.hash_password("user-password"),
        role="analyst",
        is_active=True,
    )

    def override_db():
        yield FakeDb(first_result=user)

    app.dependency_overrides[auth.get_db] = override_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/auth/login",
            data={"username": "test-admin", "password": "test-admin-password"},
        )
    app.dependency_overrides.clear()

    assert response.status_code == 401


@pytest.mark.anyio
async def test_login_db_error_returns_service_unavailable_without_env_fallback():
    import auth
    from main import app

    def override_db():
        yield FailingDb()

    app.dependency_overrides[auth.get_db] = override_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/auth/login",
            data={"username": "test-admin", "password": "test-admin-password"},
        )
    app.dependency_overrides.clear()

    assert response.status_code == 503
    assert response.json()["detail"] == "Authentication service unavailable"


@pytest.mark.anyio
async def test_login_wrong_password():
    """POST /api/auth/login with wrong password returns HTTP 401."""
    import auth
    from main import app

    def override_db():
        yield FakeDb(first_result=None)

    app.dependency_overrides[auth.get_db] = override_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/auth/login",
            data={"username": "admin", "password": "wrong"},
        )
    app.dependency_overrides.clear()
    assert response.status_code == 401


@pytest.mark.anyio
async def test_invalid_token_rejected():
    from auth import get_current_user
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(token="not-a-jwt")

    assert exc_info.value.status_code == 401
