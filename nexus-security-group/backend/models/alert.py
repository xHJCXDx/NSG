from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import relationship

from database import Base


class Alert(Base):
    """ORM model for the alerts table.

    NOTE: last_updated is maintained server-side by the
    update_alerts_last_updated trigger. Call db.refresh(obj)
    after any UPDATE to see the new value.

    alert_uuid is generated server-side via uuid_generate_v4().
    Requires the uuid-ossp extension to be installed in the database.
    """

    __tablename__ = "alerts"

    alert_id = Column(BigInteger, primary_key=True, autoincrement=True)
    detection_id = Column(
        BigInteger,
        ForeignKey("threat_detections.detection_id", ondelete="CASCADE"),
        nullable=False,
    )
    alert_uuid = Column(
        UUID(as_uuid=True),
        unique=True,
        server_default=text("uuid_generate_v4()"),
    )

    alert_title = Column(String(255), nullable=False)
    alert_message = Column(Text, nullable=False)
    alert_severity = Column(String(20), nullable=False)

    channels_sent = Column(ARRAY(String(50)))
    slack_channel = Column(String(100))

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    sent_at = Column(DateTime(timezone=True))
    delivery_status = Column(String(20), server_default="pending")

    acknowledged = Column(Boolean, server_default="false")
    acknowledged_by = Column(String(100))
    acknowledged_at = Column(DateTime(timezone=True))

    last_updated = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships — string targets prevent circular imports
    detection = relationship("ThreatDetection", back_populates="alert")
    user_activities = relationship("UserActivity", back_populates="alert")

    __table_args__ = (
        CheckConstraint(
            "alert_severity IN ('info', 'warning', 'high', 'critical')",
            name="alerts_alert_severity_check",
        ),
        CheckConstraint(
            "delivery_status IN ('pending', 'sent', 'delivered', 'failed')",
            name="alerts_delivery_status_check",
        ),
    )
