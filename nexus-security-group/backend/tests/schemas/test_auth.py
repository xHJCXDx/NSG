"""Tests for schemas.auth — Token and TokenData schemas."""
import pytest
from pydantic import ValidationError


def test_token_importable():
    from schemas.auth import Token
    assert Token is not None


def test_token_data_importable():
    from schemas.auth import TokenData
    assert TokenData is not None


def test_token_happy_path():
    from schemas.auth import Token
    token = Token(access_token="abc123", token_type="bearer")
    assert token.access_token == "abc123"
    assert token.token_type == "bearer"


def test_token_requires_access_token():
    from schemas.auth import Token
    with pytest.raises(ValidationError):
        Token(token_type="bearer")


def test_token_data_username_optional():
    from schemas.auth import TokenData
    td = TokenData()
    assert td.username is None


def test_token_data_with_username():
    from schemas.auth import TokenData
    td = TokenData(username="admin")
    assert td.username == "admin"
