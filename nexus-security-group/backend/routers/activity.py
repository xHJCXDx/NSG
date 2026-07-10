from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import UserActivity
from schemas.activity import UserActivityResponse


router = APIRouter(prefix="/api/activity", tags=["activity"])


@router.get("", response_model=list[UserActivityResponse])
def get_activities(
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return (
        db.query(UserActivity)
        .order_by(UserActivity.activity_timestamp.desc())
        .limit(limit)
        .all()
    )


@router.get("/{activity_id}", response_model=UserActivityResponse)
def get_activity(
    activity_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    activity = (
        db.query(UserActivity)
        .filter(UserActivity.activity_id == activity_id)
        .first()
    )
    if activity is None:
        raise HTTPException(status_code=404, detail="User activity not found")

    return activity
