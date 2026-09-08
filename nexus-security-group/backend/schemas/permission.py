"""Permission management schemas for the RBAC permission matrix."""
from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator


PermissionKey = Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=101)]
RoleName = Literal["admin", "analyst"]


class PermissionResponse(BaseModel):
    """Permission catalog entry exposed as a normalized resource/action key."""

    permission_id: int
    resource: str
    action: str
    permission: str
    description: str | None = None
    created_at: datetime
    updated_at: datetime


class PermissionMatrixResponse(BaseModel):
    """Permission catalog plus current role assignments."""

    permissions: list[PermissionResponse]
    role_permissions: dict[RoleName, list[str]]


class RolePermissionsUpdate(BaseModel):
    """Replace the permission set assigned to one role."""

    permissions: list[PermissionKey] = Field(default_factory=list)

    @field_validator("permissions")
    @classmethod
    def normalize_permission_keys(cls, permissions: list[str]) -> list[str]:
        normalized_permissions = []
        for permission in permissions:
            normalized_permission = permission.strip().lower()
            if normalized_permission.count(":") != 1:
                raise ValueError("Permissions must use resource:action format")
            resource, action = normalized_permission.split(":")
            if not resource or not action:
                raise ValueError("Permissions must use resource:action format")
            normalized_permissions.append(normalized_permission)
        return sorted(set(normalized_permissions))


class RolePermissionsResponse(BaseModel):
    """Current permission assignment for one role."""

    model_config = ConfigDict(from_attributes=True)

    role: RoleName
    permissions: list[str]
