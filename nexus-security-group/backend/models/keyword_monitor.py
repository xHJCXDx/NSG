from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    Integer,
    String,
    Text,
    func,
)

from database import Base


class KeywordMonitor(Base):
    """ORM model for the keywords_monitor table.

    Uses SERIAL (Integer) PK — not BIGSERIAL — as defined in init.sql.
    match_count and last_match_at are updated server-side by the
    trigger_update_keyword_match trigger. Call db.refresh(obj) to fetch
    the latest values after a social_mentions INSERT.
    """

    __tablename__ = "keywords_monitor"

    keyword_id = Column(Integer, primary_key=True, autoincrement=True)
    keyword_text = Column(String(255), nullable=False, unique=True)
    keyword_type = Column(String(50))
    keyword_category = Column(String(50))
    keyword_weight = Column(Integer, server_default="10")

    is_active = Column(Boolean, server_default="true")
    is_regex = Column(Boolean, server_default="false")
    case_sensitive = Column(Boolean, server_default="false")

    added_by = Column(String(100))
    added_at = Column(DateTime(timezone=True), server_default=func.now())

    last_match_at = Column(DateTime(timezone=True))
    match_count = Column(Integer, server_default="0")
    false_positive_count = Column(Integer, server_default="0")
    true_positive_count = Column(Integer, server_default="0")

    trigger_immediate_alert = Column(Boolean, server_default="false")
    min_matches_for_alert = Column(Integer, server_default="1")

    description = Column(Text)

    __table_args__ = (
        CheckConstraint(
            "keyword_weight BETWEEN 1 AND 100",
            name="keywords_monitor_keyword_weight_check",
        ),
    )
