import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from auth import require_permission

logger = logging.getLogger("nsg.keywords")
from database import get_db
from models import KeywordMonitor
from schemas.auth import TokenData
from schemas.keyword import KeywordCreate, KeywordResponse, KeywordUpdate
from services.activity_audit import record_user_activity


router = APIRouter(prefix="/api/keywords", tags=["keywords"])


@router.get("", response_model=list[KeywordResponse])
def get_keywords(
    active_only: Annotated[bool, Query()] = False,
    limit: Annotated[int, Query(ge=1, le=200)] = 100,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_permission("keywords", "read")),
):
    query = db.query(KeywordMonitor)
    if active_only:
        query = query.filter(KeywordMonitor.is_active.is_(True))

    return query.order_by(KeywordMonitor.keyword_id.asc()).limit(limit).all()


@router.post(
    "",
    response_model=KeywordResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_keyword(
    request: KeywordCreate,
    http_request: Request = None,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_permission("keywords", "write")),
):
    keyword = KeywordMonitor(**request.model_dump(exclude_unset=True))

    db.add(keyword)
    try:
        db.flush()
        record_user_activity(
            db,
            username=current_user.username or "unknown",
            user_role=getattr(current_user, "role", None),
            activity_type="create_keyword",
            activity_description="Created keyword monitor",
            request=http_request,
            activity_data={"keyword_id": keyword.keyword_id},
        )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Keyword already exists",
        )
    db.refresh(keyword)
    logger.info("Keyword created: id=%s by %s", keyword.keyword_id, current_user.username)

    return keyword


@router.get("/{keyword_id}", response_model=KeywordResponse)
def get_keyword(
    keyword_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_permission("keywords", "read")),
):
    keyword = (
        db.query(KeywordMonitor)
        .filter(KeywordMonitor.keyword_id == keyword_id)
        .first()
    )
    if keyword is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Keyword not found",
        )

    return keyword


@router.patch("/{keyword_id}", response_model=KeywordResponse)
def update_keyword(
    keyword_id: int,
    request: KeywordUpdate,
    http_request: Request = None,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_permission("keywords", "write")),
):
    keyword = (
        db.query(KeywordMonitor)
        .filter(KeywordMonitor.keyword_id == keyword_id)
        .first()
    )
    if keyword is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Keyword not found",
        )

    update_data = request.model_dump(exclude_unset=True)
    changed_fields = sorted(update_data.keys())
    for field, value in update_data.items():
        setattr(keyword, field, value)

    try:
        db.flush()
        record_user_activity(
            db,
            username=current_user.username or "unknown",
            user_role=getattr(current_user, "role", None),
            activity_type="update_keyword",
            activity_description=f"Updated keyword #{keyword_id}",
            request=http_request,
            activity_data={"keyword_id": keyword_id, "changed_fields": changed_fields},
        )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Keyword already exists",
        )
    db.refresh(keyword)
    logger.info("Keyword updated: id=%s by %s", keyword_id, current_user.username)

    return keyword


@router.delete("/{keyword_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_keyword(
    keyword_id: int,
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_permission("keywords", "delete")),
):
    keyword = (
        db.query(KeywordMonitor)
        .filter(KeywordMonitor.keyword_id == keyword_id)
        .first()
    )
    if keyword is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Keyword not found",
        )

    db.delete(keyword)
    record_user_activity(
        db,
        username=current_user.username or "unknown",
        user_role=getattr(current_user, "role", None),
        activity_type="delete_keyword",
        activity_description=f"Deleted keyword #{keyword_id}",
        request=request,
        activity_data={"keyword_id": keyword_id},
    )
    db.commit()
    logger.info("Keyword deleted: id=%s by %s", keyword_id, current_user.username)
