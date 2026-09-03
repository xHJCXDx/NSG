from fastapi.routing import APIRoute
from fastapi.testclient import TestClient

import auth
from database import get_db
from main import app
from routers.dashboard import get_dashboard_summary
from schemas.dashboard import DashboardSummaryResponse


class FakeQuery:
    def __init__(self, count_result=None):
        self.count_result = count_result
        self.filter_args = []

    def filter(self, *args):
        self.filter_args.append(args)
        return self

    def count(self):
        return self.count_result


class FakeDb:
    def __init__(self, queries):
        self.queries = queries
        self.query_args = []

    def query(self, *args):
        self.query_args.append(args)
        return self.queries.pop(0)


def test_main_registers_api_dashboard_summary_route():
    from routers.dashboard import router as dashboard_router

    route_paths = {route.path for route in dashboard_router.routes if isinstance(route, APIRoute)}
    route_methods_by_path = {
        route.path: route.methods for route in dashboard_router.routes if isinstance(route, APIRoute)
    }

    assert "/api/dashboard/summary" in route_paths
    assert "GET" in route_methods_by_path["/api/dashboard/summary"]


def test_dashboard_summary_requires_dashboard_read_permission():
    from routers.dashboard import router as dashboard_router

    summary_route = next(
        route
        for route in dashboard_router.routes
        if isinstance(route, APIRoute) and route.path == "/api/dashboard/summary"
    )

    assert any(
        getattr(dep.call, "required_permission", None) == "dashboard:read"
        for dep in summary_route.dependant.dependencies
    )


def test_dashboard_summary_rejects_missing_bearer_token():
    app.dependency_overrides[get_db] = lambda: FakeDb([FakeQuery(count_result=0) for _ in range(7)])
    try:
        response = TestClient(app).get("/api/dashboard/summary")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"


def test_dashboard_summary_rejects_authenticated_user_without_dashboard_read_permission():
    access_token = auth.create_access_token(
        {"sub": "analyst1", "role": "analyst", "permissions": ["threats:read"]}
    )
    app.dependency_overrides[get_db] = lambda: FakeDb([FakeQuery(count_result=0) for _ in range(7)])
    try:
        response = TestClient(app).get(
            "/api/dashboard/summary",
            headers={"Authorization": f"Bearer {access_token}"},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 403
    assert response.json()["detail"] == "Permission required: dashboard:read"


def test_dashboard_summary_allows_authenticated_user_with_dashboard_read_permission():
    access_token = auth.create_access_token(
        {"sub": "analyst1", "role": "analyst", "permissions": ["dashboard:read"]}
    )
    app.dependency_overrides[get_db] = lambda: FakeDb([FakeQuery(count_result=None) for _ in range(7)])
    try:
        response = TestClient(app).get(
            "/api/dashboard/summary",
            headers={"Authorization": f"Bearer {access_token}"},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {
        "total_threats": 0,
        "pending_threats": 0,
        "total_alerts": 0,
        "unacknowledged_alerts": 0,
        "active_keywords": 0,
        "execution_logs_count": 0,
        "activity_count": 0,
    }


def test_dashboard_summary_counts_existing_domain_models():
    pending_threats_query = FakeQuery(count_result=3)
    unacknowledged_alerts_query = FakeQuery(count_result=5)
    active_keywords_query = FakeQuery(count_result=8)
    fake_db = FakeDb(
        [
            FakeQuery(count_result=12),
            pending_threats_query,
            FakeQuery(count_result=7),
            unacknowledged_alerts_query,
            active_keywords_query,
            FakeQuery(count_result=21),
            FakeQuery(count_result=34),
        ]
    )

    result = get_dashboard_summary(db=fake_db, current_user=object())

    assert result == {
        "total_threats": 12,
        "pending_threats": 3,
        "total_alerts": 7,
        "unacknowledged_alerts": 5,
        "active_keywords": 8,
        "execution_logs_count": 21,
        "activity_count": 34,
    }
    assert len(fake_db.query_args) == 7
    assert len(pending_threats_query.filter_args) == 1
    assert len(unacknowledged_alerts_query.filter_args) == 1
    assert len(active_keywords_query.filter_args) == 1


def test_dashboard_summary_coerces_empty_counts_to_zero():
    fake_db = FakeDb([FakeQuery(count_result=None) for _ in range(7)])

    result = get_dashboard_summary(db=fake_db, current_user=object())

    assert result == {
        "total_threats": 0,
        "pending_threats": 0,
        "total_alerts": 0,
        "unacknowledged_alerts": 0,
        "active_keywords": 0,
        "execution_logs_count": 0,
        "activity_count": 0,
    }


def test_dashboard_summary_response_schema_validates_endpoint_shape():
    response = DashboardSummaryResponse.model_validate(
        {
            "total_threats": 12,
            "pending_threats": 3,
            "total_alerts": 7,
            "unacknowledged_alerts": 5,
            "active_keywords": 8,
            "execution_logs_count": 21,
            "activity_count": 34,
        }
    )

    assert response.pending_threats == 3
    assert response.unacknowledged_alerts == 5
