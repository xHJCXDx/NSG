from sqlalchemy import BigInteger, Boolean, CheckConstraint, Column, DateTime, String, func
from sqlalchemy.orm import foreign, relationship

from database import Base
from models.permission import Permission, RolePermission


class SystemUser(Base):
    """ORM model for authenticated backend users.

    This table is separate from user_activity, which remains audit-only data.
    Passwords are stored as one-way hashes in password_hash.
    """

    __tablename__ = "system_users"

    __table_args__ = (
        CheckConstraint("role IN ('admin', 'analyst')", name="check_system_users_role"),
    )

    user_id = Column(BigInteger, primary_key=True, autoincrement=True)
    username = Column(String(100), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, server_default="analyst")
    is_active = Column(Boolean, nullable=False, server_default="true", index=True)
    created_by = Column(String(100))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    permissions = relationship(
        "Permission",
        secondary=RolePermission.__table__,
        primaryjoin=role == foreign(RolePermission.role),
        secondaryjoin=foreign(RolePermission.permission_id) == Permission.permission_id,
        viewonly=True,
    )
