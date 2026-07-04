from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Column,
    DateTime,
    Integer,
    String,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID

from database import Base


class ExecutionLog(Base):
    """ORM model for the execution_logs table.

    NOTE: duration_seconds is computed server-side by the
    trigger_calculate_duration trigger whenever completed_at is set.
    Call db.refresh(obj) after any UPDATE that sets completed_at.
    """

    __tablename__ = "execution_logs"

    log_id = Column(BigInteger, primary_key=True, autoincrement=True)
    execution_uuid = Column(
        UUID(as_uuid=True),
        unique=True,
        server_default=text("uuid_generate_v4()"),
    )

    workflow_name = Column(String(100), nullable=False)
    execution_id = Column(String(255))

    status = Column(String(20), nullable=False)

    mentions_collected = Column(Integer, server_default="0")
    mentions_processed = Column(Integer, server_default="0")
    detections_generated = Column(Integer, server_default="0")
    alerts_generated = Column(Integer, server_default="0")

    started_at = Column(DateTime(timezone=True), nullable=False)
    completed_at = Column(DateTime(timezone=True))
    duration_seconds = Column(Integer)

    last_updated = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "status IN ('success', 'partial_success', 'error', 'warning', 'timeout')",
            name="execution_logs_status_check",
        ),
    )
