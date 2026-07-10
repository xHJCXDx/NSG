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
from routers.keywords import (
    create_keyword,
    delete_keyword,
    get_keyword,
    get_keywords,
    update_keyword,
)
from schemas.keyword import KeywordCreate, KeywordResponse, KeywordUpdate


class FakeQuery:
    def __init__(self, *, all_result=None, first_result=None):
        self.all_result = all_result or []
        self.first_result = first_result
        self.filter_args = []
        self.order_by_args = None
        self.limit_value = None

    def filter(self, *args):
        self.filter_args.append(args)
        return self

    def order_by(self, *args):
        self.order_by_args = args
        return self

    def limit(self, value):
        self.limit_value = value
        return self

    def all(self):
        return self.all_result

    def first(self):
        return self.first_result


class FakeDb:
    def __init__(self, query):
        self.query_obj = query
        self.query_args = []
        self.added = []
        self.deleted = []
        self.committed = False
        self.refreshed = []

    def query(self, *args):
        self.query_args.append(args)
        return self.query_obj

    def add(self, obj):
        self.added.append(obj)

    def delete(self, obj):
        self.deleted.append(obj)

    def commit(self):
        self.committed = True

    def refresh(self, obj):
        self.refreshed.append(obj)
        if getattr(obj, "keyword_id", None) is None:
            obj.keyword_id = 101
        if getattr(obj, "added_at", None) is None:
            obj.added_at = datetime(2026, 7, 5, 14, 0, tzinfo=timezone.utc)
        if getattr(obj, "last_match_at", None) is None:
            obj.last_match_at = None
        if getattr(obj, "match_count", None) is None:
            obj.match_count = 0
        if getattr(obj, "false_positive_count", None) is None:
            obj.false_positive_count = 0
        if getattr(obj, "true_positive_count", None) is None:
            obj.true_positive_count = 0


def _keyword_row(**overrides):
    now = datetime(2026, 7, 5, 13, 0, tzinfo=timezone.utc)
    fields = {
        "keyword_id": 10,
        "keyword_text": "ransomware",
        "keyword_type": "threat",
        "keyword_category": "malware",
        "keyword_weight": 80,
        "is_active": True,
        "is_regex": False,
        "case_sensitive": False,
        "added_by": "analyst",
        "added_at": now,
        "last_match_at": None,
        "match_count": 5,
        "false_positive_count": 0,
        "true_positive_count": 4,
        "trigger_immediate_alert": True,
        "min_matches_for_alert": 1,
        "description": "High-risk keyword",
    }
    fields.update(overrides)
    return SimpleNamespace(**fields)


def test_main_registers_api_keywords_routes():
    route_paths = {route.path for route in app.routes}
    route_methods_by_path = {}
    for route in app.routes:
        if hasattr(route, "methods"):
            route_methods_by_path.setdefault(route.path, set()).update(route.methods)

    assert "/api/keywords" in route_paths
    assert "/api/keywords/{keyword_id}" in route_paths
    assert "POST" in route_methods_by_path["/api/keywords"]
    assert "PATCH" in route_methods_by_path["/api/keywords/{keyword_id}"]
    assert "DELETE" in route_methods_by_path["/api/keywords/{keyword_id}"]


def test_get_keywords_lists_keywords_with_default_limit():
    keyword = _keyword_row()
    query = FakeQuery(all_result=[keyword])
    fake_db = FakeDb(query)

    result = get_keywords(db=fake_db, current_user=object())

    assert result == [keyword]
    assert len(fake_db.query_args) == 1
    assert query.filter_args == []
    assert query.order_by_args is not None
    assert query.limit_value == 100
    response = KeywordResponse.model_validate(result[0])
    assert response.keyword_id == 10
    assert response.keyword_text == "ransomware"


def test_get_keywords_filters_active_keywords_when_requested():
    query = FakeQuery(all_result=[])
    fake_db = FakeDb(query)

    result = get_keywords(active_only=True, limit=25, db=fake_db, current_user=object())

    assert result == []
    assert len(query.filter_args) == 1
    assert query.order_by_args is not None
    assert query.limit_value == 25


def test_create_keyword_adds_commits_refreshes_and_returns_response_valid_object():
    query = FakeQuery()
    fake_db = FakeDb(query)
    request = KeywordCreate(
        keyword_text="credential leak",
        keyword_type="threat",
        keyword_category="data-exposure",
        keyword_weight=90,
        is_active=True,
        is_regex=False,
        case_sensitive=False,
        added_by="analyst",
        trigger_immediate_alert=True,
        min_matches_for_alert=1,
        description="Critical data exposure keyword",
    )

    result = create_keyword(request=request, db=fake_db, current_user=object())
    response = KeywordResponse.model_validate(result)

    assert fake_db.added == [result]
    assert fake_db.committed is True
    assert fake_db.refreshed == [result]
    assert result.keyword_text == "credential leak"
    assert result.match_count == 0
    assert response.keyword_id == 101
    assert response.keyword_text == "credential leak"
    assert response.trigger_immediate_alert is True


def test_get_keyword_returns_detail_by_keyword_id():
    keyword = _keyword_row(keyword_id=42, keyword_text="credential leak")
    query = FakeQuery(first_result=keyword)
    fake_db = FakeDb(query)

    result = get_keyword(keyword_id=42, db=fake_db, current_user=object())

    detail = KeywordResponse.model_validate(result)

    assert result == keyword
    assert len(query.filter_args) == 1
    assert detail.keyword_id == 42
    assert detail.keyword_text == "credential leak"


def test_get_keyword_raises_404_when_keyword_is_missing():
    query = FakeQuery(first_result=None)
    fake_db = FakeDb(query)

    with pytest.raises(HTTPException) as exc_info:
        get_keyword(keyword_id=999, db=fake_db, current_user=object())

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Keyword not found"


def test_update_keyword_changes_only_provided_fields_commits_and_refreshes():
    keyword = _keyword_row(keyword_id=42, keyword_text="ransomware", is_active=True)
    query = FakeQuery(first_result=keyword)
    fake_db = FakeDb(query)
    request = KeywordUpdate(is_active=False, description="Temporarily disabled")

    result = update_keyword(
        keyword_id=42,
        request=request,
        db=fake_db,
        current_user=object(),
    )
    response = KeywordResponse.model_validate(result)

    assert result == keyword
    assert keyword.keyword_text == "ransomware"
    assert keyword.is_active is False
    assert keyword.description == "Temporarily disabled"
    assert fake_db.committed is True
    assert fake_db.refreshed == [keyword]
    assert len(query.filter_args) == 1
    assert response.keyword_id == 42
    assert response.is_active is False


def test_update_keyword_raises_404_when_missing_and_does_not_commit():
    query = FakeQuery(first_result=None)
    fake_db = FakeDb(query)
    request = KeywordUpdate(is_active=False)

    with pytest.raises(HTTPException) as exc_info:
        update_keyword(
            keyword_id=999,
            request=request,
            db=fake_db,
            current_user=object(),
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Keyword not found"
    assert fake_db.committed is False
    assert fake_db.refreshed == []


def test_delete_keyword_deletes_and_commits():
    keyword = _keyword_row(keyword_id=42)
    query = FakeQuery(first_result=keyword)
    fake_db = FakeDb(query)

    result = delete_keyword(keyword_id=42, db=fake_db, current_user=object())

    assert result is None
    assert fake_db.deleted == [keyword]
    assert fake_db.committed is True
    assert len(query.filter_args) == 1


def test_delete_keyword_raises_404_when_missing_and_does_not_commit():
    query = FakeQuery(first_result=None)
    fake_db = FakeDb(query)

    with pytest.raises(HTTPException) as exc_info:
        delete_keyword(keyword_id=999, db=fake_db, current_user=object())

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Keyword not found"
    assert fake_db.deleted == []
    assert fake_db.committed is False
