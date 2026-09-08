"""Tests for schemas.keyword — KeywordResponse, KeywordCreate, KeywordUpdate."""
import pytest
from datetime import datetime, timezone
from unittest.mock import MagicMock
from pydantic import ValidationError


NOW = datetime(2026, 6, 24, 12, 0, 0, tzinfo=timezone.utc)


def _base_keyword_fields():
    return {
        "keyword_id": 1,
        "keyword_text": "ransomware",
        "is_active": True,
        "is_regex": False,
        "case_sensitive": False,
        "trigger_immediate_alert": False,
        "min_matches_for_alert": 1,
        "match_count": 5,
        "false_positive_count": 0,
        "true_positive_count": 4,
        "added_at": NOW,
    }


def test_keyword_response_importable():
    from schemas.keyword import KeywordResponse
    assert KeywordResponse is not None


def test_keyword_create_importable():
    from schemas.keyword import KeywordCreate
    assert KeywordCreate is not None


def test_keyword_update_importable():
    from schemas.keyword import KeywordUpdate
    assert KeywordUpdate is not None


def test_keyword_response_happy_path():
    from schemas.keyword import KeywordResponse
    resp = KeywordResponse(**_base_keyword_fields())
    assert resp.keyword_id == 1
    assert resp.keyword_text == "ransomware"
    assert resp.match_count == 5


def test_keyword_create_has_no_pk():
    """KeywordCreate must NOT have keyword_id field (R4-S1)."""
    from schemas.keyword import KeywordCreate
    create = KeywordCreate(keyword_text="exploit")
    assert not hasattr(create, "keyword_id") or not hasattr(
        KeywordCreate.model_fields, "keyword_id"
    )
    # More direct: keyword_id should not be in model_fields
    assert "keyword_id" not in KeywordCreate.model_fields


def test_keyword_create_no_trigger_columns():
    """KeywordCreate must not include match_count, last_match_at, etc."""
    from schemas.keyword import KeywordCreate
    assert "match_count" not in KeywordCreate.model_fields
    assert "last_match_at" not in KeywordCreate.model_fields
    assert "false_positive_count" not in KeywordCreate.model_fields
    assert "true_positive_count" not in KeywordCreate.model_fields


def test_keyword_create_happy_path():
    from schemas.keyword import KeywordCreate
    create = KeywordCreate(
        keyword_text="exploit",
        keyword_type="threat",
        is_active=True,
        is_regex=False,
        case_sensitive=True,
    )
    assert create.keyword_text == "exploit"
    assert create.case_sensitive is True


def test_keyword_create_trims_keyword_text_and_rejects_blank():
    from schemas.keyword import KeywordCreate

    create = KeywordCreate(keyword_text="  exploit  ")

    assert create.keyword_text == "exploit"
    with pytest.raises(ValidationError):
        KeywordCreate(keyword_text="   ")


def test_keyword_create_validates_weight_and_min_matches_ranges():
    from schemas.keyword import KeywordCreate

    with pytest.raises(ValidationError):
        KeywordCreate(keyword_text="exploit", keyword_weight=0)
    with pytest.raises(ValidationError):
        KeywordCreate(keyword_text="exploit", keyword_weight=101)
    with pytest.raises(ValidationError):
        KeywordCreate(keyword_text="exploit", min_matches_for_alert=0)


def test_keyword_update_all_none():
    """KeywordUpdate() with no args must succeed and all fields be None (R4-S2)."""
    from schemas.keyword import KeywordUpdate
    update = KeywordUpdate()
    for field_name in KeywordUpdate.model_fields:
        assert getattr(update, field_name) is None, f"Field {field_name} should be None"


def test_keyword_update_partial():
    from schemas.keyword import KeywordUpdate
    update = KeywordUpdate(is_active=False)
    assert update.is_active is False
    assert update.keyword_text is None


def test_keyword_update_trims_and_validates_mutable_fields():
    from schemas.keyword import KeywordUpdate

    update = KeywordUpdate(keyword_text="  malware  ", added_by=" analyst ")

    assert update.keyword_text == "malware"
    assert update.added_by == "analyst"
    with pytest.raises(ValidationError):
        KeywordUpdate(keyword_text="")
    with pytest.raises(ValidationError):
        KeywordUpdate(keyword_weight=101)


def test_keyword_response_trigger_cols_present():
    """Trigger-maintained columns must be in KeywordResponse."""
    from schemas.keyword import KeywordResponse
    assert "match_count" in KeywordResponse.model_fields
    assert "false_positive_count" in KeywordResponse.model_fields
    assert "true_positive_count" in KeywordResponse.model_fields


def test_keyword_response_orm_mode():
    from schemas.keyword import KeywordResponse
    mock_orm = MagicMock()
    mock_orm.keyword_id = 10
    mock_orm.keyword_text = "malware"
    mock_orm.keyword_type = None
    mock_orm.keyword_category = None
    mock_orm.keyword_weight = 10
    mock_orm.is_active = True
    mock_orm.is_regex = False
    mock_orm.case_sensitive = False
    mock_orm.added_by = None
    mock_orm.added_at = NOW
    mock_orm.last_match_at = None
    mock_orm.match_count = 3
    mock_orm.false_positive_count = 0
    mock_orm.true_positive_count = 3
    mock_orm.trigger_immediate_alert = False
    mock_orm.min_matches_for_alert = 1
    mock_orm.description = None

    result = KeywordResponse.model_validate(mock_orm)
    assert result.keyword_id == 10
    assert result.match_count == 3
