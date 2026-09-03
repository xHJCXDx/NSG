from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import relationship

from database import Base


class SocialMention(Base):
    """ORM model for the social_mentions table.

    NOTE: last_updated is maintained server-side by the
    update_social_mentions_last_updated trigger. Call db.refresh(obj)
    after any UPDATE to see the new value.
    """

    __tablename__ = "social_mentions"

    mention_id = Column(BigInteger, primary_key=True, autoincrement=True)
    platform = Column(String(50), nullable=False)
    external_id = Column(String(255), nullable=False)

    text_content = Column(Text, nullable=False)
    language = Column(String(10))

    created_at = Column(DateTime(timezone=True), nullable=False)
    collected_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    author_username = Column(String(255))
    author_id = Column(String(255))
    author_verified = Column(Boolean, server_default="false")
    author_followers_count = Column(Integer, server_default="0")
    author_description = Column(Text)

    likes_count = Column(Integer, server_default="0")
    shares_count = Column(Integer, server_default="0")
    replies_count = Column(Integer, server_default="0")
    views_count = Column(Integer, server_default="0")

    urls = Column(ARRAY(Text))
    hashtags = Column(ARRAY(String(100)))
    mentions = Column(ARRAY(String(100)))
    has_media = Column(Boolean, server_default="false")
    media_types = Column(ARRAY(String(20)))

    geo_location = Column(JSONB)

    is_reply = Column(Boolean, server_default="false")
    is_quote = Column(Boolean, server_default="false")
    reply_to_id = Column(String(255))
    conversation_id = Column(String(255))

    raw_data = Column(JSONB)

    processing_status = Column(String(20), server_default="pending")
    processing_error = Column(Text)
    last_updated = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships — string targets prevent circular imports
    sentiments = relationship("SentimentAnalysis", back_populates="mention")
    detections = relationship("ThreatDetection", back_populates="mention")
    user_activities = relationship("UserActivity", back_populates="mention")

    __table_args__ = (
        CheckConstraint(
            "platform IN ('twitter', 'reddit', 'telegram', 'discord', 'github', 'exploit-db', 'other')",
            name="social_mentions_platform_check",
        ),
        CheckConstraint(
            "processing_status IN ('pending', 'processed', 'failed')",
            name="social_mentions_processing_status_check",
        ),
        CheckConstraint(
            "author_followers_count >= 0",
            name="social_mentions_author_followers_count_check",
        ),
        CheckConstraint("likes_count >= 0", name="social_mentions_likes_count_check"),
        CheckConstraint("shares_count >= 0", name="social_mentions_shares_count_check"),
        CheckConstraint("replies_count >= 0", name="social_mentions_replies_count_check"),
        CheckConstraint("views_count >= 0", name="social_mentions_views_count_check"),
        UniqueConstraint("platform", "external_id", name="unique_mention_per_platform"),
    )
