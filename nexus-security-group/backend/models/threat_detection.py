from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import relationship

from database import Base


class ThreatDetection(Base):
    """ORM model for the threat_detections table.

    NOTE: last_updated is maintained server-side by the
    update_threat_detections_last_updated trigger. Call db.refresh(obj)
    after any UPDATE to see the new value.
    """

    __tablename__ = "threat_detections"

    detection_id = Column(BigInteger, primary_key=True, autoincrement=True)
    mention_id = Column(
        BigInteger,
        ForeignKey("social_mentions.mention_id", ondelete="CASCADE"),
        nullable=False,
    )
    sentiment_id = Column(
        BigInteger,
        ForeignKey("sentiment_analysis.sentiment_id", ondelete="SET NULL"),
    )

    threat_type = Column(String(100), nullable=False)
    threat_category = Column(String(50))
    criticality_level = Column(String(20), nullable=False)
    confidence_score = Column(Numeric(4, 3), nullable=False)
    risk_score = Column(Integer)

    matched_keywords = Column(ARRAY(Text))
    detection_rules_triggered = Column(ARRAY(Text))
    detection_method = Column(String(50))

    contextual_notes = Column(Text)
    related_iocs = Column(ARRAY(Text))
    affected_assets = Column(ARRAY(String(255)))
    potential_impact = Column(Text)

    detected_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    review_status = Column(String(20), server_default="pending")
    reviewed_by = Column(String(100))
    reviewed_at = Column(DateTime(timezone=True))
    review_notes = Column(Text)

    actions_taken = Column(ARRAY(Text))
    remediation_status = Column(String(20))
    resolution_time = Column(DateTime(timezone=True))

    escalated = Column(Boolean, server_default="false")
    escalated_to = Column(String(100))
    escalation_time = Column(DateTime(timezone=True))

    last_updated = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships — string targets prevent circular imports
    mention = relationship("SocialMention", back_populates="detections")
    sentiment = relationship("SentimentAnalysis", back_populates="detection")
    alert = relationship("Alert", back_populates="detection")
    user_activities = relationship("UserActivity", back_populates="detection")

    __table_args__ = (
        CheckConstraint(
            "criticality_level IN ('low', 'medium', 'high', 'critical')",
            name="threat_detections_criticality_level_check",
        ),
        CheckConstraint(
            "confidence_score BETWEEN 0 AND 1",
            name="threat_detections_confidence_score_check",
        ),
        CheckConstraint(
            "risk_score BETWEEN 0 AND 100",
            name="threat_detections_risk_score_check",
        ),
        CheckConstraint(
            "review_status IN ('pending', 'reviewing', 'confirmed', 'false_positive', 'investigating', 'resolved')",
            name="threat_detections_review_status_check",
        ),
        CheckConstraint(
            "remediation_status IN ('none', 'in_progress', 'completed', 'not_required')",
            name="threat_detections_remediation_status_check",
        ),
        UniqueConstraint("mention_id", name="unique_detection_per_mention"),
    )
