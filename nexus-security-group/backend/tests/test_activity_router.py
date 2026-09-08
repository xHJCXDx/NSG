from datetime import datetime, timezone
from types import SimpleNamespace
import sys
import types

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
from routers.activity import get_activities, get_activity, router
from schemas.auth import TokenData
from schemas.activity import UserActivityResponse


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


def _activity_row(**overrides):
    now = datetime(2026, 7, 5, 15, 0, tzinfo=timezone.utc)
    fields = {
        "activity_id": 10,
        "username": "analyst",
        "user_role": "security",
        "activity_type": "review_threat",
        "activity_description": "Reviewed high-risk detection",
        "related_mention_id": 20,
        "related_detection_id": 30,
        "related_alert_id": None,
        "ip_address": "192.168.1.10",
        "user_agent": "Mozilla/5.0",
        "session_id": "sess-001",
        "activity_timestamp": now,
        "activity_data": {"risk": "high"},
    }
    fields.update(overrides)
    return SimpleNamespace(**fields)


def test_main_registers_api_activity_routes():
    route_paths = set(app.openapi()["paths"])

    assert "/api/activity" in route_paths
    assert "/api/activity/{activity_id}" in route_paths


def test_get_activities_lists_recent_user_activity_with_limit():
    activity = _activity_row()
    query = FakeQuery(all_result=[activity])
    fake_db = FakeDb(query)

    result = get_activities(db=fake_db, limit=7, current_user=object())

    assert result == [activity]
    assert len(fake_db.query_args) == 1
    assert query.order_by_args is not None
    assert query.limit_value == 7
    response = UserActivityResponse.model_validate(result[0])
    assert response.activity_id == 10
    assert response.activity_type == "review_threat"


def test_get_activities_limit_defaults_to_fifty_when_called_directly():
    query = FakeQuery(all_result=[])
    fake_db = FakeDb(query)

    result = get_activities(db=fake_db, current_user=object())

    assert result == []
    assert query.limit_value == 50


def test_get_activities_applies_username_and_activity_type_filters_before_limit():
    query = FakeQuery(all_result=[])
    fake_db = FakeDb(query)

    result = get_activities(
        db=fake_db,
        limit=25,
        username="analyst",
        activity_type="review_threat",
        current_user=object(),
    )

    assert result == []
    assert len(query.filter_args) == 2
    assert query.order_by_args is not None
    assert query.limit_value == 25


def test_get_activity_returns_detail_by_activity_id():
    activity = _activity_row(activity_id=42, activity_type="acknowledge_alert")
    query = FakeQuery(first_result=activity)
    fake_db = FakeDb(query)

    result = get_activity(activity_id=42, db=fake_db, current_user=object())

    detail = UserActivityResponse.model_validate(result)
    assert result == activity
    assert query.filter_args
    assert detail.activity_id == 42
    assert detail.activity_type == "acknowledge_alert"


def test_get_activity_raises_404_when_activity_is_missing():
    query = FakeQuery(first_result=None)
    fake_db = FakeDb(query)

    with pytest.raises(HTTPException) as exc_info:
        get_activity(activity_id=999, db=fake_db, current_user=object())

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "User activity not found"


def test_activity_routes_declare_response_models_and_auth_dependency():
    routes_by_path = {route.path: route for route in router.routes}

    list_route = routes_by_path["/api/activity"]
    detail_route = routes_by_path["/api/activity/{activity_id}"]

    assert list_route.response_model == list[UserActivityResponse]
    assert detail_route.response_model is UserActivityResponse
    assert any(
        getattr(dep.call, "required_permission", None) == "logs:read"
        for dep in list_route.dependant.dependencies
    )
    assert any(
        getattr(dep.call, "required_permission", None) == "logs:read"
        for dep in detail_route.dependant.dependencies
    )


def test_activity_routes_reject_missing_bearer_token():
    client = TestClient(app)

    list_response = client.get("/api/activity")
    detail_response = client.get("/api/activity/42")

    assert list_response.status_code == 401
    assert list_response.json()["detail"] == "Not authenticated"
    assert detail_response.status_code == 401
    assert detail_response.json()["detail"] == "Not authenticated"


def test_activity_routes_reject_authenticated_user_without_logs_read_permission():
    access_token = auth.create_access_token(
        {"sub": "analyst1", "role": "analyst", "permissions": ["dashboard:read"]}
    )
    client = TestClient(app)

    list_response = client.get(
        "/api/activity",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    detail_response = client.get(
        "/api/activity/42",
        headers={"Authorization": f"Bearer {access_token}"},
    )

    assert list_response.status_code == 403
    assert list_response.json()["detail"] == "Permission required: logs:read"
    assert detail_response.status_code == 403
    assert detail_response.json()["detail"] == "Permission required: logs:read"


def test_get_activities_allows_authenticated_user_with_logs_read_permission():
    activity = _activity_row()
    access_token = auth.create_access_token(
        {"sub": "analyst1", "role": "analyst", "permissions": ["logs:read"]}
    )
    app.dependency_overrides[get_db] = lambda: FakeDb(FakeQuery(all_result=[activity]))
    try:
        response = TestClient(app).get(
            "/api/activity?limit=7",
            headers={"Authorization": f"Bearer {access_token}"},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()[0]["activity_id"] == 10
    assert response.json()[0]["activity_type"] == "review_threat"


def test_get_activity_allows_authenticated_user_with_logs_read_permission():
    activity = _activity_row(activity_id=42, activity_type="acknowledge_alert")
    access_token = auth.create_access_token(
        {"sub": "analyst1", "role": "analyst", "permissions": ["logs:read"]}
    )
    app.dependency_overrides[get_db] = lambda: FakeDb(FakeQuery(first_result=activity))
    try:
        response = TestClient(app).get(
            "/api/activity/42",
            headers={"Authorization": f"Bearer {access_token}"},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["activity_id"] == 42
    assert response.json()["activity_type"] == "acknowledge_alert"


def test_get_activities_rejects_invalid_limit_username_and_activity_type():
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_current_user] = lambda: TokenData(
        username="analyst1",
        role="analyst",
        permissions=["logs:read"],
    )

    response = TestClient(app).get(
        "/api/activity",
        params={"limit": 0, "username": "", "activity_type": ""},
    )

    assert response.status_code == 422
