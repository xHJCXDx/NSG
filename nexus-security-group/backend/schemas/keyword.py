"""Keyword schemas — KeywordResponse, KeywordCreate, KeywordUpdate.

Maps to the keywords_monitor ORM model. match_count, last_match_at,
false_positive_count, and true_positive_count are trigger-maintained
and included only in KeywordResponse.
"""
from datetime import datetime
from typing import Annotated, Optional

from pydantic import BaseModel, ConfigDict, Field, StringConstraints


KeywordText = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=255),
]
KeywordType = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=50),
]
KeywordCategory = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=50),
]
KeywordAddedBy = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=100),
]
KeywordDescription = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1),
]


class KeywordResponse(BaseModel):
    """Full keyword monitor record including trigger-maintained counters."""

    model_config = ConfigDict(from_attributes=True)

    keyword_id: int
    keyword_text: KeywordText
    keyword_type: Optional[KeywordType] = None
    keyword_category: Optional[KeywordCategory] = None
    keyword_weight: Optional[int] = Field(default=None, ge=1, le=100)

    is_active: bool
    is_regex: bool
    case_sensitive: bool

    added_by: Optional[KeywordAddedBy] = None
    added_at: Optional[datetime] = None

    # Trigger-maintained counters
    last_match_at: Optional[datetime] = None
    match_count: Optional[int] = None
    false_positive_count: Optional[int] = None
    true_positive_count: Optional[int] = None

    trigger_immediate_alert: bool
    min_matches_for_alert: Optional[int] = Field(default=None, ge=1)

    description: Optional[KeywordDescription] = None


class KeywordCreate(BaseModel):
    """Input schema for creating a new keyword monitor entry.

    Excludes: keyword_id (PK), trigger-maintained counters (match_count,
    last_match_at, false_positive_count, true_positive_count), and
    server-default timestamps (added_at).
    """

    keyword_text: KeywordText
    keyword_type: Optional[KeywordType] = None
    keyword_category: Optional[KeywordCategory] = None
    keyword_weight: Optional[int] = Field(default=None, ge=1, le=100)

    is_active: Optional[bool] = None
    is_regex: Optional[bool] = None
    case_sensitive: Optional[bool] = None

    added_by: Optional[KeywordAddedBy] = None

    trigger_immediate_alert: Optional[bool] = None
    min_matches_for_alert: Optional[int] = Field(default=None, ge=1)

    description: Optional[KeywordDescription] = None


class KeywordUpdate(BaseModel):
    """Partial update schema — all mutable fields are Optional.

    Excludes: keyword_id (PK), trigger-maintained counters, and
    server-default timestamps. All fields default to None to allow
    partial updates (PATCH semantics).
    """

    keyword_text: Optional[KeywordText] = None
    keyword_type: Optional[KeywordType] = None
    keyword_category: Optional[KeywordCategory] = None
    keyword_weight: Optional[int] = Field(default=None, ge=1, le=100)

    is_active: Optional[bool] = None
    is_regex: Optional[bool] = None
    case_sensitive: Optional[bool] = None

    added_by: Optional[KeywordAddedBy] = None

    trigger_immediate_alert: Optional[bool] = None
    min_matches_for_alert: Optional[int] = Field(default=None, ge=1)

    description: Optional[KeywordDescription] = None
