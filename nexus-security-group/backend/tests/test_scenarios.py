"""Scenario E13 (thesis Annex E, Table E1): a deactivated user with a token that
is still valid must be rejected, because the rule checks on every request that
the user is still active (§8.5.2; A.3, rule 3).

Since REV77 the token dependency checks on every request that the user still
exists and is active (A-77, R8B-50), so this scenario is a regular test.

Scenario E12 uses the existing test
tests/test_threats_router.py::test_review_threat_rejects_user_without_threats_write_permission.
"""
from datetime import timedelta
from types import SimpleNamespace

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

import auth
from tests.conftest import FakeDb, FakeQuery


@pytest.mark.real_user_status
def test_e13_deactivated_user_with_valid_token_is_rejected():
    inactive_user = SimpleNamespace(
        user_id=42,
        username="analyst1",
        role="analyst",
        is_active=False,
    )
    db = FakeDb(FakeQuery(first_result=inactive_user))

    app = FastAPI()

    @app.get("/protected")
    def protected(user=Depends(auth.get_current_user)):
        return {"username": user.username}

    app.dependency_overrides[auth.get_db] = lambda: db

    token = auth.create_access_token(
        {"sub": "analyst1", "user_id": 42, "role": "analyst", "permissions": ["threats:read"]},
        expires_delta=timedelta(minutes=60),
    )
    response = TestClient(app).get("/protected", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 401
