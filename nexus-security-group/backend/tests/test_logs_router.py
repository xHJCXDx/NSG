from datetime import datetime, timezone
from types import SimpleNamespace
import sys
import types
import uuid

import pytest
from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.testclient import TestClient

auth_stub = types.ModuleType("auth")
auth_stub.get_current_user = lambda: None


def _stub_require_permission(resource, action):
    auth_stub.get_current_user.required_permission = f"{resource}:{action}"
    return auth_stub.get_current_user


auth_stub.require_permission = _stub_require_permission
auth_stub.router = APIRouter(prefix="/api/auth", tags=["auth"])
sys.modules.setdefault("auth", auth_stub)

import auth
from auth import get_current_user
from database import get_db
from main import app
from routers.logs import get_log, get_logs, router
from schemas.auth import TokenData
from schemas.log import ExecutionLogResponse


class FakeQuery:
    def __init__(self, *, all_result=None, first_result=None):
        self.all_result = all_result or []
        self.first_result = first_result
        self.order_by_args = None
        self.limit_value = None
        self.filter_args = []

    def order_by(self, *args):
        self.order_by_args = args
        return self

    def limit(self, value):
        self.limit_value = value
        return self

    def filter(self, *args):
        self.filter_args.append(args)
        return self

    def all(self):
        return self.all_result

    def first(self):
        return self.first_result


class FakeDb:
    def __init__(self, query):
        self.query_obj = query
        self.query_args = []

    def query(self, *args):
        self.query_args.append(args)
        return self.query_obj


def _log_row(**overrides):
    now = datetime(2026, 7, 5, 14, 0, tzinfo=timezone.utc)
    fields = {
        "log_id": 10,
        "execution_uuid": uuid.uuid4(),
        "workflow_name": "threat_detection",
        "execution_id": "exec-001",
        "status": "success",
        "mentions_collected": 100,
        "mentions_processed": 98,
        "detections_generated": 5,
        "alerts_generated": 2,
        "started_at": now,
        "completed_at": now,
        "duration_seconds": 45,
        "last_updated": now,
    }
    fields.update(overrides)
    return SimpleNamespace(**fields)


def test_main_registers_api_logs_routes():
    route_paths = set(app.openapi()["paths"])

    assert "/api/logs" in route_paths
    assert "/api/logs/{log_id}" in route_paths


def test_get_logs_lists_recent_execution_logs_with_limit():
    log = _log_row()
    query = FakeQuery(all_result=[log])
    fake_db = FakeDb(query)

    result = get_logs(db=fake_db, limit=7, current_user=object())

    assert result == [log]
    assert len(fake_db.query_args) == 1
    assert query.order_by_args is not None
    assert query.limit_value == 7
    response = ExecutionLogResponse.model_validate(result[0])
    assert response.log_id == 10
    assert response.workflow_name == "threat_detection"


def test_get_logs_limit_defaults_to_fifty_when_called_directly():
    query = FakeQuery(all_result=[])
    fake_db = FakeDb(query)

    result = get_logs(db=fake_db, current_user=object())

    assert result == []
    assert query.limit_value == 50


def test_get_logs_applies_status_and_workflow_filters_before_limit():
    query = FakeQuery(all_result=[])
    fake_db = FakeDb(query)

    result = get_logs(
        db=fake_db,
        limit=25,
        log_status="error",
        workflow_name="threat_detection",
        current_user=object(),
    )

    assert result == []
    assert len(query.filter_args) == 2
    assert query.order_by_args is not None
    assert query.limit_value == 25


def test_get_log_returns_detail_by_log_id():
    log = _log_row(log_id=42, status="partial_success")
    query = FakeQuery(first_result=log)
    fake_db = FakeDb(query)

    result = get_log(log_id=42, db=fake_db, current_user=object())

    detail = ExecutionLogResponse.model_validate(result)
    assert result == log
    assert query.filter_args
    assert detail.log_id == 42
    assert detail.status == "partial_success"


def test_get_log_raises_404_when_log_is_missing():
    query = FakeQuery(first_result=None)
    fake_db = FakeDb(query)

    with pytest.raises(HTTPException) as exc_info:
        get_log(log_id=999, db=fake_db, current_user=object())

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Execution log not found"


def test_log_routes_declare_response_models_and_auth_dependency():
    routes_by_path = {route.path: route for route in router.routes}

    list_route = routes_by_path["/api/logs"]
    detail_route = routes_by_path["/api/logs/{log_id}"]

    assert list_route.response_model == list[ExecutionLogResponse]
    assert detail_route.response_model is ExecutionLogResponse
    assert any(
        getattr(dep.call, "required_permission", None) == "logs:read"
        for dep in list_route.dependant.dependencies
    )
    assert any(
        getattr(dep.call, "required_permission", None) == "logs:read"
        for dep in detail_route.dependant.dependencies
    )


def test_log_routes_reject_missing_bearer_token():
    client = TestClient(app)

    list_response = client.get("/api/logs")
    detail_response = client.get("/api/logs/42")

    assert list_response.status_code == 401
    assert list_response.json()["detail"] == "Not authenticated"
    assert detail_response.status_code == 401
    assert detail_response.json()["detail"] == "Not authenticated"


def test_log_routes_reject_authenticated_user_without_logs_read_permission():
    access_token = auth.create_access_token(
        {"sub": "analyst1", "role": "analyst", "permissions": ["dashboard:read"]}
    )
    client = TestClient(app)

    list_response = client.get(
        "/api/logs",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    detail_response = client.get(
        "/api/logs/42",
        headers={"Authorization": f"Bearer {access_token}"},
    )

    assert list_response.status_code == 403
    assert list_response.json()["detail"] == "Permission required: logs:read"
    assert detail_response.status_code == 403
    assert detail_response.json()["detail"] == "Permission required: logs:read"


def test_get_logs_allows_authenticated_user_with_logs_read_permission():
    log = _log_row()
    access_token = auth.create_access_token(
        {"sub": "analyst1", "role": "analyst", "permissions": ["logs:read"]}
    )
    app.dependency_overrides[get_db] = lambda: FakeDb(FakeQuery(all_result=[log]))
    try:
        response = TestClient(app).get(
            "/api/logs?limit=7",
            headers={"Authorization": f"Bearer {access_token}"},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()[0]["log_id"] == 10
    assert response.json()[0]["workflow_name"] == "threat_detection"


def test_get_log_allows_authenticated_user_with_logs_read_permission():
    log = _log_row(log_id=42, status="partial_success")
    access_token = auth.create_access_token(
        {"sub": "analyst1", "role": "analyst", "permissions": ["logs:read"]}
    )
    app.dependency_overrides[get_db] = lambda: FakeDb(FakeQuery(first_result=log))
    try:
        response = TestClient(app).get(
            "/api/logs/42",
            headers={"Authorization": f"Bearer {access_token}"},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["log_id"] == 42
    assert response.json()["status"] == "partial_success"


def test_get_logs_rejects_invalid_limit_status_and_workflow_name():
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_current_user] = lambda: TokenData(
        username="analyst1",
        role="analyst",
        permissions=["logs:read"],
    )

    response = TestClient(app).get(
        "/api/logs",
        params={"limit": 0, "status": "queued", "workflow_name": ""},
    )

    assert response.status_code == 422
