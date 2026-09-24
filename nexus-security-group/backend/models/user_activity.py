from sqlalchemy import (
    BigInteger,
    Column,
    DateTime,
    ForeignKey,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import INET, JSONB
from sqlalchemy.orm import relationship

from database import Base


class UserActivity(Base):
    """ORM model for the user_activity table.

    All three FK columns are nullable and use ON DELETE SET NULL, meaning
    a deleted mention/detection/alert will null out the reference rather
    than cascade-delete the activity record.

    All relationships use string targets to avoid circular import issues
    (UserActivity references SocialMention, ThreatDetection, and Alert).
    """

    __tablename__ = "user_activity"

    activity_id = Column(BigInteger, primary_key=True, autoincrement=True)

    username = Column(String(100), nullable=False)
    user_role = Column(String(50))

    activity_type = Column(String(50), nullable=False)
    activity_description = Column(Text)

    related_mention_id = Column(
        BigInteger,
        ForeignKey("social_mentions.mention_id", ondelete="SET NULL"),
    )
    related_detection_id = Column(
        BigInteger,
        ForeignKey("threat_detections.detection_id", ondelete="SET NULL"),
    )
    related_alert_id = Column(
        BigInteger,
        ForeignKey("alerts.alert_id", ondelete="SET NULL"),
    )

    ip_address = Column(INET)
    user_agent = Column(Text)
    session_id = Column(String(255))

    activity_timestamp = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    activity_data = Column(JSONB)

    # Relationships — string targets prevent circular imports
    mention = relationship("SocialMention", back_populates="user_activities")
    detection = relationship("ThreatDetection", back_populates="user_activities")
    alert = relationship("Alert", back_populates="user_activities")
