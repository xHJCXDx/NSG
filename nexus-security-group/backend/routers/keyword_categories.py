import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from auth import require_permission
from database import get_db
from models import KeywordCategoryModel
from schemas.auth import TokenData
from schemas.keyword_category import KeywordCategoryCreate, KeywordCategoryResponse
from services.activity_audit import record_user_activity

logger = logging.getLogger("nsg.keyword_categories")

router = APIRouter(prefix="/api/keyword-categories", tags=["keyword-categories"])


@router.get("", response_model=list[KeywordCategoryResponse])
def list_categories(
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_permission("keywords", "read")),
):
    return (
        db.query(KeywordCategoryModel)
        .order_by(KeywordCategoryModel.name.asc())
        .all()
    )


@router.post(
    "",
    response_model=KeywordCategoryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_category(
    request: KeywordCategoryCreate,
    http_request: Request = None,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_permission("keywords", "write")),
):
    category = KeywordCategoryModel(**request.model_dump(exclude_unset=True))
    db.add(category)
    try:
        db.flush()
        record_user_activity(
            db,
            username=current_user.username or "unknown",
            user_role=getattr(current_user, "role", None),
            activity_type="create_keyword_category",
            activity_description=f"Created keyword category '{category.name}'",
            request=http_request,
            activity_data={"category_id": category.category_id},
        )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Category already exists",
        )
    db.refresh(category)
    logger.info("Category created: id=%s by %s", category.category_id, current_user.username)
    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: int,
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_permission("keywords", "delete")),
):
    category = (
        db.query(KeywordCategoryModel)
        .filter(KeywordCategoryModel.category_id == category_id)
        .first()
    )
    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    db.delete(category)
    record_user_activity(
        db,
        username=current_user.username or "unknown",
        user_role=getattr(current_user, "role", None),
        activity_type="delete_keyword_category",
        activity_description=f"Deleted keyword category '{category.name}'",
        request=request,
        activity_data={"category_id": category_id},
    )
    db.commit()
    logger.info("Category deleted: id=%s by %s", category_id, current_user.username)
