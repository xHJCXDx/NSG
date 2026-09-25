import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from auth import require_permission

logger = logging.getLogger("nsg.permissions")
from database import get_db
from models import Permission, Role, RolePermission
from schemas.auth import TokenData
from schemas.permission import PermissionMatrixResponse, RolePermissionsResponse, RolePermissionsUpdate


router = APIRouter(prefix="/api/permissions", tags=["permissions"])


def _permission_key(permission: Permission) -> str:
    return f"{permission.resource}:{permission.action}"


def _permission_response(permission: Permission) -> dict:
    return {
        "permission_id": permission.permission_id,
        "resource": permission.resource,
        "action": permission.action,
        "permission": _permission_key(permission),
        "description": permission.description,
        "created_at": permission.created_at,
        "updated_at": permission.updated_at,
    }


@router.get("", response_model=PermissionMatrixResponse)
def list_permissions(
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_permission("permissions", "read")),
):
    permissions = db.query(Permission).order_by(Permission.resource.asc(), Permission.action.asc()).all()
    role_permissions = db.query(RolePermission).all()
    roles = db.query(Role).order_by(Role.name.asc()).all()

    permissions_by_id = {permission.permission_id: permission for permission in permissions}
    matrix: dict[str, list[str]] = {role.name: [] for role in roles}
    for role_permission in role_permissions:
        permission = permissions_by_id.get(role_permission.permission_id)
        role = next((r for r in roles if r.role_id == role_permission.role_id), None)
        if permission is not None and role is not None:
            matrix[role.name].append(_permission_key(permission))

    return {
        "permissions": [_permission_response(permission) for permission in permissions],
        "role_permissions": {role_name: sorted(set(assigned)) for role_name, assigned in matrix.items()},
    }


@router.put("/roles/{role_id}", response_model=RolePermissionsResponse)
def update_role_permissions(
    role_id: int,
    request: RolePermissionsUpdate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_permission("permissions", "write")),
):
    role = db.query(Role).filter(Role.role_id == role_id).first()
    if role is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")

    permissions = db.query(Permission).all()
    permissions_by_key = {_permission_key(permission): permission for permission in permissions}

    unknown_permissions = sorted(set(request.permissions) - set(permissions_by_key))
    if unknown_permissions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown permissions: {', '.join(unknown_permissions)}",
        )
    if role.name == "admin" and "permissions:write" not in request.permissions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="admin role must keep permissions:write",
        )

    db.query(RolePermission).filter(RolePermission.role_id == role_id).delete()
    for permission_key in request.permissions:
        db.add(RolePermission(role_id=role_id, permission_id=permissions_by_key[permission_key].permission_id))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Permission assignment conflict; changes were not saved",
        )

    logger.info("Permissions updated: role=%s by %s", role.name, current_user.username)
    return {"role": role.name, "permissions": request.permissions}
