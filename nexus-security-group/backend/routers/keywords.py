from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from auth import require_permission
from database import get_db
from models import KeywordMonitor
from schemas.auth import TokenData
from schemas.keyword import KeywordCreate, KeywordResponse, KeywordUpdate


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
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_permission("keywords", "write")),
):
    keyword = KeywordMonitor(**request.model_dump(exclude_unset=True))

    db.add(keyword)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Keyword already exists",
        )
    db.refresh(keyword)

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

    for field, value in request.model_dump(exclude_unset=True).items():
        setattr(keyword, field, value)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Keyword already exists",
        )
    db.refresh(keyword)

    return keyword


@router.delete("/{keyword_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_keyword(
    keyword_id: int,
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
    db.commit()
