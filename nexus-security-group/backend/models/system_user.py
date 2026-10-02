from sqlalchemy import BigInteger, Boolean, Column, DateTime, ForeignKey, String, func
from sqlalchemy.orm import foreign, relationship

from database import Base
from models.permission import Permission, RolePermission


class SystemUser(Base):
    """ORM model for authenticated backend users.

    This table is separate from user_activity, which remains audit-only data.
    Passwords are stored as one-way hashes in password_hash.
    """

    __tablename__ = "system_users"

    user_id = Column(BigInteger, primary_key=True, autoincrement=True)
    username = Column(String(100), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    role_id = Column(BigInteger, ForeignKey("roles.role_id"), nullable=False)
    is_active = Column(Boolean, nullable=False, server_default="true", index=True)
    created_by = Column(String(100))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())  # Maintained by DB trigger update_system_users_updated_at

    role_rel = relationship("Role", back_populates="users")

    permissions = relationship(
        "Permission",
        secondary=RolePermission.__table__,
        primaryjoin=role_id == foreign(RolePermission.role_id),
        secondaryjoin=foreign(RolePermission.permission_id) == Permission.permission_id,
        viewonly=True,
    )

    @property
    def role(self) -> str | None:
        """Role name resolved from the roles FK — keeps API responses backward-compatible."""
        return self.role_rel.name if self.role_rel else None
