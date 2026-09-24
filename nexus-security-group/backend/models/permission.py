from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship

from database import Base


class Permission(Base):
    """Catalog entry for a normalized resource/action permission."""

    __tablename__ = "permissions"

    __table_args__ = (
        UniqueConstraint("resource", "action", name="unique_permission_resource_action"),
    )

    permission_id = Column(BigInteger, primary_key=True, autoincrement=True)
    resource = Column(String(50), nullable=False)
    action = Column(String(50), nullable=False)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    role_permissions = relationship("RolePermission", back_populates="permission")


class RolePermission(Base):
    """Pivot table mapping existing role names to permission catalog entries."""

    __tablename__ = "role_permissions"

    __table_args__ = (
        CheckConstraint("role IN ('admin', 'analyst')", name="check_role_permissions_role"),
    )

    role = Column(String(20), primary_key=True)
    permission_id = Column(
        BigInteger,
        ForeignKey("permissions.permission_id", ondelete="CASCADE"),
        primary_key=True,
    )
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    permission = relationship("Permission", back_populates="role_permissions")
