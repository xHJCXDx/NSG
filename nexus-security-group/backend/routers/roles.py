import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from auth import require_permission
from database import get_db
from models import Role, RolePermission, SystemUser
from schemas.auth import TokenData
from schemas.role import RoleCreate, RoleResponse, RoleUpdate

logger = logging.getLogger("nsg.roles")

router = APIRouter(prefix="/api/roles", tags=["roles"])


def _permission_key(permission) -> str:
    return f"{permission.resource}:{permission.action}"


def _role_to_response(role: Role) -> dict:
    return {
        "role_id": role.role_id,
        "name": role.name,
        "description": role.description,
        "is_system": role.is_system,
        "is_active": role.is_active,
        "created_at": role.created_at,
        "permissions": sorted(
            _permission_key(rp.permission)
            for rp in role.role_permissions
            if rp.permission is not None
        ),
    }


@router.get("", response_model=list[RoleResponse])
def list_roles(
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_permission("permissions", "read")),
):
    roles = db.query(Role).order_by(Role.name.asc()).all()
    return [_role_to_response(role) for role in roles]


@router.post("", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
def create_role(
    request: RoleCreate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_permission("permissions", "write")),
):
    role = Role(name=request.name, description=request.description)
    db.add(role)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Role '{request.name}' already exists",
        )
    db.refresh(role)
    logger.info("Role created: %s by %s", request.name, current_user.username)
    return _role_to_response(role)


@router.patch("/{role_id}", response_model=RoleResponse)
def update_role(
    role_id: int,
    request: RoleUpdate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_permission("permissions", "write")),
):
    role = db.query(Role).filter(Role.role_id == role_id).first()
    if role is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")

    if role.is_system:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="System roles cannot be renamed",
        )

    update_data = request.model_dump(exclude_unset=True)
    if "name" in update_data:
        role.name = update_data["name"]
    if "description" in update_data:
        role.description = update_data["description"]

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Role '{request.name}' already exists",
        )
    db.refresh(role)
    logger.info("Role updated: id=%s by %s", role_id, current_user.username)
    return _role_to_response(role)


@router.delete("/{role_id}", response_model=RoleResponse)
def delete_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_permission("permissions", "write")),
):
    role = db.query(Role).filter(Role.role_id == role_id).first()
    if role is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")

    if role.is_system:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="System roles cannot be deactivated",
        )

    if not role.is_active:
        return _role_to_response(role)

    role.is_active = False
    db.commit()
    db.refresh(role)
    logger.info("Role deactivated: %s by %s", role.name, current_user.username)
    return _role_to_response(role)


@router.patch("/{role_id}/reactivate", response_model=RoleResponse)
def reactivate_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_permission("permissions", "write")),
):
    role = db.query(Role).filter(Role.role_id == role_id).first()
    if role is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")

    if role.is_active:
        return _role_to_response(role)

    role.is_active = True
    db.commit()
    db.refresh(role)
    logger.info("Role reactivated: %s by %s", role.name, current_user.username)
    return _role_to_response(role)


@router.delete("/{role_id}/permanent", status_code=status.HTTP_204_NO_CONTENT)
def permanently_delete_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_permission("permissions", "write")),
):
    role = db.query(Role).filter(Role.role_id == role_id).first()
    if role is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")

    if role.is_system:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="System roles cannot be deleted",
        )

    if role.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be deactivated before permanent deletion",
        )

    assigned_users = db.query(SystemUser).filter(SystemUser.role_id == role_id).count()
    if assigned_users > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot delete role with {assigned_users} assigned user(s)",
        )

    db.delete(role)
    db.commit()
    logger.info("Role permanently deleted: %s by %s", role.name, current_user.username)
