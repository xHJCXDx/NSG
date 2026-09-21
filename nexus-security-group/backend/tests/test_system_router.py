from fastapi.routing import APIRoute
from fastapi.testclient import TestClient

from main import app
from routers.system import get_system_info
from schemas.system import SystemInfoResponse


def test_system_info_route_is_registered():
    from routers.system import router as system_router

    route_paths = {route.path for route in system_router.routes if isinstance(route, APIRoute)}
    route_methods = {
        route.path: route.methods
        for route in system_router.routes
        if isinstance(route, APIRoute)
    }

    assert "/api/system/info" in route_paths
    assert "GET" in route_methods["/api/system/info"]


def test_system_info_requires_no_auth():
    response = TestClient(app).get("/api/system/info")

    assert response.status_code == 200


def test_system_info_returns_expected_fields():
    response = TestClient(app).get("/api/system/info")
    data = response.json()

    assert data["name"] == "Nexus Security Group"
    assert data["version"] == "1.0.0"
    assert isinstance(data["stack"], list)
    assert len(data["stack"]) > 0


def test_system_info_response_schema_validates_shape():
    result = get_system_info()

    assert isinstance(result, SystemInfoResponse)
    assert isinstance(result.name, str)
    assert isinstance(result.version, str)
    assert isinstance(result.description, str)
    assert isinstance(result.stack, list)
    assert all(isinstance(item, str) for item in result.stack)


def test_system_info_stack_contains_expected_technologies():
    result = get_system_info()

    assert "FastAPI" in result.stack
    assert "PostgreSQL" in result.stack
