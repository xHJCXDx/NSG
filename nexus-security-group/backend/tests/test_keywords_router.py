from datetime import datetime, timezone
from types import SimpleNamespace
import sys
import types

import pytest
from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError

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
    get_current_user,
    router,
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
    def __init__(self, query, *, commit_exception=None):
        self.query_obj = query
        self.commit_exception = commit_exception
        self.query_args = []
        self.added = []
        self.deleted = []
        self.committed = False
        self.rolled_back = False
        self.refreshed = []

    def query(self, *args):
        self.query_args.append(args)
        return self.query_obj

    def add(self, obj):
        self.added.append(obj)

    def delete(self, obj):
        self.deleted.append(obj)

    def commit(self):
        if self.commit_exception is not None:
            raise self.commit_exception
        self.committed = True

    def rollback(self):
        self.rolled_back = True

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
    route_methods_by_path = {
        path: {method.upper() for method in operations}
        for path, operations in app.openapi()["paths"].items()
    }

    assert "/api/keywords" in route_methods_by_path
    assert "/api/keywords/{keyword_id}" in route_methods_by_path
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


def test_create_keyword_returns_409_for_duplicate_keyword():
    fake_db = FakeDb(
        FakeQuery(),
        commit_exception=IntegrityError("insert", "params", Exception("duplicate")),
    )
    request = KeywordCreate(keyword_text="credential leak")

    with pytest.raises(HTTPException) as exc_info:
        create_keyword(request=request, db=fake_db, current_user=object())

    assert exc_info.value.status_code == 409
    assert exc_info.value.detail == "Keyword already exists"
    assert fake_db.rolled_back is True
    assert fake_db.refreshed == []


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


def test_update_keyword_returns_409_for_duplicate_keyword_text():
    keyword = _keyword_row(keyword_id=42, keyword_text="ransomware")
    fake_db = FakeDb(
        FakeQuery(first_result=keyword),
        commit_exception=IntegrityError("update", "params", Exception("duplicate")),
    )
    request = KeywordUpdate(keyword_text="credential leak")

    with pytest.raises(HTTPException) as exc_info:
        update_keyword(
            keyword_id=42,
            request=request,
            db=fake_db,
            current_user=object(),
        )

    assert exc_info.value.status_code == 409
    assert exc_info.value.detail == "Keyword already exists"
    assert fake_db.rolled_back is True
    assert fake_db.refreshed == []


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


def test_keyword_routes_declare_response_models_and_auth_dependency():
    list_route = next(
        route
        for route in router.routes
        if route.path == "/api/keywords" and "GET" in route.methods
    )
    detail_route = next(
        route
        for route in router.routes
        if route.path == "/api/keywords/{keyword_id}" and "GET" in route.methods
    )
    create_route = next(
        route
        for route in router.routes
        if route.path == "/api/keywords" and "POST" in route.methods
    )
    update_route = next(
        route
        for route in router.routes
        if route.path == "/api/keywords/{keyword_id}" and "PATCH" in route.methods
    )
    delete_route = next(
        route
        for route in router.routes
        if route.path == "/api/keywords/{keyword_id}" and "DELETE" in route.methods
    )

    assert list_route.response_model == list[KeywordResponse]
    assert create_route.response_model is KeywordResponse
    assert create_route.status_code == 201
    assert detail_route.response_model is KeywordResponse
    assert update_route.response_model is KeywordResponse
    assert delete_route.status_code == 204
    assert any(dep.call is get_current_user for dep in list_route.dependant.dependencies)
    assert any(dep.call is get_current_user for dep in create_route.dependant.dependencies)
    assert any(dep.call is get_current_user for dep in detail_route.dependant.dependencies)
    assert any(dep.call is get_current_user for dep in update_route.dependant.dependencies)
    assert any(dep.call is get_current_user for dep in delete_route.dependant.dependencies)


def test_get_keywords_rejects_invalid_limit():
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_current_user] = lambda: object()

    response = TestClient(app).get("/api/keywords", params={"limit": 0})

    assert response.status_code == 422
