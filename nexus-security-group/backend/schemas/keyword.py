"""Keyword schemas — KeywordResponse, KeywordCreate, KeywordUpdate.

Maps to the keywords_monitor ORM model. match_count, last_match_at,
false_positive_count, and true_positive_count are trigger-maintained
and included only in KeywordResponse.
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class KeywordResponse(BaseModel):
    """Full keyword monitor record including trigger-maintained counters."""

    model_config = ConfigDict(from_attributes=True)

    keyword_id: int
    keyword_text: str
    keyword_type: Optional[str] = None
    keyword_category: Optional[str] = None
    keyword_weight: Optional[int] = None

    is_active: bool
    is_regex: bool
    case_sensitive: bool

    added_by: Optional[str] = None
    added_at: Optional[datetime] = None

    # Trigger-maintained counters
    last_match_at: Optional[datetime] = None
    match_count: Optional[int] = None
    false_positive_count: Optional[int] = None
    true_positive_count: Optional[int] = None

    trigger_immediate_alert: bool
    min_matches_for_alert: Optional[int] = None

    description: Optional[str] = None


class KeywordCreate(BaseModel):
    """Input schema for creating a new keyword monitor entry.

    Excludes: keyword_id (PK), trigger-maintained counters (match_count,
    last_match_at, false_positive_count, true_positive_count), and
    server-default timestamps (added_at).
    """

    keyword_text: str
    keyword_type: Optional[str] = None
    keyword_category: Optional[str] = None
    keyword_weight: Optional[int] = None

    is_active: Optional[bool] = None
    is_regex: Optional[bool] = None
    case_sensitive: Optional[bool] = None

    added_by: Optional[str] = None

    trigger_immediate_alert: Optional[bool] = None
    min_matches_for_alert: Optional[int] = None

    description: Optional[str] = None


class KeywordUpdate(BaseModel):
    """Partial update schema — all mutable fields are Optional.

    Excludes: keyword_id (PK), trigger-maintained counters, and
    server-default timestamps. All fields default to None to allow
    partial updates (PATCH semantics).
    """

    keyword_text: Optional[str] = None
    keyword_type: Optional[str] = None
    keyword_category: Optional[str] = None
    keyword_weight: Optional[int] = None

    is_active: Optional[bool] = None
    is_regex: Optional[bool] = None
    case_sensitive: Optional[bool] = None

    added_by: Optional[str] = None

    trigger_immediate_alert: Optional[bool] = None
    min_matches_for_alert: Optional[int] = None

    description: Optional[str] = None
