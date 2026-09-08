from datetime import datetime, timezone
from types import SimpleNamespace

from fastapi import FastAPI
from fastapi.testclient import TestClient

import auth
from auth import get_current_user
from database import get_db
from main import app

from routers.metrics import (
    get_metrics_summary,
    get_recent_mentions,
    router,
)
from schemas.auth import TokenData
from schemas.metrics import MetricsSummaryEndpointResponse, RecentMentionResponse


class FakeQuery:
    def __init__(self, *, scalar_result=None, all_result=None):
        self.scalar_result = scalar_result
        self.all_result = all_result or []
        self.group_by_args = None
        self.order_by_args = None
        self.limit_value = None

    def scalar(self):
        return self.scalar_result

    def group_by(self, *args):
        self.group_by_args = args
        return self

    def order_by(self, *args):
        self.order_by_args = args
        return self

    def limit(self, value):
        self.limit_value = value
        return self

    def all(self):
        return self.all_result


class FakeDb:
    def __init__(self, queries):
        self.queries = queries
        self.query_args = []

    def query(self, *args):
        self.query_args.append(args)
        return self.queries.pop(0)


def test_metrics_summary_maps_orm_query_results_to_frontend_shape():
    fake_db = FakeDb(
        [
            FakeQuery(scalar_result=12),
            FakeQuery(all_result=[("positive", 7), ("neutral", 3), ("negative", 2)]),
            FakeQuery(scalar_result=5),
        ]
    )

    result = get_metrics_summary(db=fake_db, current_user=object())

    assert result == {
        "total_mentions": 12,
        "sentiment_distribution": {"positive": 7, "neutral": 3, "negative": 2},
        "alerts_count": 5,
    }
    assert len(fake_db.query_args) == 3


def test_metrics_summary_coerces_empty_counts_to_zero():
    fake_db = FakeDb(
        [
            FakeQuery(scalar_result=None),
            FakeQuery(all_result=[]),
            FakeQuery(scalar_result=None),
        ]
    )

    result = get_metrics_summary(db=fake_db, current_user=object())

    assert result == {
        "total_mentions": 0,
        "sentiment_distribution": {},
        "alerts_count": 0,
    }


def test_recent_mentions_maps_orm_rows_to_frontend_shape():
    created_at = datetime(2026, 7, 5, 10, 30, 0, tzinfo=timezone.utc)
    mentions_query = FakeQuery(
        all_result=[
            SimpleNamespace(
                mention_id=42,
                platform="github",
                text_content="Potential secret leaked in issue",
                created_at=created_at,
                author_username="security-researcher",
            )
        ]
    )
    fake_db = FakeDb([mentions_query])

    result = get_recent_mentions(db=fake_db, limit=10, current_user=object())

    assert result == [
        {
            "id": 42,
            "platform": "github",
            "text": "Potential secret leaked in issue",
            "created_at": created_at,
            "author": "security-researcher",
        }
    ]
    assert mentions_query.limit_value == 10


def test_metrics_routes_declare_response_models_and_auth_dependency():
    routes_by_path = {route.path: route for route in router.routes}

    summary_route = routes_by_path["/api/metrics/summary"]
    mentions_route = routes_by_path["/api/metrics/mentions"]

    assert summary_route.response_model is MetricsSummaryEndpointResponse
    assert mentions_route.response_model == list[RecentMentionResponse]
    assert any(
        getattr(dep.call, "required_permission", None) == "metrics:read"
        for dep in summary_route.dependant.dependencies
    )
    assert any(
        getattr(dep.call, "required_permission", None) == "mentions:read"
        for dep in mentions_route.dependant.dependencies
    )


def test_metrics_routes_reject_missing_bearer_token():
    app.dependency_overrides[get_db] = lambda: FakeDb(
        [
            FakeQuery(scalar_result=0),
            FakeQuery(all_result=[]),
            FakeQuery(scalar_result=0),
        ]
    )
    try:
        client = TestClient(app)
        summary_response = client.get("/api/metrics/summary")
        mentions_response = client.get("/api/metrics/mentions")
    finally:
        app.dependency_overrides.clear()

    assert summary_response.status_code == 401
    assert summary_response.json()["detail"] == "Not authenticated"
    assert mentions_response.status_code == 401
    assert mentions_response.json()["detail"] == "Not authenticated"


def test_metrics_routes_reject_authenticated_user_without_metrics_read_permission():
    access_token = auth.create_access_token(
        {"sub": "analyst1", "role": "analyst", "permissions": ["dashboard:read"]}
    )
    app.dependency_overrides[get_db] = lambda: FakeDb(
        [
            FakeQuery(scalar_result=0),
            FakeQuery(all_result=[]),
            FakeQuery(scalar_result=0),
        ]
    )
    try:
        client = TestClient(app)
        summary_response = client.get(
            "/api/metrics/summary",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        mentions_response = client.get(
            "/api/metrics/mentions",
            headers={"Authorization": f"Bearer {access_token}"},
        )
    finally:
        app.dependency_overrides.clear()

    assert summary_response.status_code == 403
    assert summary_response.json()["detail"] == "Permission required: metrics:read"
    assert mentions_response.status_code == 403
    assert mentions_response.json()["detail"] == "Permission required: mentions:read"


def test_metrics_summary_allows_authenticated_user_with_metrics_read_permission():
    access_token = auth.create_access_token(
        {"sub": "analyst1", "role": "analyst", "permissions": ["metrics:read"]}
    )
    app.dependency_overrides[get_db] = lambda: FakeDb(
        [
            FakeQuery(scalar_result=None),
            FakeQuery(all_result=[]),
            FakeQuery(scalar_result=None),
        ]
    )
    try:
        response = TestClient(app).get(
            "/api/metrics/summary",
            headers={"Authorization": f"Bearer {access_token}"},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {
        "total_mentions": 0,
        "sentiment_distribution": {},
        "alerts_count": 0,
    }


def test_metrics_mentions_allows_authenticated_user_with_mentions_read_permission():
    access_token = auth.create_access_token(
        {"sub": "analyst1", "role": "analyst", "permissions": ["mentions:read"]}
    )
    created_at = datetime(2026, 7, 5, 10, 30, 0, tzinfo=timezone.utc)
    app.dependency_overrides[get_db] = lambda: FakeDb(
        [
            FakeQuery(
                all_result=[
                    SimpleNamespace(
                        mention_id=42,
                        platform="github",
                        text_content="Potential secret leaked in issue",
                        created_at=created_at,
                        author_username="security-researcher",
                    )
                ]
            )
        ]
    )
    try:
        response = TestClient(app).get(
            "/api/metrics/mentions?limit=10",
            headers={"Authorization": f"Bearer {access_token}"},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == [
        {
            "id": 42,
            "platform": "github",
            "text": "Potential secret leaked in issue",
            "created_at": "2026-07-05T10:30:00Z",
            "author": "security-researcher",
        }
    ]


def test_recent_mentions_rejects_invalid_limit_before_querying_db():
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_current_user] = lambda: TokenData(
        username="analyst1",
        role="analyst",
        permissions=["mentions:read"],
    )

    response = TestClient(app).get("/api/metrics/mentions", params={"limit": 0})

    assert response.status_code == 422
