from datetime import datetime, timezone
from decimal import Decimal
from types import SimpleNamespace
import sys
import types

import pytest
from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.testclient import TestClient

auth_stub = types.ModuleType("auth")
auth_stub.get_current_user = lambda: None
auth_stub.router = APIRouter(prefix="/api/auth", tags=["auth"])
sys.modules.setdefault("auth", auth_stub)

from main import app
from routers.threats import get_current_user, get_threat, get_threats, review_threat, router
from schemas.threat import ThreatDetail, ThreatListResponse, ThreatReviewRequest


class FakeQuery:
    def __init__(self, *, all_result=None, first_result=None):
        self.all_result = all_result or []
        self.first_result = first_result
        self.order_by_args = None
        self.limit_value = None
        self.filter_args = []
        self.outerjoin_args = None
        self.add_entity_args = None

    def order_by(self, *args):
        self.order_by_args = args
        return self

    def limit(self, value):
        self.limit_value = value
        return self

    def outerjoin(self, *args):
        self.outerjoin_args = args
        return self

    def add_entity(self, *args):
        self.add_entity_args = args
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


def _threat_row(**overrides):
    now = datetime(2026, 7, 5, 11, 0, tzinfo=timezone.utc)
    fields = {
        "detection_id": 10,
        "mention_id": 20,
        "sentiment_id": 30,
        "threat_type": "credential_leak",
        "threat_category": "data_exposure",
        "criticality_level": "critical",
        "confidence_score": Decimal("0.875"),
        "risk_score": 95,
        "matched_keywords": ["password", "leak"],
        "detection_rules_triggered": ["credential-rule"],
        "detection_method": "keyword_match",
        "contextual_notes": "Possible leaked credentials",
        "related_iocs": ["example.com"],
        "affected_assets": ["admin"],
        "potential_impact": "Account takeover",
        "detected_at": now,
        "review_status": "pending",
        "reviewed_by": None,
        "reviewed_at": None,
        "review_notes": None,
        "actions_taken": None,
        "remediation_status": None,
        "resolution_time": None,
        "escalated": False,
        "escalated_to": None,
        "escalation_time": None,
        "last_updated": now,
    }
    fields.update(overrides)
    return SimpleNamespace(**fields)


def _mention_row(**overrides):
    fields = {
        "mention_id": 20,
        "text_content": "admin password leaked",
        "platform": "github",
    }
    fields.update(overrides)
    return SimpleNamespace(**fields)


def test_main_registers_api_threats_routes():
    route_methods_by_path = {
        path: {method.upper() for method in operations}
        for path, operations in app.openapi()["paths"].items()
    }

    assert "/api/threats" in route_methods_by_path
    assert "/api/threats/{threat_id}" in route_methods_by_path
    assert "/api/threats/{threat_id}/review" in route_methods_by_path
    assert "PATCH" in route_methods_by_path["/api/threats/{threat_id}/review"]


def test_get_threats_lists_recent_detections_with_limit():
    threat = _threat_row()
    mention = _mention_row()
    query = FakeQuery(all_result=[(threat, mention)])
    fake_db = FakeDb(query)

    result = get_threats(db=fake_db, limit=7, current_user=object())

    assert result == [
        {
            "detection_id": 10,
            "mention_id": 20,
            "threat_type": "credential_leak",
            "threat_category": "data_exposure",
            "criticality_level": "critical",
            "confidence_score": Decimal("0.875"),
            "risk_score": 95,
            "matched_keywords": ["password", "leak"],
            "detection_rules_triggered": ["credential-rule"],
            "contextual_notes": "Possible leaked credentials",
            "detected_at": threat.detected_at,
            "review_status": "pending",
            "last_updated": threat.last_updated,
            "related_mention": {
                "mention_id": 20,
                "text_content": "admin password leaked",
                "platform": "github",
            },
        }
    ]
    assert len(fake_db.query_args) == 1
    assert query.outerjoin_args is not None
    assert query.add_entity_args is not None
    assert query.order_by_args is not None
    assert query.limit_value == 7
    assert ThreatListResponse.model_validate(result[0]).confidence_score == 0.875


def test_get_threats_applies_supported_filters_before_limit():
    query = FakeQuery(all_result=[])
    fake_db = FakeDb(query)

    result = get_threats(
        db=fake_db,
        limit=25,
        criticality_level="critical",
        review_status="pending",
        mention_id=20,
        current_user=object(),
    )

    assert result == []
    assert len(query.filter_args) == 3
    assert query.order_by_args is not None
    assert query.limit_value == 25


def test_get_threats_limit_defaults_to_fifty_when_called_directly():
    query = FakeQuery(all_result=[])
    fake_db = FakeDb(query)

    result = get_threats(db=fake_db, current_user=object())

    assert result == []
    assert query.limit_value == 50


def test_get_threat_returns_detail_by_detection_id():
    threat = _threat_row(detection_id=42)
    query = FakeQuery(first_result=threat)
    fake_db = FakeDb(query)

    result = get_threat(threat_id=42, db=fake_db, current_user=object())

    detail = ThreatDetail.model_validate(result)

    assert result == threat
    assert query.filter_args
    assert detail.detection_id == 42
    assert detail.matched_keywords == ["password", "leak"]


def test_get_threat_raises_404_when_detection_is_missing():
    query = FakeQuery(first_result=None)
    fake_db = FakeDb(query)

    with pytest.raises(HTTPException) as exc_info:
        get_threat(threat_id=999, db=fake_db, current_user=object())

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Threat detection not found"


def test_review_threat_updates_fields_commits_refreshes_and_returns_detail():
    threat = _threat_row(detection_id=42)
    query = FakeQuery(first_result=threat)
    fake_db = FakeDb(query)
    request = ThreatReviewRequest(
        review_status="confirmed",
        review_notes="Verified by analyst",
        reviewed_by="analyst@example.com",
        remediation_status="in_progress",
    )

    result = review_threat(
        threat_id=42,
        request=request,
        db=fake_db,
        current_user=object(),
    )

    detail = ThreatDetail.model_validate(result)

    assert result == threat
    assert threat.review_status == "confirmed"
    assert threat.review_notes == "Verified by analyst"
    assert threat.reviewed_by == "analyst@example.com"
    assert threat.remediation_status == "in_progress"
    assert fake_db.committed is True
    assert fake_db.refreshed == [threat]
    assert query.filter_args
    assert detail.detection_id == 42
    assert detail.review_status == "confirmed"


def test_review_threat_raises_404_when_detection_is_missing_and_does_not_commit():
    query = FakeQuery(first_result=None)
    fake_db = FakeDb(query)
    request = ThreatReviewRequest(review_status="confirmed")

    with pytest.raises(HTTPException) as exc_info:
        review_threat(
            threat_id=999,
            request=request,
            db=fake_db,
            current_user=object(),
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Threat detection not found"
    assert fake_db.committed is False
    assert fake_db.refreshed == []


def test_review_threat_sets_timezone_aware_reviewed_at():
    threat = _threat_row(reviewed_at=None)
    query = FakeQuery(first_result=threat)
    fake_db = FakeDb(query)
    request = ThreatReviewRequest(review_status="reviewing")

    review_threat(
        threat_id=10,
        request=request,
        db=fake_db,
        current_user=object(),
    )

    assert threat.reviewed_at is not None
    assert threat.reviewed_at.tzinfo is not None
    assert threat.reviewed_at.utcoffset() == timezone.utc.utcoffset(threat.reviewed_at)


def test_threat_routes_declare_response_models_and_auth_dependency():
    routes_by_path = {route.path: route for route in router.routes}

    list_route = routes_by_path["/api/threats"]
    detail_route = routes_by_path["/api/threats/{threat_id}"]
    review_route = routes_by_path["/api/threats/{threat_id}/review"]

    assert list_route.response_model == list[ThreatListResponse]
    assert detail_route.response_model is ThreatDetail
    assert review_route.response_model is ThreatDetail
    assert any(dep.call is get_current_user for dep in list_route.dependant.dependencies)
    assert any(dep.call is get_current_user for dep in detail_route.dependant.dependencies)
    assert any(dep.call is get_current_user for dep in review_route.dependant.dependencies)


def test_get_threats_rejects_invalid_limit_and_filters():
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_current_user] = lambda: object()

    response = TestClient(app).get(
        "/api/threats",
        params={"limit": 0, "criticality_level": "extreme", "mention_id": 0},
    )

    assert response.status_code == 422
