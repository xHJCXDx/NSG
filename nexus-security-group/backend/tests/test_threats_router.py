from datetime import datetime, timezone
from decimal import Decimal
from types import SimpleNamespace

from fastapi.testclient import TestClient

from auth import get_current_user
from database import get_db
from main import app
from schemas.auth import TokenData


class FakeResult:
    def __init__(self, rows):
        self.rows = rows

    def fetchall(self):
        return self.rows


class FakeDb:
    def __init__(self, rows):
        self.rows = rows
        self.executed_query = None
        self.executed_params = None

    def execute(self, query, params):
        self.executed_query = str(query)
        self.executed_params = params
        return FakeResult(self.rows)


def test_main_registers_api_threats_route():
    route_paths = {route.path for route in app.routes}

    assert "/api/threats" in route_paths


def test_threats_endpoint_maps_rows_to_frontend_shape_with_related_mention():
    detected_at = datetime(2026, 7, 3, 12, 0, tzinfo=timezone.utc)
    last_updated = datetime(2026, 7, 3, 12, 5, tzinfo=timezone.utc)
    fake_db = FakeDb(
        [
            SimpleNamespace(
                detection_id=10,
                mention_id=20,
                threat_type="credential_leak",
                threat_category="data_exposure",
                criticality_level="critical",
                confidence_score=Decimal("0.875"),
                risk_score=95,
                matched_keywords=["password", "leak"],
                detection_rules_triggered=["credential-rule"],
                contextual_notes="Possible leaked credentials",
                detected_at=detected_at,
                review_status="pending",
                last_updated=last_updated,
                mention_text_content="admin password leaked",
                mention_platform="twitter",
            )
        ]
    )

    def override_db():
        yield fake_db

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = lambda: TokenData(username="admin")
    try:
        response = TestClient(app).get("/api/threats?limit=1")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == [
        {
            "detection_id": 10,
            "mention_id": 20,
            "threat_type": "credential_leak",
            "threat_category": "data_exposure",
            "criticality_level": "critical",
            "confidence_score": 0.875,
            "risk_score": 95,
            "matched_keywords": ["password", "leak"],
            "detection_rules_triggered": ["credential-rule"],
            "contextual_notes": "Possible leaked credentials",
            "detected_at": "2026-07-03T12:00:00+00:00",
            "review_status": "pending",
            "last_updated": "2026-07-03T12:05:00+00:00",
            "related_mention": {
                "mention_id": 20,
                "text_content": "admin password leaked",
                "platform": "twitter",
            },
        }
    ]


def test_threats_query_uses_bound_limit_parameter():
    fake_db = FakeDb([])

    def override_db():
        yield fake_db

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = lambda: TokenData(username="admin")
    try:
        response = TestClient(app).get("/api/threats?limit=7")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert "LIMIT :limit" in fake_db.executed_query
    assert fake_db.executed_params == {"limit": 7}


def test_threats_limit_defaults_to_fifty():
    fake_db = FakeDb([])

    def override_db():
        yield fake_db

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = lambda: TokenData(username="admin")
    try:
        response = TestClient(app).get("/api/threats")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert fake_db.executed_params == {"limit": 50}


def test_threats_limit_is_bounded_to_one_hundred():
    app.dependency_overrides[get_current_user] = lambda: TokenData(username="admin")
    try:
        response = TestClient(app).get("/api/threats?limit=101")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 422
