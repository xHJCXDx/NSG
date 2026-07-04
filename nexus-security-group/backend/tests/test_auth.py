"""Tests for backend/auth.py — settings integration and login endpoint."""
import ast
from pathlib import Path

import pytest
from httpx import AsyncClient, ASGITransport


AUTH_PATH = Path(__file__).parent.parent / "auth.py"


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
    """POST /api/auth/login with default credentials returns HTTP 200 and access_token."""
    from main import app
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/auth/login",
            data={"username": "admin", "password": "REDACTED_PASSWORD"},
        )
    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"


@pytest.mark.anyio
async def test_login_wrong_password():
    """POST /api/auth/login with wrong password returns HTTP 401."""
    from main import app
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/auth/login",
            data={"username": "admin", "password": "wrong"},
        )
    assert response.status_code == 401
