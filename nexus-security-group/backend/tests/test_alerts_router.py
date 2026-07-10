from datetime import datetime, timezone
from types import SimpleNamespace
import sys
import types
import uuid

import pytest
from fastapi import APIRouter, HTTPException

auth_stub = types.ModuleType("auth")
auth_stub.get_current_user = lambda: None
auth_stub.router = APIRouter(prefix="/api/auth", tags=["auth"])
sys.modules.setdefault("auth", auth_stub)

from main import app
from routers.alerts import acknowledge_alert, get_alert, get_alerts
from schemas.alert import AcknowledgeRequest, AlertResponse


class FakeQuery:
    def __init__(self, *, all_result=None, first_result=None):
        self.all_result = all_result or []
        self.first_result = first_result
        self.order_by_args = None
        self.limit_value = None
        self.filter_args = None

    def order_by(self, *args):
        self.order_by_args = args
        return self

    def limit(self, value):
        self.limit_value = value
        return self

    def filter(self, *args):
        self.filter_args = args
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
    route_paths = {route.path for route in app.routes}
    route_methods_by_path = {
        route.path: route.methods for route in app.routes if hasattr(route, "methods")
    }

    assert "/api/alerts" in route_paths
    assert "/api/alerts/{alert_id}" in route_paths
    assert "/api/alerts/{alert_id}/acknowledge" in route_paths
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
    assert query.filter_args is not None
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
    assert query.filter_args is not None
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
