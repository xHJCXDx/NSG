from fastapi import FastAPI
from fastapi.routing import APIRoute
from fastapi.testclient import TestClient

from auth import get_current_user, require_admin_user, router as auth_router
from database import get_db
from main import app
from routers import activity, alerts, dashboard, keywords, logs, metrics, n8n, threats, users
from schemas.auth import TokenData


PUBLIC_ROUTE_EXCEPTIONS = {
    ("/api/auth/login", "POST"): "Credential exchange: intentionally public.",
    ("/api/health", "GET"): "Operational health probe: intentionally public.",
}

AUTHENTICATED_PRIVATE_ROUTES = {
    ("/api/activity", "GET"),
    ("/api/activity/{activity_id}", "GET"),
    ("/api/alerts", "GET"),
    ("/api/alerts/{alert_id}", "GET"),
    ("/api/alerts/{alert_id}/acknowledge", "PATCH"),
    ("/api/dashboard/summary", "GET"),
    ("/api/keywords", "GET"),
    ("/api/keywords", "POST"),
    ("/api/keywords/{keyword_id}", "GET"),
    ("/api/keywords/{keyword_id}", "PATCH"),
    ("/api/keywords/{keyword_id}", "DELETE"),
    ("/api/logs", "GET"),
    ("/api/logs/{log_id}", "GET"),
    ("/api/metrics/mentions", "GET"),
    ("/api/metrics/summary", "GET"),
    ("/api/n8n/webhook/{webhook_id}", "POST"),
    ("/api/threats", "GET"),
    ("/api/threats/{threat_id}", "GET"),
    ("/api/threats/{threat_id}/review", "PATCH"),
}

ADMIN_ONLY_ROUTES = {
    ("/api/users", "GET"),
    ("/api/users", "POST"),
    ("/api/users/{user_id}", "PATCH"),
}

ROUTERS_UNDER_AUTH_CONTRACT = (
    auth_router,
    activity.router,
    alerts.router,
    dashboard.router,
    keywords.router,
    logs.router,
    metrics.router,
    n8n.router,
    threats.router,
    users.router,
)


def _api_routes():
    for router in ROUTERS_UNDER_AUTH_CONTRACT:
        for route in router.routes:
            if isinstance(route, APIRoute) and route.path.startswith("/api"):
                for method in route.methods or set():
                    if method not in {"HEAD", "OPTIONS"}:
                        yield route, method

    for route in app.routes:
        if isinstance(route, APIRoute) and route.path.startswith("/api"):
            for method in route.methods or set():
                if method not in {"HEAD", "OPTIONS"}:
                    yield route, method


def _has_direct_dependency(route: APIRoute, dependency) -> bool:
    return any(dep.call is dependency for dep in route.dependant.dependencies)


def test_backend_api_routes_have_explicit_auth_contracts():
    expected_routes = (
        set(PUBLIC_ROUTE_EXCEPTIONS)
        | AUTHENTICATED_PRIVATE_ROUTES
        | ADMIN_ONLY_ROUTES
    )
    actual_routes = {(route.path, method) for route, method in _api_routes()}

    assert expected_routes - actual_routes == set()

    undocumented_routes = []
    missing_user_auth = []
    missing_admin_auth = []

    for route, method in _api_routes():
        contract_key = (route.path, method)

        if contract_key in PUBLIC_ROUTE_EXCEPTIONS:
            continue

        if contract_key in ADMIN_ONLY_ROUTES:
            if not _has_direct_dependency(route, require_admin_user):
                missing_admin_auth.append(f"{method} {route.path}")
            continue

        if contract_key in AUTHENTICATED_PRIVATE_ROUTES:
            if not _has_direct_dependency(route, get_current_user):
                missing_user_auth.append(f"{method} {route.path}")
            continue

        undocumented_routes.append(f"{method} {route.path}")

    assert undocumented_routes == []
    assert missing_user_auth == []
    assert missing_admin_auth == []


def test_public_health_route_remains_intentionally_public():
    response = TestClient(app).get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_private_routes_reject_missing_bearer_token_before_handler_logic():
    client = TestClient(app)

    representative_private_requests = [
        ("GET", "/api/metrics/summary", None),
        ("POST", "/api/n8n/webhook/test-id", {"trigger": "scan"}),
        ("GET", "/api/users", None),
    ]

    for method, path, json_body in representative_private_requests:
        response = client.request(method, path, json=json_body)

        assert response.status_code == 401
        assert response.json()["detail"] == "Not authenticated"


def test_admin_routes_reject_authenticated_non_admin_users():
    authz_app = FastAPI()
    authz_app.include_router(users.router)
    authz_app.dependency_overrides[get_db] = lambda: object()
    authz_app.dependency_overrides[get_current_user] = lambda: TokenData(
        username="analyst1",
        role="analyst",
        auth_source="database",
    )

    response = TestClient(authz_app).get("/api/users")

    assert response.status_code == 403
    assert response.json()["detail"] == "Admin privileges required"
