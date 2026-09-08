"""Mention schemas — MentionListItem and MentionDetail.

Maps to the social_mentions ORM model. last_updated is trigger-maintained
and included in Response schemas only.
"""
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict


_Platform = Literal[
    "twitter", "reddit", "telegram", "discord", "github", "exploit-db", "other"
]
_ProcessingStatus = Literal["pending", "processed", "failed"]


class MentionListItem(BaseModel):
    """Compact mention representation for list views."""

    model_config = ConfigDict(from_attributes=True)

    mention_id: int
    platform: _Platform
    external_id: str
    text_content: str
    created_at: datetime
    collected_at: datetime
    processing_status: _ProcessingStatus
    last_updated: Optional[datetime] = None


class MentionDetail(BaseModel):
    """Full mention representation including all nullable columns."""

    model_config = ConfigDict(from_attributes=True)

    mention_id: int
    platform: _Platform
    external_id: str
    text_content: str
    language: Optional[str] = None

    created_at: datetime
    collected_at: datetime

    author_username: Optional[str] = None
    author_id: Optional[str] = None
    author_verified: Optional[bool] = None
    author_followers_count: Optional[int] = None
    author_description: Optional[str] = None

    likes_count: Optional[int] = None
    shares_count: Optional[int] = None
    replies_count: Optional[int] = None
    views_count: Optional[int] = None

    urls: Optional[list[str]] = None
    hashtags: Optional[list[str]] = None
    mentions: Optional[list[str]] = None
    has_media: Optional[bool] = None
    media_types: Optional[list[str]] = None

    geo_location: Optional[dict] = None

    is_reply: Optional[bool] = None
    is_quote: Optional[bool] = None
    reply_to_id: Optional[str] = None
    conversation_id: Optional[str] = None

    raw_data: Optional[dict] = None

    processing_status: _ProcessingStatus
    processing_error: Optional[str] = None
    # Trigger-maintained — included only in Response, never in Create/Update
    last_updated: Optional[datetime] = None
