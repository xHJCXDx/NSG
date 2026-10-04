from sqlalchemy import BigInteger, Boolean, Column, DateTime, String, Text, func
from sqlalchemy.orm import relationship

from database import Base


class Role(Base):
    """Named role that groups permissions for RBAC assignment."""

    __tablename__ = "roles"

    role_id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(Text)
    is_system = Column(Boolean, nullable=False, server_default="false")
    is_active = Column(Boolean, nullable=False, server_default="true")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    role_permissions = relationship("RolePermission", back_populates="role_rel", cascade="all, delete-orphan")
    users = relationship("SystemUser", back_populates="role_rel")
