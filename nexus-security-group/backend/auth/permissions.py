from fastapi import Depends, HTTPException, status

from schemas.auth import TokenData
from sqlalchemy.exc import SQLAlchemyError

from models import SystemUser

ADMIN_PERMISSION_CLAIMS = [
    "alerts:read",
    "alerts:write",
    "dashboard:read",
    "keywords:delete",
    "keywords:read",
    "keywords:write",
    "logs:read",
    "mentions:read",
    "metrics:read",
    "permissions:read",
    "permissions:write",
    "threats:read",
    "threats:write",
    "users:delete",
    "users:read",
    "users:write",
    "workflows:execute",
    "workflows:read",
]


def _normalize_permission(resource: str, action: str) -> str:
    return f"{resource.strip().lower()}:{action.strip().lower()}"


def _serialize_permissions(permissions) -> list[str]:
    serialized_permissions = set()
    try:
        permission_items = iter(permissions or [])
    except TypeError:
        return []

    for permission in permission_items:
        resource = getattr(permission, "resource", None)
        action = getattr(permission, "action", None)
        if not isinstance(resource, str) or not isinstance(action, str):
            continue
        normalized_permission = _normalize_permission(resource, action)
        if normalized_permission != ":":
            serialized_permissions.add(normalized_permission)
    return sorted(serialized_permissions)


def _permissions_from_user(db_user: SystemUser) -> list[str]:
    try:
        return _serialize_permissions(getattr(db_user, "permissions", []))
    except SQLAlchemyError:
        return []


def _permissions_from_payload(payload: dict) -> list[str]:
    permissions = payload.get("permissions")
    if not isinstance(permissions, list):
        return []
    return [permission for permission in permissions if isinstance(permission, str)]


def require_permission(resource: str, action: str):
    from .tokens import get_current_user

    required_permission = _normalize_permission(resource, action)

    def permission_dependency(current_user: TokenData = Depends(get_current_user)):
        if required_permission not in current_user.permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission required: {required_permission}",
            )
        return current_user

    permission_dependency.required_permission = required_permission
    return permission_dependency
