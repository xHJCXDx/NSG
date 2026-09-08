"""Tests for schemas.mention — MentionListItem and MentionDetail."""
import pytest
from datetime import datetime, timezone
from unittest.mock import MagicMock
from pydantic import ValidationError


NOW = datetime(2026, 6, 24, 12, 0, 0, tzinfo=timezone.utc)


def _base_mention_fields():
    return {
        "mention_id": 1,
        "platform": "twitter",
        "external_id": "ext-001",
        "text_content": "Some tweet",
        "created_at": NOW,
        "collected_at": NOW,
        "processing_status": "pending",
    }


def test_mention_list_item_importable():
    from schemas.mention import MentionListItem
    assert MentionListItem is not None


def test_mention_detail_importable():
    from schemas.mention import MentionDetail
    assert MentionDetail is not None


def test_mention_list_item_happy_path():
    from schemas.mention import MentionListItem
    item = MentionListItem(**_base_mention_fields())
    assert item.mention_id == 1
    assert item.platform == "twitter"
    assert item.processing_status == "pending"


def test_mention_list_item_invalid_platform():
    from schemas.mention import MentionListItem
    fields = _base_mention_fields()
    fields["platform"] = "facebook"
    with pytest.raises(ValidationError):
        MentionListItem(**fields)


def test_mention_list_item_invalid_processing_status():
    from schemas.mention import MentionListItem
    fields = _base_mention_fields()
    fields["processing_status"] = "unknown"
    with pytest.raises(ValidationError):
        MentionListItem(**fields)


def test_mention_detail_nullable_fields_accept_none():
    from schemas.mention import MentionDetail
    fields = _base_mention_fields()
    fields.update({
        "language": None,
        "author_username": None,
        "author_id": None,
        "author_verified": None,
        "author_followers_count": None,
        "author_description": None,
        "likes_count": None,
        "shares_count": None,
        "replies_count": None,
        "views_count": None,
        "urls": None,
        "hashtags": None,
        "mentions": None,
        "has_media": None,
        "media_types": None,
        "geo_location": None,
        "is_reply": None,
        "is_quote": None,
        "reply_to_id": None,
        "conversation_id": None,
        "raw_data": None,
        "processing_error": None,
        "last_updated": None,
    })
    detail = MentionDetail(**fields)
    assert detail.language is None
    assert detail.last_updated is None


def test_mention_list_item_orm_mode():
    from schemas.mention import MentionListItem
    mock_orm = MagicMock()
    mock_orm.mention_id = 42
    mock_orm.platform = "reddit"
    mock_orm.external_id = "ext-42"
    mock_orm.text_content = "Reddit post"
    mock_orm.created_at = NOW
    mock_orm.collected_at = NOW
    mock_orm.processing_status = "processed"
    mock_orm.last_updated = NOW

    result = MentionListItem.model_validate(mock_orm)
    assert result.mention_id == 42
    assert result.platform == "reddit"
