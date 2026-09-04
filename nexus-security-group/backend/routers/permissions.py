from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth import require_permission
from database import get_db
from models import Permission, RolePermission
from schemas.auth import TokenData
from schemas.permission import PermissionMatrixResponse, RoleName, RolePermissionsResponse, RolePermissionsUpdate


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

    permissions_by_id = {permission.permission_id: permission for permission in permissions}
    matrix = {"admin": [], "analyst": []}
    for role_permission in role_permissions:
        permission = permissions_by_id.get(role_permission.permission_id)
        if permission is not None and role_permission.role in matrix:
            matrix[role_permission.role].append(_permission_key(permission))

    return {
        "permissions": [_permission_response(permission) for permission in permissions],
        "role_permissions": {role: sorted(set(assigned_permissions)) for role, assigned_permissions in matrix.items()},
    }


@router.put("/roles/{role}", response_model=RolePermissionsResponse)
def update_role_permissions(
    role: RoleName,
    request: RolePermissionsUpdate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_permission("permissions", "write")),
):
    permissions = db.query(Permission).all()
    permissions_by_key = {_permission_key(permission): permission for permission in permissions}

    unknown_permissions = sorted(set(request.permissions) - set(permissions_by_key))
    if unknown_permissions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown permissions: {', '.join(unknown_permissions)}",
        )
    if role == "admin" and "permissions:write" not in request.permissions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="admin role must keep permissions:write",
        )

    db.query(RolePermission).filter(RolePermission.role == role).delete()
    for permission_key in request.permissions:
        db.add(RolePermission(role=role, permission_id=permissions_by_key[permission_key].permission_id))
    db.commit()

    return {"role": role, "permissions": request.permissions}
