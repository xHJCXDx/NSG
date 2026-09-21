import logging
from typing import Any

from fastapi import Request
from sqlalchemy.orm import Session

from models import UserActivity

logger = logging.getLogger("nsg.activity_audit")


def record_user_activity(
    db: Session,
    *,
    username: str,
    user_role: str | None,
    activity_type: str,
    activity_description: str | None = None,
    related_mention_id: int | None = None,
    related_detection_id: int | None = None,
    related_alert_id: int | None = None,
    session_id: str | None = None,
    request: Request | None = None,
    activity_data: dict[str, Any] | None = None,
) -> None:
    """Best-effort activity audit insert.

    The helper only stages a UserActivity row on the provided session. It does
    not commit, so the caller keeps ownership of the primary transaction.
    """
    try:
        activity = UserActivity(
            username=username,
            user_role=user_role,
            activity_type=activity_type,
            activity_description=activity_description,
            related_mention_id=related_mention_id,
            related_detection_id=related_detection_id,
            related_alert_id=related_alert_id,
            ip_address=_get_client_host(request),
            user_agent=_get_user_agent(request),
            session_id=session_id,
            activity_data=activity_data,
        )
        db.add(activity)
    except Exception:
        logger.warning(
            "Failed to record user activity: username=%s activity_type=%s",
            username,
            activity_type,
            exc_info=True,
        )


def _get_client_host(request: Request | None) -> str | None:
    if request is None or request.client is None:
        return None
    return request.client.host


def _get_user_agent(request: Request | None) -> str | None:
    if request is None:
        return None
    return request.headers.get("user-agent")
