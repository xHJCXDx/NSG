from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.testclient import TestClient

from auth import get_current_user
from database import get_db
from main import app
from models import Permission, RolePermission
from routers.permissions import list_permissions, router, update_role_permissions
from schemas.auth import TokenData
from schemas.permission import PermissionMatrixResponse, RolePermissionsResponse, RolePermissionsUpdate


class FakeQuery:
    def __init__(self, all_result=None):
        self.all_result = all_result or []
        self.deleted = False
        self.filter_args = []

    def order_by(self, *args):
        return self

    def filter(self, *args):
        self.filter_args.append(args)
        return self

    def all(self):
        return self.all_result

    def delete(self):
        self.deleted = True
        return len(self.all_result)


class FakeDb:
    def __init__(self, permissions=None, role_permissions=None):
        self.permission_query = FakeQuery(permissions)
        self.role_permission_query = FakeQuery(role_permissions)
        self.added = []
        self.committed = False

    def query(self, model):
        if model is Permission:
            return self.permission_query
        if model is RolePermission:
            return self.role_permission_query
        raise AssertionError(f"Unexpected query model: {model}")

    def add(self, obj):
        self.added.append(obj)

    def commit(self):
        self.committed = True


def _permission(permission_id, resource, action, description=None):
    now = datetime(2026, 9, 3, tzinfo=timezone.utc)
    return type("PermissionRow", (), {
        "permission_id": permission_id,
        "resource": resource,
        "action": action,
        "description": description,
        "created_at": now,
        "updated_at": now,
    })()


def _role_permission(role, permission_id):
    return type("RolePermissionRow", (), {
        "role": role,
        "permission_id": permission_id,
    })()


def test_main_registers_api_permissions_routes():
    paths = app.openapi()["paths"]

    assert "get" in paths["/api/permissions"]
    assert "put" in paths["/api/permissions/roles/{role}"]


def test_permission_routes_declare_response_models_and_permission_dependencies():
    def route_for(path, method):
        return next(route for route in router.routes if route.path == path and method in route.methods)

    list_route = route_for("/api/permissions", "GET")
    update_route = route_for("/api/permissions/roles/{role}", "PUT")

    assert list_route.response_model is PermissionMatrixResponse
    assert update_route.response_model is RolePermissionsResponse
    assert any(
        getattr(dep.call, "required_permission", None) == "permissions:read"
        for dep in list_route.dependant.dependencies
    )
    assert any(
        getattr(dep.call, "required_permission", None) == "permissions:write"
        for dep in update_route.dependant.dependencies
    )


def test_list_permissions_returns_catalog_and_role_matrix():
    permissions = [
        _permission(1, "dashboard", "read", "Ver dashboard"),
        _permission(2, "permissions", "read", "Consultar permisos"),
    ]
    fake_db = FakeDb(
        permissions=permissions,
        role_permissions=[_role_permission("admin", 1), _role_permission("admin", 2), _role_permission("analyst", 1)],
    )
    current_user = TokenData(username="root", role="admin", permissions=["permissions:read"])

    result = list_permissions(db=fake_db, current_user=current_user)

    assert result["permissions"][0]["permission"] == "dashboard:read"
    assert result["role_permissions"] == {
        "admin": ["dashboard:read", "permissions:read"],
        "analyst": ["dashboard:read"],
    }


def test_update_role_permissions_replaces_role_assignment():
    permissions = [
        _permission(1, "dashboard", "read"),
        _permission(2, "permissions", "read"),
    ]
    fake_db = FakeDb(permissions=permissions)
    current_user = TokenData(username="root", role="admin", permissions=["permissions:write"])

    result = update_role_permissions(
        role="analyst",
        request=RolePermissionsUpdate(permissions=["permissions:read", "dashboard:read", "dashboard:read"]),
        db=fake_db,
        current_user=current_user,
    )

    assert result == {"role": "analyst", "permissions": ["dashboard:read", "permissions:read"]}
    assert fake_db.role_permission_query.deleted is True
    assert fake_db.committed is True
    assert [(assignment.role, assignment.permission_id) for assignment in fake_db.added] == [
        ("analyst", 1),
        ("analyst", 2),
    ]


def test_permissions_routes_reject_missing_bearer_token():
    client = TestClient(app)

    response = client.get("/api/permissions")
    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"

    response = client.put("/api/permissions/roles/analyst", json={"permissions": ["dashboard:read"]})
    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"


def test_authenticated_user_without_permissions_read_cannot_list_permissions():
    authz_app = FastAPI()
    authz_app.include_router(router)
    authz_app.dependency_overrides[get_db] = lambda: object()
    authz_app.dependency_overrides[get_current_user] = lambda: TokenData(
        username="analyst1",
        role="analyst",
        auth_source="database",
        permissions=["dashboard:read"],
    )

    response = TestClient(authz_app).get("/api/permissions")

    assert response.status_code == 403
    assert "permissions:read" in response.json()["detail"]


def test_authenticated_user_with_permissions_read_can_list_permissions():
    fake_db = FakeDb(
        permissions=[_permission(1, "permissions", "read")],
        role_permissions=[_role_permission("admin", 1)],
    )
    authz_app = FastAPI()
    authz_app.include_router(router)
    authz_app.dependency_overrides[get_db] = lambda: fake_db
    authz_app.dependency_overrides[get_current_user] = lambda: TokenData(
        username="admin1",
        role="admin",
        auth_source="database",
        permissions=["permissions:read"],
    )

    response = TestClient(authz_app).get("/api/permissions")

    assert response.status_code == 200
    assert response.json()["role_permissions"] == {"admin": ["permissions:read"], "analyst": []}


def test_authenticated_user_without_permissions_write_cannot_update_role_permissions():
    authz_app = FastAPI()
    authz_app.include_router(router)
    authz_app.dependency_overrides[get_db] = lambda: object()
    authz_app.dependency_overrides[get_current_user] = lambda: TokenData(
        username="analyst1",
        role="analyst",
        auth_source="database",
        permissions=["permissions:read"],
    )

    response = TestClient(authz_app).put(
        "/api/permissions/roles/analyst",
        json={"permissions": ["dashboard:read"]},
    )

    assert response.status_code == 403
    assert "permissions:write" in response.json()["detail"]


def test_authenticated_user_with_permissions_write_can_update_role_permissions():
    fake_db = FakeDb(permissions=[_permission(1, "dashboard", "read")])
    authz_app = FastAPI()
    authz_app.include_router(router)
    authz_app.dependency_overrides[get_db] = lambda: fake_db
    authz_app.dependency_overrides[get_current_user] = lambda: TokenData(
        username="admin1",
        role="admin",
        auth_source="database",
        permissions=["permissions:write"],
    )

    response = TestClient(authz_app).put(
        "/api/permissions/roles/analyst",
        json={"permissions": ["dashboard:read"]},
    )

    assert response.status_code == 200
    assert response.json() == {"role": "analyst", "permissions": ["dashboard:read"]}
    assert fake_db.committed is True


def test_update_role_permissions_rejects_unknown_permission_key():
    fake_db = FakeDb(permissions=[_permission(1, "dashboard", "read")])
    authz_app = FastAPI()
    authz_app.include_router(router)
    authz_app.dependency_overrides[get_db] = lambda: fake_db
    authz_app.dependency_overrides[get_current_user] = lambda: TokenData(
        username="admin1",
        role="admin",
        auth_source="database",
        permissions=["permissions:write"],
    )

    response = TestClient(authz_app).put(
        "/api/permissions/roles/analyst",
        json={"permissions": ["does:notexist"]},
    )

    assert response.status_code == 400
    assert "does:notexist" in response.json()["detail"]


def test_update_role_permissions_preserves_admin_write_permission():
    fake_db = FakeDb(permissions=[_permission(1, "dashboard", "read"), _permission(2, "permissions", "write")])
    authz_app = FastAPI()
    authz_app.include_router(router)
    authz_app.dependency_overrides[get_db] = lambda: fake_db
    authz_app.dependency_overrides[get_current_user] = lambda: TokenData(
        username="admin1",
        role="admin",
        auth_source="database",
        permissions=["permissions:write"],
    )

    response = TestClient(authz_app).put(
        "/api/permissions/roles/admin",
        json={"permissions": ["dashboard:read"]},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "admin role must keep permissions:write"
    assert fake_db.committed is False
