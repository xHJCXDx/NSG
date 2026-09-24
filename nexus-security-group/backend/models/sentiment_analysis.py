from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship

from database import Base


class SentimentAnalysis(Base):
    """ORM model for the sentiment_analysis table."""

    __tablename__ = "sentiment_analysis"

    sentiment_id = Column(BigInteger, primary_key=True, autoincrement=True)
    mention_id = Column(
        BigInteger,
        ForeignKey("social_mentions.mention_id", ondelete="CASCADE"),
        nullable=False,
    )

    vader_compound = Column(Numeric(5, 4))
    vader_pos = Column(Numeric(4, 3))
    vader_neu = Column(Numeric(4, 3))
    vader_neg = Column(Numeric(4, 3))

    textblob_polarity = Column(Numeric(5, 4))
    textblob_subjectivity = Column(Numeric(4, 3))

    final_sentiment_score = Column(Numeric(5, 4), nullable=False)
    sentiment_label = Column(String(20), nullable=False)
    confidence_score = Column(Numeric(4, 3))

    analysis_method = Column(String(50), nullable=False)
    analyzed_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    # Relationships — string targets prevent circular imports
    mention = relationship("SocialMention", back_populates="sentiments")
    detection = relationship("ThreatDetection", back_populates="sentiment")

    __table_args__ = (
        CheckConstraint(
            "vader_compound BETWEEN -1 AND 1",
            name="sentiment_analysis_vader_compound_check",
        ),
        CheckConstraint(
            "vader_pos BETWEEN 0 AND 1",
            name="sentiment_analysis_vader_pos_check",
        ),
        CheckConstraint(
            "vader_neu BETWEEN 0 AND 1",
            name="sentiment_analysis_vader_neu_check",
        ),
        CheckConstraint(
            "vader_neg BETWEEN 0 AND 1",
            name="sentiment_analysis_vader_neg_check",
        ),
        CheckConstraint(
            "textblob_polarity BETWEEN -1 AND 1",
            name="sentiment_analysis_textblob_polarity_check",
        ),
        CheckConstraint(
            "textblob_subjectivity BETWEEN 0 AND 1",
            name="sentiment_analysis_textblob_subjectivity_check",
        ),
        CheckConstraint(
            "final_sentiment_score BETWEEN -1 AND 1",
            name="sentiment_analysis_final_sentiment_score_check",
        ),
        CheckConstraint(
            "sentiment_label IN ('positive', 'neutral', 'negative', 'mixed')",
            name="sentiment_analysis_sentiment_label_check",
        ),
        CheckConstraint(
            "confidence_score BETWEEN 0 AND 1",
            name="sentiment_analysis_confidence_score_check",
        ),
        UniqueConstraint("mention_id", name="unique_sentiment_per_mention"),
    )
