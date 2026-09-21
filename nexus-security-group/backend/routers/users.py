import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from auth import hash_password, require_permission

logger = logging.getLogger("nsg.users")
from database import get_db
from models import SystemUser
from schemas.auth import TokenData
from schemas.user import UserCreate, UserResponse, UserUpdate
from services.activity_audit import record_user_activity


router = APIRouter(prefix="/api/users", tags=["users"])


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    request: UserCreate,
    http_request: Request = None,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_permission("users", "write")),
):
    user = SystemUser(
        username=request.username,
        password_hash=hash_password(request.password),
        role=request.role,
        is_active=request.is_active,
        created_by=current_user.username,
    )
    db.add(user)
    try:
        db.flush()
        record_user_activity(
            db,
            username=current_user.username or "unknown",
            user_role=getattr(current_user, "role", None),
            activity_type="create_user",
            activity_description=f"Created user {request.username}",
            request=http_request,
            activity_data={
                "target_user_id": user.user_id,
                "target_username": request.username,
                "target_role": request.role,
                "target_is_active": request.is_active,
            },
        )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")
    db.refresh(user)
    logger.info("User created: %s by %s", request.username, current_user.username)
    return user


@router.get("", response_model=list[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_permission("users", "read")),
):
    return db.query(SystemUser).order_by(SystemUser.username.asc()).all()


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    request: UserUpdate,
    http_request: Request = None,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_permission("users", "write")),
):
    user = db.query(SystemUser).filter(SystemUser.user_id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    update_data = request.model_dump(exclude_unset=True)
    changed_fields = sorted(update_data.keys())
    if "password" in update_data:
        user.password_hash = hash_password(update_data.pop("password"))
    if "role" in update_data:
        user.role = update_data["role"]
    if "is_active" in update_data:
        user.is_active = update_data["is_active"]
    record_user_activity(
        db,
        username=current_user.username or "unknown",
        user_role=getattr(current_user, "role", None),
        activity_type="update_user",
        activity_description=f"Updated user {user.username}",
        request=http_request,
        activity_data={
            "target_user_id": user_id,
            "target_username": user.username,
            "changed_fields": changed_fields,
        },
    )

    db.commit()
    db.refresh(user)
    logger.info("User updated: id=%s by %s", user_id, current_user.username)
    return user


@router.delete("/{user_id}", response_model=UserResponse)
def delete_user(
    user_id: int,
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_permission("users", "delete")),
):
    user = db.query(SystemUser).filter(SystemUser.user_id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if current_user.user_id is not None and current_user.user_id == user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot deactivate your own user")

    if not user.is_active:
        return user

    if user.role == "admin":
        active_admin_count = (
            db.query(SystemUser)
            .filter(SystemUser.role == "admin", SystemUser.is_active.is_(True))
            .count()
        )
        if active_admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cannot deactivate the last active admin user",
            )

    user.is_active = False
    record_user_activity(
        db,
        username=current_user.username or "unknown",
        user_role=getattr(current_user, "role", None),
        activity_type="deactivate_user",
        activity_description=f"Deactivated user {user.username}",
        request=request,
        activity_data={
            "target_user_id": user_id,
            "target_username": user.username,
            "target_role": user.role,
        },
    )
    db.commit()
    db.refresh(user)
    logger.info("User deactivated: id=%s by %s", user_id, current_user.username)
    return user
