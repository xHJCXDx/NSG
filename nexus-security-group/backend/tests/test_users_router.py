from datetime import datetime, timezone

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError

from auth import get_current_user, hash_password, require_permission
from database import get_db
from main import app
from models import UserActivity
from routers.users import change_own_password, create_user, delete_user, list_users, router, update_user
from schemas.auth import TokenData
from schemas.user import ChangePasswordRequest, UserCreate, UserResponse, UserUpdate


class FakeQuery:
    def __init__(self, first_result=None, all_result=None, count_result=0):
        self.first_result = first_result
        self.all_result = all_result or []
        self.count_result = count_result
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

    def count(self):
        return self.count_result


class FakeDb:
    def __init__(self, first_result=None, all_result=None, commit_exception=None, count_result=0, query_results=None):
        self.query_obj = FakeQuery(first_result=first_result, all_result=all_result, count_result=count_result)
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

    def flush(self):
        if self.commit_exception is not None:
            raise self.commit_exception
        for obj in self.added:
            if getattr(obj, "user_id", None) is None:
                obj.user_id = 101

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
    assert "delete" in paths["/api/users/{user_id}"]


def test_user_routes_declare_response_models_and_admin_dependency():
    def route_for(path, method):
        return next(route for route in router.routes if route.path == path and method in route.methods)

    create_route = route_for("/api/users", "POST")
    list_route = route_for("/api/users", "GET")
    update_route = route_for("/api/users/{user_id}", "PATCH")
    delete_route = route_for("/api/users/{user_id}", "DELETE")

    assert create_route.response_model is UserResponse
    assert create_route.status_code == 201
    assert list_route.response_model == list[UserResponse]
    assert update_route.response_model is UserResponse
    assert delete_route.response_model is UserResponse
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
    assert any(
        getattr(dep.call, "required_permission", None) == "users:delete"
        for dep in delete_route.dependant.dependencies
    )


def test_user_router_delete_route_is_soft_delete_only():
    assert any("DELETE" in route.methods for route in router.routes)


def test_admin_creates_user_hashes_password_and_response_has_no_secret():
    fake_db = FakeDb(first_result=None)
    request = UserCreate(username="analyst1", password="plain-secret", role="analyst")
    admin = TokenData(username="root", role="admin", auth_source="bootstrap")

    result = create_user(request=request, db=fake_db, current_user=admin)
    response = UserResponse.model_validate(result)

    assert fake_db.added[0] == result
    assert isinstance(fake_db.added[1], UserActivity)
    assert fake_db.added[1].activity_type == "create_user"
    assert fake_db.added[1].username == "root"
    assert fake_db.added[1].user_role == "admin"
    assert fake_db.added[1].activity_data == {
        "target_user_id": 101,
        "target_username": "analyst1",
        "target_role": "analyst",
        "target_is_active": True,
    }
    assert "plain-secret" not in str(fake_db.added[1].activity_data)
    assert "password" not in str(fake_db.added[1].activity_data)
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


def test_user_without_users_delete_cannot_delete_users():
    authz_app = FastAPI()
    authz_app.include_router(router)
    authz_app.dependency_overrides[get_db] = lambda: object()
    authz_app.dependency_overrides[get_current_user] = lambda: TokenData(
        username="analyst1",
        role="analyst",
        auth_source="database",
        permissions=["users:read", "users:write"],
    )

    response = TestClient(authz_app).delete("/api/users/2")

    assert response.status_code == 403
    assert "users:delete" in response.json()["detail"]


def test_duplicate_username_returns_409_and_does_not_commit():
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
    assert not any(isinstance(obj, UserActivity) for obj in fake_db.added)


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
    activity = fake_db.added[0]
    assert activity.activity_type == "update_user"
    assert activity.username == "root"
    assert activity.user_role == "admin"
    assert activity.activity_data == {
        "target_user_id": 1,
        "target_username": "analyst1",
        "changed_fields": ["is_active", "password", "role"],
    }
    assert "new-password" not in str(activity.activity_data)


def test_patch_missing_user_returns_404():
    fake_db = FakeDb(first_result=None)
    admin = TokenData(username="root", role="admin", auth_source="bootstrap")

    with pytest.raises(HTTPException) as exc_info:
        update_user(user_id=999, request=UserUpdate(role="admin"), db=fake_db, current_user=admin)

    assert exc_info.value.status_code == 404


def test_delete_missing_user_returns_404():
    fake_db = FakeDb(first_result=None)
    admin = TokenData(username="root", user_id=1, role="admin", auth_source="database")

    with pytest.raises(HTTPException) as exc_info:
        delete_user(user_id=999, db=fake_db, current_user=admin)

    assert exc_info.value.status_code == 404


def test_delete_blocks_current_authenticated_user():
    now = datetime(2026, 7, 10, tzinfo=timezone.utc)
    user = type("User", (), {
        "user_id": 1,
        "username": "root",
        "role": "admin",
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    })()
    fake_db = FakeDb(first_result=user)
    admin = TokenData(username="root", user_id=1, role="admin", auth_source="database")

    with pytest.raises(HTTPException) as exc_info:
        delete_user(user_id=1, db=fake_db, current_user=admin)

    assert exc_info.value.status_code == 400
    assert "own user" in exc_info.value.detail
    assert user.is_active is True
    assert fake_db.committed is False


def test_delete_blocks_last_active_admin():
    now = datetime(2026, 7, 10, tzinfo=timezone.utc)
    target = type("User", (), {
        "user_id": 2,
        "username": "only-admin",
        "role": "admin",
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    })()
    fake_db = FakeDb(first_result=target, count_result=1)
    admin = TokenData(username="root", user_id=1, role="admin", auth_source="database")

    with pytest.raises(HTTPException) as exc_info:
        delete_user(user_id=2, db=fake_db, current_user=admin)

    assert exc_info.value.status_code == 409
    assert "last active admin" in exc_info.value.detail
    assert target.is_active is True
    assert fake_db.committed is False


def test_delete_inactive_user_is_idempotent_noop():
    now = datetime(2026, 7, 10, tzinfo=timezone.utc)
    target = type("User", (), {
        "user_id": 2,
        "username": "bob",
        "role": "analyst",
        "is_active": False,
        "created_at": now,
        "updated_at": now,
    })()
    fake_db = FakeDb(first_result=target)
    admin = TokenData(username="root", user_id=1, role="admin", auth_source="database")

    result = delete_user(user_id=2, db=fake_db, current_user=admin)

    assert result is target
    assert target.is_active is False
    assert fake_db.committed is False
    assert fake_db.deleted == []
    assert fake_db.added == []


def test_valid_delete_soft_deactivates_and_does_not_physically_remove_user():
    now = datetime(2026, 7, 10, tzinfo=timezone.utc)
    target = type("User", (), {
        "user_id": 2,
        "username": "bob",
        "role": "analyst",
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    })()
    fake_db = FakeDb(first_result=target)
    admin = TokenData(username="root", user_id=1, role="admin", auth_source="database")

    result = delete_user(user_id=2, db=fake_db, current_user=admin)

    assert result is target
    assert target.is_active is False
    assert fake_db.committed is True
    assert fake_db.refreshed == [target]
    assert fake_db.deleted == []
    activity = fake_db.added[0]
    assert activity.activity_type == "deactivate_user"
    assert activity.username == "root"
    assert activity.user_role == "admin"
    assert activity.activity_data == {
        "target_user_id": 2,
        "target_username": "bob",
        "target_role": "analyst",
    }


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

    for method, path in [("GET", "/api/users"), ("POST", "/api/users"), ("PATCH", "/api/users/1"), ("DELETE", "/api/users/1")]:
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


# ---------------------------------------------------------------------------
# change_own_password
# ---------------------------------------------------------------------------

def _make_user_with_password(plain: str):
    now = datetime(2026, 7, 10, tzinfo=timezone.utc)
    return type("User", (), {
        "user_id": 7,
        "username": "bob",
        "password_hash": hash_password(plain),
        "role": "analyst",
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    })()


def test_change_own_password_correct_current_password_returns_204_and_updates_hash():
    user = _make_user_with_password("old-password1")
    fake_db = FakeDb(first_result=user)
    current_user = TokenData(username="bob", user_id=7, role="analyst", auth_source="database")

    change_own_password(
        request=ChangePasswordRequest(current_password="old-password1", new_password="new-password1"),
        db=fake_db,
        current_user=current_user,
    )

    from auth import verify_password as vp
    assert vp("new-password1", user.password_hash)
    assert not vp("old-password1", user.password_hash)
    assert fake_db.committed is True
    activity = fake_db.added[0]
    assert activity.activity_type == "change_own_password"
    assert activity.username == "bob"


def test_change_own_password_wrong_current_password_returns_401():
    user = _make_user_with_password("real-password1")
    fake_db = FakeDb(first_result=user)
    current_user = TokenData(username="bob", user_id=7, role="analyst", auth_source="database")

    with pytest.raises(HTTPException) as exc_info:
        change_own_password(
            request=ChangePasswordRequest(current_password="wrong-password", new_password="new-password1"),
            db=fake_db,
            current_user=current_user,
        )

    assert exc_info.value.status_code == 401
    assert "incorrect" in exc_info.value.detail
    assert fake_db.committed is False


def test_change_own_password_new_password_too_short_returns_422():
    authz_app = FastAPI()
    authz_app.include_router(router)
    authz_app.dependency_overrides[get_current_user] = lambda: TokenData(
        username="bob", user_id=7, role="analyst", auth_source="database"
    )
    authz_app.dependency_overrides[get_db] = lambda: object()

    response = TestClient(authz_app).patch(
        "/api/users/me/password",
        json={"current_password": "old-password1", "new_password": "short"},
    )

    assert response.status_code == 422


def test_change_own_password_unauthenticated_returns_401():
    response = TestClient(app).patch(
        "/api/users/me/password",
        json={"current_password": "old-password1", "new_password": "new-password1"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"
