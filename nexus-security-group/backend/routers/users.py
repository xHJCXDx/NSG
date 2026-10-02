import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from auth import get_current_user, hash_password, require_permission, verify_password

logger = logging.getLogger("nsg.users")
from database import get_db
from models import Role, SystemUser
from schemas.auth import TokenData
from schemas.user import ChangePasswordRequest, UserCreate, UserResponse, UserUpdate
from services.activity_audit import record_user_activity


router = APIRouter(prefix="/api/users", tags=["users"])


def _resolve_role(db: Session, role_name: str) -> Role:
    """Look up a role by name; raise 400 if not found."""
    role = db.query(Role).filter(Role.name == role_name).first()
    if role is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown role: {role_name}",
        )
    return role


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    request: UserCreate,
    http_request: Request = None,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_permission("users", "write")),
):
    role = _resolve_role(db, request.role)
    normalized_username = request.username.strip().lower()
    user = SystemUser(
        username=normalized_username,
        password_hash=hash_password(request.password),
        role_id=role.role_id,
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


@router.patch("/me/password", status_code=status.HTTP_204_NO_CONTENT)
def change_own_password(
    request: ChangePasswordRequest,
    http_request: Request = None,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    user = db.query(SystemUser).filter(SystemUser.user_id == current_user.user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if not verify_password(request.current_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Current password is incorrect")

    user.password_hash = hash_password(request.new_password)
    record_user_activity(
        db,
        username=current_user.username or "unknown",
        user_role=getattr(current_user, "role", None),
        activity_type="change_own_password",
        activity_description="Changed own password",
        request=http_request,
        activity_data={"user_id": current_user.user_id},
    )
    db.commit()
    logger.info("Password changed: user_id=%s", current_user.user_id)


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
        role = _resolve_role(db, update_data["role"])
        user.role_id = role.role_id
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
            .join(Role, SystemUser.role_id == Role.role_id)
            .filter(Role.name == "admin", SystemUser.is_active.is_(True))
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


@router.patch("/{user_id}/reactivate", response_model=UserResponse)
def reactivate_user(
    user_id: int,
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_permission("users", "write")),
):
    user = db.query(SystemUser).filter(SystemUser.user_id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.is_active:
        return user

    user.is_active = True
    record_user_activity(
        db,
        username=current_user.username or "unknown",
        user_role=getattr(current_user, "role", None),
        activity_type="reactivate_user",
        activity_description=f"Reactivated user {user.username}",
        request=request,
        activity_data={
            "target_user_id": user_id,
            "target_username": user.username,
            "target_role": user.role,
        },
    )
    db.commit()
    db.refresh(user)
    logger.info("User reactivated: id=%s by %s", user_id, current_user.username)
    return user


@router.delete("/{user_id}/permanent", status_code=status.HTTP_204_NO_CONTENT)
def permanently_delete_user(
    user_id: int,
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_permission("users", "delete")),
):
    user = db.query(SystemUser).filter(SystemUser.user_id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if current_user.user_id is not None and current_user.user_id == user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot delete your own user")

    if user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must be deactivated before permanent deletion",
        )

    if user.role == "admin":
        admin_count = (
            db.query(SystemUser)
            .join(Role, SystemUser.role_id == Role.role_id)
            .filter(Role.name == "admin")
            .count()
        )
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cannot delete the last admin user",
            )

    username = user.username
    record_user_activity(
        db,
        username=current_user.username or "unknown",
        user_role=getattr(current_user, "role", None),
        activity_type="delete_user_permanent",
        activity_description=f"Permanently deleted user {username}",
        request=request,
        activity_data={
            "target_user_id": user_id,
            "target_username": username,
            "target_role": user.role,
        },
    )
    db.delete(user)
    db.commit()
    logger.info("User permanently deleted: id=%s by %s", user_id, current_user.username)
