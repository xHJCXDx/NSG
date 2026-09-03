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
auth_stub.router = APIRouter(prefix="/api/auth", tags=["auth"])
sys.modules.setdefault("auth", auth_stub)

from main import app
from auth import get_current_user, require_permission
from routers.alerts import (
    acknowledge_alert,
    get_alert,
    get_alerts,
    router,
)
from database import get_db
from schemas.alert import AcknowledgeRequest, AlertResponse
from schemas.auth import TokenData


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
        self.committed = False
        self.refreshed = []

    def query(self, *args):
        self.query_args.append(args)
        return self.query_obj

    def commit(self):
        self.committed = True

    def refresh(self, obj):
        self.refreshed.append(obj)


def _alert_row(**overrides):
    now = datetime(2026, 7, 5, 12, 0, tzinfo=timezone.utc)
    fields = {
        "alert_id": 10,
        "detection_id": 20,
        "alert_uuid": uuid.uuid4(),
        "alert_title": "Critical threat detected",
        "alert_message": "Potential credential leak found",
        "alert_severity": "critical",
        "channels_sent": ["slack", "email"],
        "slack_channel": "#security-alerts",
        "created_at": now,
        "sent_at": now,
        "delivery_status": "sent",
        "acknowledged": False,
        "acknowledged_by": None,
        "acknowledged_at": None,
        "last_updated": now,
    }
    fields.update(overrides)
    return SimpleNamespace(**fields)


def test_main_registers_api_alerts_routes():
    route_methods_by_path = {
        path: {method.upper() for method in operations}
        for path, operations in app.openapi()["paths"].items()
    }

    assert "/api/alerts" in route_methods_by_path
    assert "/api/alerts/{alert_id}" in route_methods_by_path
    assert "/api/alerts/{alert_id}/acknowledge" in route_methods_by_path
    assert "PATCH" in route_methods_by_path["/api/alerts/{alert_id}/acknowledge"]


def test_get_alerts_lists_recent_alerts_with_limit():
    alert = _alert_row()
    query = FakeQuery(all_result=[alert])
    fake_db = FakeDb(query)

    result = get_alerts(db=fake_db, limit=7, current_user=object())

    assert result == [alert]
    assert len(fake_db.query_args) == 1
    assert query.order_by_args is not None
    assert query.limit_value == 7
    response = AlertResponse.model_validate(result[0])
    assert response.alert_id == 10
    assert response.channels_sent == ["slack", "email"]


def test_get_alerts_applies_supported_status_filters_before_limit():
    query = FakeQuery(all_result=[])
    fake_db = FakeDb(query)

    result = get_alerts(
        db=fake_db,
        limit=25,
        delivery_status="failed",
        acknowledged=False,
        current_user=object(),
    )

    assert result == []
    assert len(query.filter_args) == 2
    assert query.order_by_args is not None
    assert query.limit_value == 25


def test_get_alerts_limit_defaults_to_fifty_when_called_directly():
    query = FakeQuery(all_result=[])
    fake_db = FakeDb(query)

    result = get_alerts(db=fake_db, current_user=object())

    assert result == []
    assert query.limit_value == 50


def test_get_alert_returns_detail_by_alert_id():
    alert = _alert_row(alert_id=42, acknowledged=True, acknowledged_by="analyst")
    query = FakeQuery(first_result=alert)
    fake_db = FakeDb(query)

    result = get_alert(alert_id=42, db=fake_db, current_user=object())

    detail = AlertResponse.model_validate(result)
    assert result == alert
    assert query.filter_args
    assert detail.alert_id == 42
    assert detail.acknowledged is True
    assert detail.acknowledged_by == "analyst"


def test_get_alert_raises_404_when_alert_is_missing():
    query = FakeQuery(first_result=None)
    fake_db = FakeDb(query)

    with pytest.raises(HTTPException) as exc_info:
        get_alert(alert_id=999, db=fake_db, current_user=object())

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Alert not found"


def test_acknowledge_alert_updates_fields_commits_refreshes_and_returns_response():
    alert = _alert_row(alert_id=42)
    query = FakeQuery(first_result=alert)
    fake_db = FakeDb(query)
    request = AcknowledgeRequest(acknowledged_by="analyst@example.com")

    result = acknowledge_alert(
        alert_id=42,
        request=request,
        db=fake_db,
        current_user=object(),
    )

    response = AlertResponse.model_validate(result)

    assert result == alert
    assert alert.acknowledged is True
    assert alert.acknowledged_by == "analyst@example.com"
    assert alert.acknowledged_at is not None
    assert fake_db.committed is True
    assert fake_db.refreshed == [alert]
    assert query.filter_args
    assert response.alert_id == 42
    assert response.acknowledged is True
    assert response.acknowledged_by == "analyst@example.com"


def test_acknowledge_alert_raises_404_when_alert_is_missing_and_does_not_commit():
    query = FakeQuery(first_result=None)
    fake_db = FakeDb(query)
    request = AcknowledgeRequest(acknowledged_by="analyst@example.com")

    with pytest.raises(HTTPException) as exc_info:
        acknowledge_alert(
            alert_id=999,
            request=request,
            db=fake_db,
            current_user=object(),
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Alert not found"
    assert fake_db.committed is False
    assert fake_db.refreshed == []


def test_acknowledge_alert_sets_timezone_aware_acknowledged_at():
    alert = _alert_row(acknowledged_at=None)
    query = FakeQuery(first_result=alert)
    fake_db = FakeDb(query)
    request = AcknowledgeRequest(acknowledged_by="analyst@example.com")

    acknowledge_alert(
        alert_id=10,
        request=request,
        db=fake_db,
        current_user=object(),
    )

    assert alert.acknowledged_at is not None
    assert alert.acknowledged_at.tzinfo is not None
    assert alert.acknowledged_at.utcoffset() == timezone.utc.utcoffset(
        alert.acknowledged_at
    )


def test_alert_routes_declare_response_models_and_auth_dependency():
    routes_by_path = {route.path: route for route in router.routes}

    list_route = routes_by_path["/api/alerts"]
    detail_route = routes_by_path["/api/alerts/{alert_id}"]
    acknowledge_route = routes_by_path["/api/alerts/{alert_id}/acknowledge"]

    assert list_route.response_model == list[AlertResponse]
    assert detail_route.response_model is AlertResponse
    assert acknowledge_route.response_model is AlertResponse
    assert any(
        getattr(dep.call, "required_permission", None) == "alerts:read"
        for dep in list_route.dependant.dependencies
    )
    assert any(
        getattr(dep.call, "required_permission", None) == "alerts:read"
        for dep in detail_route.dependant.dependencies
    )
    assert any(
        dep.call is get_current_user
        for dep in acknowledge_route.dependant.dependencies
    )


def test_get_alerts_rejects_invalid_limit_and_delivery_status():
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_current_user] = lambda: TokenData(
        username="analyst1",
        role="analyst",
        auth_source="database",
        permissions=["alerts:read"],
    )

    response = TestClient(app).get(
        "/api/alerts",
        params={"limit": 0, "delivery_status": "queued", "acknowledged": "invalid"},
    )

    assert response.status_code == 422


def test_alerts_read_routes_reject_missing_bearer_token():
    client = TestClient(app)

    for path in ["/api/alerts", "/api/alerts/1"]:
        response = client.get(path)
        assert response.status_code == 401, f"{path} should reject without token"
        assert response.json()["detail"] == "Not authenticated"


def test_alerts_read_routes_reject_user_without_alerts_read_permission():
    authz_app = FastAPI()
    authz_app.include_router(router)
    authz_app.dependency_overrides[get_db] = lambda: object()
    authz_app.dependency_overrides[get_current_user] = lambda: TokenData(
        username="analyst1",
        role="analyst",
        auth_source="database",
        permissions=["dashboard:read"],
    )
    client = TestClient(authz_app)

    for path in ["/api/alerts", "/api/alerts/1"]:
        response = client.get(path)
        assert response.status_code == 403, f"{path} should reject without alerts:read"
        assert "alerts:read" in response.json()["detail"]


def test_alerts_read_routes_allow_user_with_alerts_read_permission():
    authz_app = FastAPI()
    authz_app.include_router(router)

    alert = _alert_row(alert_id=1)
    fake_query = FakeQuery(all_result=[alert], first_result=alert)
    fake_db = FakeDb(fake_query)

    authz_app.dependency_overrides[get_db] = lambda: fake_db
    authz_app.dependency_overrides[get_current_user] = lambda: TokenData(
        username="analyst1",
        role="analyst",
        auth_source="database",
        permissions=["alerts:read"],
    )
    client = TestClient(authz_app)

    assert client.get("/api/alerts").status_code == 200
    assert client.get("/api/alerts/1").status_code == 200
