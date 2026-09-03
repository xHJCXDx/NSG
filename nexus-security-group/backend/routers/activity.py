from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import UserActivity
from schemas.auth import TokenData
from schemas.activity import UserActivityResponse


router = APIRouter(prefix="/api/activity", tags=["activity"])


@router.get("", response_model=list[UserActivityResponse])
def get_activities(
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    username: Annotated[str | None, Query(min_length=1, max_length=100)] = None,
    activity_type: Annotated[str | None, Query(min_length=1, max_length=50)] = None,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    query = db.query(UserActivity)

    if username is not None:
        query = query.filter(UserActivity.username == username)
    if activity_type is not None:
        query = query.filter(UserActivity.activity_type == activity_type)

    return query.order_by(UserActivity.activity_timestamp.desc()).limit(limit).all()


@router.get("/{activity_id}", response_model=UserActivityResponse)
def get_activity(
    activity_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
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

    return activity
