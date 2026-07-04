"""User activity schemas — UserActivityResponse.

Maps to the user_activity ORM model. All three FK columns
(related_mention_id, related_detection_id, related_alert_id) are
nullable with ON DELETE SET NULL — always typed as Optional[int].
ip_address (INET) is typed as str. activity_data (JSONB) is dict | None.
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class UserActivityResponse(BaseModel):
    """Read-only audit log entry for user actions."""

    model_config = ConfigDict(from_attributes=True)

    activity_id: int
    username: str
    user_role: Optional[str] = None

    activity_type: str
    activity_description: Optional[str] = None

    # Nullable FKs — set to NULL when referenced entity is deleted
    related_mention_id: Optional[int] = None
    related_detection_id: Optional[int] = None
    related_alert_id: Optional[int] = None

    # INET → str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    session_id: Optional[str] = None

    activity_timestamp: datetime
    # JSONB → dict | None
    activity_data: Optional[dict] = None
