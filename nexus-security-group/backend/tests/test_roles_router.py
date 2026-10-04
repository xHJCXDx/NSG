from datetime import datetime, timezone

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError

from auth import get_current_user
from database import get_db
from main import app
from models import Role, RolePermission, SystemUser
from routers.roles import create_role, delete_role, list_roles, router, update_role
from schemas.auth import TokenData
from schemas.role import RoleCreate, RoleResponse, RoleUpdate


now = datetime(2026, 9, 25, tzinfo=timezone.utc)


class FakeQuery:
    def __init__(self, all_result=None, first_result=None, count_result=0):
        self.all_result = all_result or []
        self.first_result = first_result
        self.count_result = count_result
        self.filter_args = []

    def order_by(self, *args):
        return self

    def filter(self, *args):
        self.filter_args.append(args)
        return self

    def first(self):
        return self.first_result

    def all(self):
        return self.all_result

    def count(self):
        return self.count_result


class FakeDb:
    def __init__(self, query_results=None, commit_exception=None):
        self.query_results = list(query_results or [])
        self.query_args = []
        self.added = []
        self.deleted = []
        self.committed = False
        self.rolled_back = False
        self.refreshed = []
        self.commit_exception = commit_exception

    def query(self, *args):
        self.query_args.append(args)
        if self.query_results:
            return self.query_results.pop(0)
        return FakeQuery()

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
        obj.role_id = getattr(obj, "role_id", None) or 10
        obj.created_at = now
        obj.updated_at = now


def _fake_role(role_id, name, is_system=False, role_permissions=None):
    return type("RoleRow", (), {
        "role_id": role_id,
        "name": name,
        "description": None,
        "is_system": is_system,
        "created_at": now,
        "updated_at": now,
        "role_permissions": role_permissions or [],
    })()


def _fake_role_permission(resource, action):
    permission = type("PermissionRow", (), {
        "resource": resource,
        "action": action,
    })()
    return type("RolePermissionRow", (), {"permission": permission})()


admin_user = TokenData(username="root", role="admin", permissions=["permissions:read", "permissions:write"])


def test_main_registers_api_roles_routes():
    paths = app.openapi()["paths"]

    assert "get" in paths["/api/roles"]
    assert "post" in paths["/api/roles"]
    assert "patch" in paths["/api/roles/{role_id}"]
    assert "delete" in paths["/api/roles/{role_id}"]


def test_roles_routes_declare_permission_dependencies():
    def route_for(path, method):
        return next(route for route in router.routes if route.path == path and method in route.methods)

    list_route = route_for("/api/roles", "GET")
    create_route = route_for("/api/roles", "POST")
    update_route = route_for("/api/roles/{role_id}", "PATCH")
    delete_route = route_for("/api/roles/{role_id}", "DELETE")

    assert any(getattr(dep.call, "required_permission", None) == "permissions:read" for dep in list_route.dependant.dependencies)
    assert any(getattr(dep.call, "required_permission", None) == "permissions:write" for dep in create_route.dependant.dependencies)
    assert any(getattr(dep.call, "required_permission", None) == "permissions:write" for dep in update_route.dependant.dependencies)
    assert any(getattr(dep.call, "required_permission", None) == "permissions:write" for dep in delete_route.dependant.dependencies)


def test_list_roles_returns_roles_with_permissions():
    rp = [_fake_role_permission("dashboard", "read")]
    roles = [
        _fake_role(1, "admin", is_system=True, role_permissions=rp),
        _fake_role(2, "analyst", is_system=True),
    ]
    fake_db = FakeDb(query_results=[FakeQuery(all_result=roles)])

    result = list_roles(db=fake_db, current_user=admin_user)

    assert len(result) == 2
    assert result[0]["name"] == "admin"
    assert result[0]["is_system"] is True
    assert result[0]["permissions"] == ["dashboard:read"]
    assert result[1]["name"] == "analyst"
    assert result[1]["permissions"] == []


def test_create_role_adds_and_commits():
    fake_db = FakeDb()
    request = RoleCreate(name="security_analyst", description="Security team role")

    result = create_role(request=request, db=fake_db, current_user=admin_user)

    assert len(fake_db.added) == 1
    assert fake_db.added[0].name == "security_analyst"
    assert fake_db.added[0].description == "Security team role"
    assert fake_db.committed is True
    assert fake_db.refreshed == [fake_db.added[0]]


def test_create_role_duplicate_name_returns_409():
    fake_db = FakeDb(commit_exception=IntegrityError("dup", params=None, orig=None))
    request = RoleCreate(name="admin")

    with pytest.raises(HTTPException) as exc_info:
        create_role(request=request, db=fake_db, current_user=admin_user)

    assert exc_info.value.status_code == 409
    assert "already exists" in exc_info.value.detail


def test_create_role_validates_name_format():
    with pytest.raises(Exception):
        RoleCreate(name="a")

    with pytest.raises(Exception):
        RoleCreate(name="has spaces")

    with pytest.raises(Exception):
        RoleCreate(name="123start")

    role = RoleCreate(name="Valid_Name_2")
    assert role.name == "valid_name_2"


def test_update_role_modifies_name_and_description():
    existing = _fake_role(5, "custom", is_system=False)
    fake_db = FakeDb(query_results=[FakeQuery(first_result=existing)])
    request = RoleUpdate(name="renamed", description="Updated desc")

    result = update_role(role_id=5, request=request, db=fake_db, current_user=admin_user)

    assert existing.name == "renamed"
    assert existing.description == "Updated desc"
    assert fake_db.committed is True


def test_update_system_role_rejected():
    existing = _fake_role(1, "admin", is_system=True)
    fake_db = FakeDb(query_results=[FakeQuery(first_result=existing)])

    with pytest.raises(HTTPException) as exc_info:
        update_role(
            role_id=1,
            request=RoleUpdate(name="superadmin"),
            db=fake_db,
            current_user=admin_user,
        )

    assert exc_info.value.status_code == 400
    assert "System roles" in exc_info.value.detail


def test_update_missing_role_returns_404():
    fake_db = FakeDb(query_results=[FakeQuery(first_result=None)])

    with pytest.raises(HTTPException) as exc_info:
        update_role(role_id=999, request=RoleUpdate(description="x"), db=fake_db, current_user=admin_user)

    assert exc_info.value.status_code == 404


def test_delete_role_removes_custom_role():
    existing = _fake_role(5, "custom", is_system=False)
    fake_db = FakeDb(query_results=[
        FakeQuery(first_result=existing),
        FakeQuery(count_result=0),
    ])

    delete_role(role_id=5, db=fake_db, current_user=admin_user)

    assert fake_db.deleted == [existing]
    assert fake_db.committed is True


def test_delete_system_role_rejected():
    existing = _fake_role(1, "admin", is_system=True)
    fake_db = FakeDb(query_results=[FakeQuery(first_result=existing)])

    with pytest.raises(HTTPException) as exc_info:
        delete_role(role_id=1, db=fake_db, current_user=admin_user)

    assert exc_info.value.status_code == 400
    assert "System roles" in exc_info.value.detail
    assert fake_db.committed is False


def test_delete_role_with_assigned_users_returns_409():
    existing = _fake_role(5, "custom", is_system=False)
    fake_db = FakeDb(query_results=[
        FakeQuery(first_result=existing),
        FakeQuery(count_result=3),
    ])

    with pytest.raises(HTTPException) as exc_info:
        delete_role(role_id=5, db=fake_db, current_user=admin_user)

    assert exc_info.value.status_code == 409
    assert "3 assigned user(s)" in exc_info.value.detail
    assert fake_db.committed is False


def test_delete_missing_role_returns_404():
    fake_db = FakeDb(query_results=[FakeQuery(first_result=None)])

    with pytest.raises(HTTPException) as exc_info:
        delete_role(role_id=999, db=fake_db, current_user=admin_user)

    assert exc_info.value.status_code == 404


def test_roles_routes_reject_missing_bearer_token():
    client = TestClient(app)

    assert client.get("/api/roles").status_code == 401
    assert client.post("/api/roles", json={"name": "test"}).status_code == 401
    assert client.patch("/api/roles/1", json={"name": "test"}).status_code == 401
    assert client.delete("/api/roles/1").status_code == 401


def test_roles_routes_reject_user_without_permission():
    authz_app = FastAPI()
    authz_app.include_router(router)
    authz_app.dependency_overrides[get_db] = lambda: object()
    authz_app.dependency_overrides[get_current_user] = lambda: TokenData(
        username="analyst1",
        role="analyst",
        auth_source="database",
        permissions=["dashboard:read"],
    )
    client = TestClient(authz_app)

    assert client.get("/api/roles").status_code == 403
    assert client.post("/api/roles", json={"name": "test_role"}).status_code == 403
    assert client.patch("/api/roles/1", json={"description": "x"}).status_code == 403
    assert client.delete("/api/roles/1").status_code == 403
