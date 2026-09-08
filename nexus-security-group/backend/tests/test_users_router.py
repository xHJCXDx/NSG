from datetime import datetime, timezone

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError

from auth import get_current_user, hash_password, require_permission
from database import get_db
from main import app
from routers.users import create_user, list_users, router, update_user
from schemas.auth import TokenData
from schemas.user import UserCreate, UserResponse, UserUpdate


class FakeQuery:
    def __init__(self, first_result=None, all_result=None):
        self.first_result = first_result
        self.all_result = all_result or []
        self.filter_args = []

    def filter(self, *args):
        self.filter_args.append(args)
        return self

    def first(self):
        return self.first_result

    def order_by(self, *args):
        return self

    def all(self):
        return self.all_result


class FakeDb:
    def __init__(self, first_result=None, all_result=None, commit_exception=None):
        self.query_obj = FakeQuery(first_result=first_result, all_result=all_result)
        self.query_args = []
        self.added = []
        self.committed = False
        self.rolled_back = False
        self.refreshed = []
        self.commit_exception = commit_exception

    def query(self, *args):
        self.query_args.append(args)
        return self.query_obj

    def add(self, obj):
        self.added.append(obj)

    def commit(self):
        if self.commit_exception is not None:
            raise self.commit_exception
        self.committed = True

    def rollback(self):
        self.rolled_back = True

    def refresh(self, obj):
        self.refreshed.append(obj)
        obj.user_id = 101
        obj.created_at = datetime(2026, 7, 10, tzinfo=timezone.utc)
        obj.updated_at = datetime(2026, 7, 10, tzinfo=timezone.utc)


def test_main_registers_api_users_post_route():
    paths = app.openapi()["paths"]

    assert "post" in paths["/api/users"]
    assert "get" in paths["/api/users"]
    assert "patch" in paths["/api/users/{user_id}"]


def test_user_routes_declare_response_models_and_admin_dependency():
    def route_for(path, method):
        return next(route for route in router.routes if route.path == path and method in route.methods)

    create_route = route_for("/api/users", "POST")
    list_route = route_for("/api/users", "GET")
    update_route = route_for("/api/users/{user_id}", "PATCH")

    assert create_route.response_model is UserResponse
    assert create_route.status_code == 201
    assert list_route.response_model == list[UserResponse]
    assert update_route.response_model is UserResponse
    assert any(
        getattr(dep.call, "required_permission", None) == "users:write"
        for dep in create_route.dependant.dependencies
    )
    assert any(
        getattr(dep.call, "required_permission", None) == "users:read"
        for dep in list_route.dependant.dependencies
    )
    assert any(
        getattr(dep.call, "required_permission", None) == "users:write"
        for dep in update_route.dependant.dependencies
    )


def test_user_router_has_no_physical_delete_route():
    assert all("DELETE" not in route.methods for route in router.routes)


def test_admin_creates_user_hashes_password_and_response_has_no_secret():
    fake_db = FakeDb(first_result=None)
    request = UserCreate(username="analyst1", password="plain-secret", role="analyst")
    admin = TokenData(username="root", role="admin", auth_source="bootstrap")

    result = create_user(request=request, db=fake_db, current_user=admin)
    response = UserResponse.model_validate(result)

    assert fake_db.added == [result]
    assert fake_db.committed is True
    assert fake_db.refreshed == [result]
    assert result.username == "analyst1"
    assert result.created_by == "root"
    assert result.password_hash != "plain-secret"
    assert hash_password("plain-secret") != "plain-secret"
    assert response.user_id == 101
    assert "password_hash" not in response.model_dump()


def test_user_without_users_write_cannot_create_users():
    authz_app = FastAPI()
    authz_app.include_router(router)
    authz_app.dependency_overrides[get_db] = lambda: object()
    authz_app.dependency_overrides[get_current_user] = lambda: TokenData(
        username="analyst1",
        role="analyst",
        auth_source="database",
        permissions=["dashboard:read"],
    )

    response = TestClient(authz_app).post(
        "/api/users",
        json={"username": "test", "password": "secret123"},
    )

    assert response.status_code == 403
    assert "users:write" in response.json()["detail"]


def test_duplicate_username_returns_409_and_does_not_commit():
    fake_db = FakeDb(first_result=object())
    request = UserCreate(username="analyst1", password="secret123")
    admin = TokenData(username="root", role="admin", auth_source="bootstrap")

    with pytest.raises(HTTPException) as exc_info:
        create_user(request=request, db=fake_db, current_user=admin)

    assert exc_info.value.status_code == 409
    assert fake_db.added == []
    assert fake_db.committed is False


def test_create_user_rolls_back_integrity_error_and_returns_409():
    fake_db = FakeDb(
        first_result=None,
        commit_exception=IntegrityError("duplicate", params=None, orig=None),
    )
    request = UserCreate(username="analyst1", password="secret123")
    admin = TokenData(username="root", role="admin", auth_source="bootstrap")

    with pytest.raises(HTTPException) as exc_info:
        create_user(request=request, db=fake_db, current_user=admin)

    assert exc_info.value.status_code == 409
    assert fake_db.rolled_back is True


def test_admin_lists_users():
    now = datetime(2026, 7, 10, tzinfo=timezone.utc)
    users = [
        type("User", (), {
            "user_id": 1,
            "username": "analyst1",
            "role": "analyst",
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        })()
    ]
    fake_db = FakeDb(all_result=users)
    admin = TokenData(username="root", role="admin", auth_source="bootstrap")

    assert list_users(db=fake_db, current_user=admin) == users


def test_admin_patches_user_role_active_and_password():
    now = datetime(2026, 7, 10, tzinfo=timezone.utc)
    user = type("User", (), {
        "user_id": 1,
        "username": "analyst1",
        "password_hash": hash_password("old-password"),
        "role": "analyst",
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    })()
    fake_db = FakeDb(first_result=user)
    admin = TokenData(username="root", role="admin", auth_source="bootstrap")

    result = update_user(
        user_id=1,
        request=UserUpdate(password="new-password", role="admin", is_active=False),
        db=fake_db,
        current_user=admin,
    )

    assert result is user
    assert user.role == "admin"
    assert user.is_active is False
    assert user.password_hash != "new-password"
    assert fake_db.committed is True
    assert fake_db.refreshed == [user]


def test_patch_missing_user_returns_404():
    fake_db = FakeDb(first_result=None)
    admin = TokenData(username="root", role="admin", auth_source="bootstrap")

    with pytest.raises(HTTPException) as exc_info:
        update_user(user_id=999, request=UserUpdate(role="admin"), db=fake_db, current_user=admin)

    assert exc_info.value.status_code == 404


def test_user_routes_reject_invalid_create_and_empty_patch_payloads():
    validation_app = FastAPI()
    validation_app.include_router(router)
    validation_app.dependency_overrides[get_current_user] = lambda: TokenData(
        username="root",
        role="admin",
        auth_source="bootstrap",
        permissions=["users:read", "users:write"],
    )
    client = TestClient(validation_app)

    response = client.post(
        "/api/users",
        json={"username": "   ", "password": "secret123", "role": "analyst"},
    )

    assert response.status_code == 422
    assert response.json()["detail"]

    empty_patch = client.patch("/api/users/1", json={})

    assert empty_patch.status_code == 422
    assert empty_patch.json()["detail"]


def test_users_routes_reject_missing_bearer_token():
    client = TestClient(app)

    for method, path in [("GET", "/api/users"), ("POST", "/api/users"), ("PATCH", "/api/users/1")]:
        response = client.request(method, path, json={"username": "x", "password": "x"} if method != "GET" else None)
        assert response.status_code == 401, f"{method} {path} should reject without token"
        assert response.json()["detail"] == "Not authenticated"


def test_users_read_allows_user_with_users_read_permission():
    now = datetime(2026, 7, 10, tzinfo=timezone.utc)
    users_list = [
        type("User", (), {
            "user_id": 1, "username": "analyst1", "role": "analyst",
            "is_active": True, "created_at": now, "updated_at": now,
        })()
    ]
    fake_db = FakeDb(all_result=users_list)

    authz_app = FastAPI()
    authz_app.include_router(router)
    authz_app.dependency_overrides[get_db] = lambda: fake_db
    authz_app.dependency_overrides[get_current_user] = lambda: TokenData(
        username="admin1",
        role="admin",
        auth_source="database",
        permissions=["users:read"],
    )

    response = TestClient(authz_app).get("/api/users")
    assert response.status_code == 200
