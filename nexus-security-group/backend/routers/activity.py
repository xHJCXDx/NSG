from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from auth import require_permission
from database import get_db
from models import UserActivity
from schemas.auth import TokenData
from schemas.activity import UserActivityResponse


router = APIRouter(prefix="/api/activity", tags=["activity"])

# Network, session and additional data of the activity are readable only by
# the administration role (Tabla A2); other roles get them as null.
_ADMIN_ONLY_FIELDS = dict.fromkeys(("ip_address", "user_agent", "session_id", "activity_data"))


def _visible_activity(activity, current_user: TokenData):
    if getattr(current_user, "is_admin", False):
        return activity
    # Build a response copy: never modify the ORM row, which belongs to the session.
    return UserActivityResponse.model_validate(activity).model_copy(update=_ADMIN_ONLY_FIELDS)


@router.get("", response_model=list[UserActivityResponse])
def get_activities(
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    username: Annotated[str | None, Query(min_length=1, max_length=100)] = None,
    activity_type: Annotated[str | None, Query(min_length=1, max_length=50)] = None,
    db: Session = Depends(get_db),
    # Activity shares the logs:read permission — no separate activity:read needed
    current_user: TokenData = Depends(require_permission("logs", "read")),
):
    query = db.query(UserActivity)

    if username is not None:
        query = query.filter(UserActivity.username == username)
    if activity_type is not None:
        query = query.filter(UserActivity.activity_type == activity_type)

    activities = query.order_by(UserActivity.activity_timestamp.desc()).limit(limit).all()
    return [_visible_activity(activity, current_user) for activity in activities]


@router.get("/{activity_id}", response_model=UserActivityResponse)
def get_activity(
    activity_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_permission("logs", "read")),
):
    activity = (
        db.query(UserActivity)
        .filter(UserActivity.activity_id == activity_id)
        .first()
    )
    if activity is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User activity not found",
        )

    return _visible_activity(activity, current_user)
