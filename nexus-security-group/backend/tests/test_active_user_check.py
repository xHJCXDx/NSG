"""Per-request active-user check of the token dependency (§8.5.2; A.3, rule 3).

Scenario E13 lives in test_scenarios.py; these tests pin the remaining cases:
an active user is accepted, a missing user is rejected, the bootstrap
administrator (no database row) is accepted only while there are no database
users, and a database failure answers 503 instead of letting the request
through.
"""
from datetime import timedelta
from types import SimpleNamespace

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.exc import SQLAlchemyError

import auth
from tests.conftest import FakeDb, FakeQuery

pytestmark = pytest.mark.real_user_status


class FailingDb:
    def query(self, *args):
        raise SQLAlchemyError("database unavailable")


def _get_protected(db, claims):
    app = FastAPI()

    @app.get("/protected")
    def protected(user=Depends(auth.get_current_user)):
        return {"username": user.username}

    app.dependency_overrides[auth.get_db] = lambda: db
    token = auth.create_access_token(claims, expires_delta=timedelta(minutes=60))
    return TestClient(app).get("/protected", headers={"Authorization": f"Bearer {token}"})


def test_active_user_with_valid_token_is_accepted():
    active_user = SimpleNamespace(user_id=7, username="analyst1", is_active=True)
    db = FakeDb(FakeQuery(first_result=active_user))

    response = _get_protected(db, {"sub": "analyst1", "user_id": 7, "auth_source": "database"})

    assert response.status_code == 200
    assert response.json() == {"username": "analyst1"}
    assert len(db.query_args) == 1


def test_deleted_user_with_valid_token_is_rejected():
    db = FakeDb(FakeQuery(first_result=None))

    response = _get_protected(db, {"sub": "ghost", "user_id": 99, "auth_source": "database"})

    assert response.status_code == 401
    assert response.json() == {"detail": "Could not validate credentials"}


def test_token_without_user_id_is_looked_up_by_username():
    inactive_user = SimpleNamespace(user_id=8, username="analyst2", is_active=False)
    db = FakeDb(FakeQuery(first_result=inactive_user))

    response = _get_protected(db, {"sub": "Analyst2", "auth_source": "database"})

    assert response.status_code == 401
    assert len(db.query_args) == 1


BOOTSTRAP_CLAIMS = {"sub": "test-admin", "role": "admin", "auth_source": "bootstrap"}


def test_bootstrap_admin_token_is_accepted_while_there_are_no_database_users():
    db = FakeDb(FakeQuery(first_result=None))

    response = _get_protected(db, BOOTSTRAP_CLAIMS)

    assert response.status_code == 200
    assert response.json() == {"username": "test-admin"}
    assert len(db.query_args) == 1


def test_bootstrap_admin_token_is_rejected_once_a_database_user_exists():
    """The bootstrap login only works while system_users is empty (auth/routes.py);
    a bootstrap token issued before the first user was created must stop working."""
    db = FakeDb(FakeQuery(first_result=SimpleNamespace(user_id=1)))

    response = _get_protected(db, BOOTSTRAP_CLAIMS)

    assert response.status_code == 401
    assert response.json() == {"detail": "Could not validate credentials"}
    assert len(db.query_args) == 1


def test_database_failure_during_the_bootstrap_check_answers_503():
    response = _get_protected(FailingDb(), BOOTSTRAP_CLAIMS)

    assert response.status_code == 503
    assert response.json() == {"detail": "Authentication service unavailable"}


def test_database_failure_during_the_check_answers_503():
    response = _get_protected(FailingDb(), {"sub": "analyst1", "user_id": 7, "auth_source": "database"})

    assert response.status_code == 503
    assert response.json() == {"detail": "Authentication service unavailable"}


def test_token_dependency_runs_outside_the_event_loop():
    """The per-request lookup is blocking I/O: FastAPI must run it in its threadpool."""
    import inspect

    assert not inspect.iscoroutinefunction(auth.get_current_user)


def test_logout_with_database_user_token_checks_the_user_and_records_activity():
    from main import app

    active_user = SimpleNamespace(user_id=7, username="analyst1", is_active=True)
    db = FakeDb(FakeQuery(first_result=active_user))
    token = auth.create_access_token(
        {"sub": "analyst1", "user_id": 7, "role": "analyst", "auth_source": "database"},
        expires_delta=timedelta(minutes=60),
    )
    app.dependency_overrides[auth.get_db] = lambda: db
    try:
        response = TestClient(app).post(
            "/api/auth/logout", headers={"Authorization": f"Bearer {token}"}
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {"message": "Logged out successfully"}
    assert len(db.query_args) == 1
    assert [activity.activity_type for activity in db.added] == ["logout"]
