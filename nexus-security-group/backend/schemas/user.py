"""User schemas for administrator-managed system users."""
from datetime import datetime
from typing import Annotated, Literal, Optional

from pydantic import BaseModel, ConfigDict, StringConstraints, model_validator


UserRole = Literal["admin", "analyst"]
Username = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
Password = Annotated[str, StringConstraints(min_length=8, max_length=255)]


class UserCreate(BaseModel):
    """Request payload for admin-created users."""

    username: Username
    password: Password
    role: UserRole = "analyst"
    is_active: bool = True


class UserUpdate(BaseModel):
    """Mutable admin-managed user fields."""

    password: Optional[Password] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None

    @model_validator(mode="after")
    def require_at_least_one_field(self):
        if self.password is None and self.role is None and self.is_active is None:
            raise ValueError("At least one user field must be provided")
        return self


class UserResponse(BaseModel):
    """Public user response; intentionally excludes password_hash."""

    model_config = ConfigDict(from_attributes=True)

    user_id: int
    username: str
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: datetime
