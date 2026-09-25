"""Role management schemas for dynamic RBAC roles."""
import re
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


ROLE_NAME_PATTERN = re.compile(r"^[a-z][a-z0-9_]{1,49}$")


class RoleCreate(BaseModel):
    """Request payload for creating a new role."""

    name: str = Field(min_length=2, max_length=50)
    description: Optional[str] = None

    @field_validator("name")
    @classmethod
    def validate_role_name(cls, name: str) -> str:
        normalized = name.strip().lower()
        if not ROLE_NAME_PATTERN.match(normalized):
            raise ValueError(
                "Role name must be 2-50 characters, start with a letter, "
                "and contain only lowercase letters, digits, or underscores"
            )
        return normalized


class RoleUpdate(BaseModel):
    """Mutable fields for an existing role."""

    name: Optional[str] = Field(default=None, min_length=2, max_length=50)
    description: Optional[str] = None

    @field_validator("name")
    @classmethod
    def validate_role_name(cls, name: str | None) -> str | None:
        if name is None:
            return None
        normalized = name.strip().lower()
        if not ROLE_NAME_PATTERN.match(normalized):
            raise ValueError(
                "Role name must be 2-50 characters, start with a letter, "
                "and contain only lowercase letters, digits, or underscores"
            )
        return normalized


class RoleResponse(BaseModel):
    """Public role representation with resolved permission keys."""

    model_config = ConfigDict(from_attributes=True)

    role_id: int
    name: str
    description: Optional[str] = None
    is_system: bool
    created_at: datetime
    permissions: list[str] = Field(default_factory=list)
