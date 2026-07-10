from datetime import datetime, timezone
from types import SimpleNamespace
import sys
import types

import pytest
from fastapi import APIRouter, HTTPException

auth_stub = types.ModuleType("auth")
auth_stub.get_current_user = lambda: None
auth_stub.router = APIRouter(prefix="/api/auth", tags=["auth"])
sys.modules.setdefault("auth", auth_stub)

from main import app
from routers.activity import get_activities, get_activity
from schemas.activity import UserActivityResponse


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
    route_paths = {route.path for route in app.routes}

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


def test_get_activity_returns_detail_by_activity_id():
    activity = _activity_row(activity_id=42, activity_type="acknowledge_alert")
    query = FakeQuery(first_result=activity)
    fake_db = FakeDb(query)

    result = get_activity(activity_id=42, db=fake_db, current_user=object())

    detail = UserActivityResponse.model_validate(result)
    assert result == activity
    assert query.filter_args is not None
    assert detail.activity_id == 42
    assert detail.activity_type == "acknowledge_alert"


def test_get_activity_raises_404_when_activity_is_missing():
    query = FakeQuery(first_result=None)
    fake_db = FakeDb(query)

    with pytest.raises(HTTPException) as exc_info:
        get_activity(activity_id=999, db=fake_db, current_user=object())

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "User activity not found"
