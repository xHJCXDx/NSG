"""Tests for schemas.activity — UserActivityResponse."""
import pytest
from datetime import datetime, timezone
from unittest.mock import MagicMock


NOW = datetime(2026, 6, 24, 12, 0, 0, tzinfo=timezone.utc)


def _base_activity_fields():
    return {
        "activity_id": 1,
        "username": "admin",
        "activity_type": "review_threat",
        "activity_timestamp": NOW,
    }


def test_user_activity_response_importable():
    from schemas.activity import UserActivityResponse
    assert UserActivityResponse is not None


def test_user_activity_response_happy_path():
    from schemas.activity import UserActivityResponse
    resp = UserActivityResponse(**_base_activity_fields())
    assert resp.activity_id == 1
    assert resp.username == "admin"
    assert resp.activity_type == "review_threat"


def test_user_activity_response_strips_bounded_string_fields():
    from schemas.activity import UserActivityResponse
    fields = _base_activity_fields()
    fields.update({
        "username": " analyst ",
        "user_role": " security ",
        "activity_type": " review_threat ",
        "activity_description": " Reviewed detection ",
        "user_agent": " Mozilla/5.0 ",
        "session_id": " sess-001 ",
    })

    resp = UserActivityResponse(**fields)

    assert resp.username == "analyst"
    assert resp.user_role == "security"
    assert resp.activity_type == "review_threat"
    assert resp.activity_description == "Reviewed detection"
    assert resp.user_agent == "Mozilla/5.0"
    assert resp.session_id == "sess-001"


@pytest.mark.parametrize("field", ["username", "activity_type"])
def test_user_activity_response_rejects_required_blank_strings(field):
    from pydantic import ValidationError
    from schemas.activity import UserActivityResponse
    fields = _base_activity_fields()
    fields[field] = "   "

    with pytest.raises(ValidationError):
        UserActivityResponse(**fields)


def test_user_activity_response_nullable_fk_fields():
    """All three FK fields are nullable (ON DELETE SET NULL)."""
    from schemas.activity import UserActivityResponse
    fields = _base_activity_fields()
    fields.update({
        "user_role": None,
        "activity_description": None,
        "related_mention_id": None,
        "related_detection_id": None,
        "related_alert_id": None,
        "ip_address": None,
        "user_agent": None,
        "session_id": None,
        "activity_data": None,
    })
    resp = UserActivityResponse(**fields)
    assert resp.related_mention_id is None
    assert resp.related_detection_id is None
    assert resp.related_alert_id is None


def test_user_activity_response_with_fk_values():
    """FK fields accept integer values."""
    from schemas.activity import UserActivityResponse
    fields = _base_activity_fields()
    fields.update({
        "related_mention_id": 10,
        "related_detection_id": 20,
        "related_alert_id": 30,
    })
    resp = UserActivityResponse(**fields)
    assert resp.related_mention_id == 10
    assert resp.related_detection_id == 20
    assert resp.related_alert_id == 30


def test_user_activity_response_orm_mode():
    from schemas.activity import UserActivityResponse
    mock_orm = MagicMock()
    mock_orm.activity_id = 99
    mock_orm.username = "operator"
    mock_orm.user_role = "analyst"
    mock_orm.activity_type = "acknowledge_alert"
    mock_orm.activity_description = "Alert acknowledged after review"
    mock_orm.related_mention_id = None
    mock_orm.related_detection_id = 5
    mock_orm.related_alert_id = 7
    mock_orm.ip_address = "192.168.1.1"
    mock_orm.user_agent = "Mozilla/5.0"
    mock_orm.session_id = "sess-abc123"
    mock_orm.activity_timestamp = NOW
    mock_orm.activity_data = {"action": "ack"}

    result = UserActivityResponse.model_validate(mock_orm)
    assert result.activity_id == 99
    assert result.username == "operator"
    assert result.related_mention_id is None
    assert result.related_detection_id == 5
