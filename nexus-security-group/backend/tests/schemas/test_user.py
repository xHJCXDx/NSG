"""Tests for schemas.user — admin-managed system users."""
from datetime import datetime, timezone

import pytest
from pydantic import ValidationError


def test_user_create_defaults_to_active_analyst():
    from schemas.user import UserCreate

    payload = UserCreate(username="analyst1", password="secret123")

    assert payload.username == "analyst1"
    assert payload.role == "analyst"
    assert payload.is_active is True


def test_user_create_rejects_invalid_role():
    from schemas.user import UserCreate

    with pytest.raises(ValidationError):
        UserCreate(username="user", password="secret123", role="owner")


def test_user_create_rejects_short_password():
    from schemas.user import UserCreate

    with pytest.raises(ValidationError):
        UserCreate(username="user", password="short")


def test_user_create_strips_username_and_rejects_blank_username():
    from schemas.user import UserCreate

    assert UserCreate(username="  analyst1  ", password="secret123").username == "analyst1"

    with pytest.raises(ValidationError):
        UserCreate(username="   ", password="secret123")


def test_user_update_allows_partial_fields_and_rejects_short_password():
    from schemas.user import UserUpdate

    assert UserUpdate(role="admin").role == "admin"
    assert UserUpdate(is_active=False).is_active is False
    with pytest.raises(ValidationError):
        UserUpdate(password="short")


def test_user_update_rejects_empty_payload():
    from schemas.user import UserUpdate

    with pytest.raises(ValidationError):
        UserUpdate()


def test_user_response_excludes_password_hash():
    from schemas.user import UserResponse

    now = datetime(2026, 7, 10, tzinfo=timezone.utc)

    response = UserResponse(
        user_id=1,
        username="analyst1",
        role="analyst",
        is_active=True,
        created_at=now,
        updated_at=now,
    )

    assert "password_hash" not in response.model_dump()
