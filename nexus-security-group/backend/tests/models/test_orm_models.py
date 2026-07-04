"""
ORM Model Tests — spec: openspec/changes/backend-orm-models/specs/orm-models/spec.md

Covers:
  R1 — Table mapping (PK identity)
  R2 — Column completeness, server_default for NOW(), UUID server_default
  R3 — FK declarations, relationship string targets
  R4 — Model registry (importability, Base.metadata, single Base)
  R5 — CHECK and UNIQUE constraints
"""
import pytest
from sqlalchemy import inspect, text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, INET, UUID
from sqlalchemy import (
    BigInteger,
    Integer,
    String,
    Text,
    Boolean,
    Numeric,
    DateTime,
)
from sqlalchemy.orm import RelationshipProperty

# R4.S1 — all 7 models must be importable from models
from models import (
    SocialMention,
    SentimentAnalysis,
    ThreatDetection,
    Alert,
    KeywordMonitor,
    ExecutionLog,
    UserActivity,
)
from database import Base


# ---------------------------------------------------------------------------
# R1 — Table Mapping
# ---------------------------------------------------------------------------

class TestTableMapping:
    """R1.S1 — each model has the correct __tablename__ and PK."""

    EXPECTED = [
        (SocialMention,      "social_mentions",    "mention_id",    BigInteger),
        (SentimentAnalysis,  "sentiment_analysis",  "sentiment_id",  BigInteger),
        (ThreatDetection,    "threat_detections",   "detection_id",  BigInteger),
        (Alert,              "alerts",              "alert_id",      BigInteger),
        (KeywordMonitor,     "keywords_monitor",    "keyword_id",    Integer),
        (ExecutionLog,       "execution_logs",      "log_id",        BigInteger),
        (UserActivity,       "user_activity",       "activity_id",   BigInteger),
    ]

    def test_tablenames(self):
        for model, tablename, _pk_col, _pk_type in self.EXPECTED:
            assert model.__tablename__ == tablename, (
                f"{model.__name__}: expected __tablename__='{tablename}', "
                f"got '{model.__tablename__}'"
            )

    def test_pk_column_names(self):
        for model, _tablename, pk_col, _pk_type in self.EXPECTED:
            mapper = inspect(model)
            pk_cols = [c.key for c in mapper.primary_key]
            assert pk_col in pk_cols, (
                f"{model.__name__}: PK column '{pk_col}' not found in {pk_cols}"
            )

    def test_pk_column_types(self):
        for model, _tablename, pk_col, pk_type in self.EXPECTED:
            mapper = inspect(model)
            col = mapper.columns[pk_col]
            assert isinstance(col.type, pk_type), (
                f"{model.__name__}.{pk_col}: expected type {pk_type.__name__}, "
                f"got {type(col.type).__name__}"
            )

    def test_pk_autoincrement(self):
        for model, _tablename, pk_col, _pk_type in self.EXPECTED:
            mapper = inspect(model)
            col = mapper.columns[pk_col]
            assert col.autoincrement is True or col.autoincrement == "auto", (
                f"{model.__name__}.{pk_col} must be autoincrement"
            )


# ---------------------------------------------------------------------------
# R2 — Column Completeness
# ---------------------------------------------------------------------------

class TestColumnCompleteness:
    """R2.S1 — every SQL column must appear in the model."""

    SOCIAL_MENTION_COLS = [
        "mention_id", "platform", "external_id", "text_content", "language",
        "created_at", "collected_at",
        "author_username", "author_id", "author_verified", "author_followers_count",
        "author_description",
        "likes_count", "shares_count", "replies_count", "views_count",
        "urls", "hashtags", "mentions", "has_media", "media_types",
        "geo_location",
        "is_reply", "is_quote", "reply_to_id", "conversation_id",
        "raw_data",
        "processing_status", "processing_error", "last_updated",
    ]

    SENTIMENT_ANALYSIS_COLS = [
        "sentiment_id", "mention_id",
        "vader_compound", "vader_pos", "vader_neu", "vader_neg",
        "textblob_polarity", "textblob_subjectivity",
        "final_sentiment_score", "sentiment_label", "confidence_score",
        "analysis_method", "analyzed_at",
    ]

    THREAT_DETECTION_COLS = [
        "detection_id", "mention_id", "sentiment_id",
        "threat_type", "threat_category", "criticality_level",
        "confidence_score", "risk_score",
        "matched_keywords", "detection_rules_triggered", "detection_method",
        "contextual_notes", "related_iocs", "affected_assets", "potential_impact",
        "detected_at",
        "review_status", "reviewed_by", "reviewed_at", "review_notes",
        "actions_taken", "remediation_status", "resolution_time",
        "escalated", "escalated_to", "escalation_time",
        "last_updated",
    ]

    ALERT_COLS = [
        "alert_id", "detection_id", "alert_uuid",
        "alert_title", "alert_message", "alert_severity",
        "channels_sent", "slack_channel",
        "created_at", "sent_at", "delivery_status",
        "acknowledged", "acknowledged_by", "acknowledged_at",
        "last_updated",
    ]

    KEYWORD_MONITOR_COLS = [
        "keyword_id", "keyword_text", "keyword_type", "keyword_category",
        "keyword_weight", "is_active", "is_regex", "case_sensitive",
        "added_by", "added_at",
        "last_match_at", "match_count", "false_positive_count", "true_positive_count",
        "trigger_immediate_alert", "min_matches_for_alert",
        "description",
    ]

    EXECUTION_LOG_COLS = [
        "log_id", "execution_uuid",
        "workflow_name", "execution_id",
        "status",
        "mentions_collected", "mentions_processed", "detections_generated",
        "alerts_generated",
        "started_at", "completed_at", "duration_seconds",
        "last_updated",
    ]

    USER_ACTIVITY_COLS = [
        "activity_id",
        "username", "user_role",
        "activity_type", "activity_description",
        "related_mention_id", "related_detection_id", "related_alert_id",
        "ip_address", "user_agent", "session_id",
        "activity_timestamp", "activity_data",
    ]

    def _assert_columns(self, model, expected_cols):
        mapper = inspect(model)
        mapped = {c.key for c in mapper.columns}
        for col in expected_cols:
            assert col in mapped, (
                f"{model.__name__} missing column '{col}'. "
                f"Mapped columns: {sorted(mapped)}"
            )

    def test_social_mention_columns(self):
        self._assert_columns(SocialMention, self.SOCIAL_MENTION_COLS)

    def test_sentiment_analysis_columns(self):
        self._assert_columns(SentimentAnalysis, self.SENTIMENT_ANALYSIS_COLS)

    def test_threat_detection_columns(self):
        self._assert_columns(ThreatDetection, self.THREAT_DETECTION_COLS)

    def test_alert_columns(self):
        self._assert_columns(Alert, self.ALERT_COLS)

    def test_keyword_monitor_columns(self):
        self._assert_columns(KeywordMonitor, self.KEYWORD_MONITOR_COLS)

    def test_execution_log_columns(self):
        self._assert_columns(ExecutionLog, self.EXECUTION_LOG_COLS)

    def test_user_activity_columns(self):
        self._assert_columns(UserActivity, self.USER_ACTIVITY_COLS)


class TestServerDefaults:
    """R2.S2 — columns with DEFAULT NOW() must use server_default (not client default)."""

    NOW_COLUMNS = [
        (SocialMention,     "collected_at"),
        (SocialMention,     "last_updated"),
        (SentimentAnalysis, "analyzed_at"),
        (ThreatDetection,   "detected_at"),
        (ThreatDetection,   "last_updated"),
        (Alert,             "created_at"),
        (Alert,             "last_updated"),
        (KeywordMonitor,    "added_at"),
        (ExecutionLog,      "last_updated"),
        (UserActivity,      "activity_timestamp"),
    ]

    def test_now_columns_use_server_default(self):
        for model, col_name in self.NOW_COLUMNS:
            mapper = inspect(model)
            col = mapper.columns[col_name]
            assert col.server_default is not None, (
                f"{model.__name__}.{col_name} must have server_default (DEFAULT NOW()), "
                f"but server_default is None. Use server_default=func.now()"
            )
            # must NOT have a Python-side default
            assert col.default is None, (
                f"{model.__name__}.{col_name} must NOT have a Python-side default. "
                f"Remove 'default=' and keep only 'server_default=func.now()'"
            )


class TestUUIDServerDefault:
    """R2.S3 — UUID columns must use server_default=text("uuid_generate_v4()")."""

    UUID_COLUMNS = [
        (Alert,        "alert_uuid"),
        (ExecutionLog, "execution_uuid"),
    ]

    def test_uuid_columns_have_server_default(self):
        for model, col_name in self.UUID_COLUMNS:
            mapper = inspect(model)
            col = mapper.columns[col_name]
            assert col.server_default is not None, (
                f"{model.__name__}.{col_name} must have server_default=text('uuid_generate_v4()')"
            )

    def test_uuid_columns_have_uuid_type(self):
        for model, col_name in self.UUID_COLUMNS:
            mapper = inspect(model)
            col = mapper.columns[col_name]
            assert isinstance(col.type, UUID), (
                f"{model.__name__}.{col_name} must be UUID type, got {type(col.type).__name__}"
            )


# ---------------------------------------------------------------------------
# R3 — Foreign Keys
# ---------------------------------------------------------------------------

class TestForeignKeys:
    """R3.S1 — FK columns must reference the correct parent table and column."""

    FK_SPECS = [
        (SentimentAnalysis,  "mention_id",         "social_mentions.mention_id"),
        (ThreatDetection,    "mention_id",          "social_mentions.mention_id"),
        (ThreatDetection,    "sentiment_id",        "sentiment_analysis.sentiment_id"),
        (Alert,              "detection_id",        "threat_detections.detection_id"),
        (UserActivity,       "related_mention_id",  "social_mentions.mention_id"),
        (UserActivity,       "related_detection_id","threat_detections.detection_id"),
        (UserActivity,       "related_alert_id",    "alerts.alert_id"),
    ]

    def test_fk_references(self):
        for model, col_name, expected_target in self.FK_SPECS:
            mapper = inspect(model)
            col = mapper.columns[col_name]
            fks = col.foreign_keys
            assert len(fks) > 0, (
                f"{model.__name__}.{col_name} has no ForeignKey declared"
            )
            targets = {fk.target_fullname for fk in fks}
            assert expected_target in targets, (
                f"{model.__name__}.{col_name}: expected FK target '{expected_target}', "
                f"got {targets}"
            )

    def test_on_delete_cascade_sentiment_mention(self):
        """SentimentAnalysis.mention_id → social_mentions ON DELETE CASCADE."""
        mapper = inspect(SentimentAnalysis)
        col = mapper.columns["mention_id"]
        fk = next(iter(col.foreign_keys))
        assert fk.ondelete == "CASCADE", (
            f"SentimentAnalysis.mention_id must have ON DELETE CASCADE, got '{fk.ondelete}'"
        )

    def test_on_delete_cascade_threat_mention(self):
        """ThreatDetection.mention_id → social_mentions ON DELETE CASCADE."""
        mapper = inspect(ThreatDetection)
        col = mapper.columns["mention_id"]
        fk = next(iter(col.foreign_keys))
        assert fk.ondelete == "CASCADE", (
            f"ThreatDetection.mention_id must have ON DELETE CASCADE, got '{fk.ondelete}'"
        )

    def test_on_delete_set_null_threat_sentiment(self):
        """ThreatDetection.sentiment_id → sentiment_analysis ON DELETE SET NULL."""
        mapper = inspect(ThreatDetection)
        col = mapper.columns["sentiment_id"]
        fk = next(iter(col.foreign_keys))
        assert fk.ondelete == "SET NULL", (
            f"ThreatDetection.sentiment_id must have ON DELETE SET NULL, got '{fk.ondelete}'"
        )

    def test_on_delete_cascade_alert_detection(self):
        """Alert.detection_id → threat_detections ON DELETE CASCADE."""
        mapper = inspect(Alert)
        col = mapper.columns["detection_id"]
        fk = next(iter(col.foreign_keys))
        assert fk.ondelete == "CASCADE", (
            f"Alert.detection_id must have ON DELETE CASCADE, got '{fk.ondelete}'"
        )

    def test_on_delete_set_null_user_activity_fks(self):
        """All 3 UserActivity FKs must be ON DELETE SET NULL."""
        fk_cols = ["related_mention_id", "related_detection_id", "related_alert_id"]
        mapper = inspect(UserActivity)
        for col_name in fk_cols:
            col = mapper.columns[col_name]
            fk = next(iter(col.foreign_keys))
            assert fk.ondelete == "SET NULL", (
                f"UserActivity.{col_name} must have ON DELETE SET NULL, got '{fk.ondelete}'"
            )


class TestRelationshipStringTargets:
    """R3.S2 — all relationship() declarations must use string class name targets."""

    MODELS_WITH_RELATIONSHIPS = [
        SentimentAnalysis,
        ThreatDetection,
        Alert,
        UserActivity,
    ]

    def test_all_relationship_targets_are_strings(self):
        for model in self.MODELS_WITH_RELATIONSHIPS:
            mapper = inspect(model)
            for rel in mapper.relationships:
                # SQLAlchemy lazily resolves relationships; argument is the string or class.
                # After mapper configuration, rel.mapper.class_ is available but we want
                # to verify the argument was given as a string (rel.argument is the original).
                arg = rel.argument
                assert isinstance(arg, str), (
                    f"{model.__name__}.{rel.key}: relationship target must be a string "
                    f"(e.g. 'SocialMention'), got {type(arg).__name__}"
                )


# ---------------------------------------------------------------------------
# R4 — Model Registry
# ---------------------------------------------------------------------------

class TestModelRegistry:
    """R4.S1/S2/S3 — importability, Base.metadata completeness, single Base."""

    EXPECTED_TABLES = {
        "social_mentions",
        "sentiment_analysis",
        "threat_detections",
        "alerts",
        "keywords_monitor",
        "execution_logs",
        "user_activity",
    }

    def test_all_models_importable(self):
        # The import at the top of this module covers R4.S1 —
        # if the import fails, this whole test file fails to collect.
        # This test additionally asserts the classes are valid SQLAlchemy mappers.
        models = [
            SocialMention, SentimentAnalysis, ThreatDetection, Alert,
            KeywordMonitor, ExecutionLog, UserActivity,
        ]
        for model in models:
            assert hasattr(model, "__tablename__"), (
                f"{model.__name__} is missing __tablename__ — is it a proper ORM model?"
            )

    def test_base_metadata_contains_all_7_tables(self):
        tables = set(Base.metadata.tables.keys())
        missing = self.EXPECTED_TABLES - tables
        assert not missing, (
            f"Base.metadata is missing tables: {missing}. "
            f"Present tables: {tables}"
        )

    def test_all_models_share_single_base(self):
        models = [
            SocialMention, SentimentAnalysis, ThreatDetection, Alert,
            KeywordMonitor, ExecutionLog, UserActivity,
        ]
        for model in models:
            assert issubclass(model, Base), (
                f"{model.__name__} does not inherit from database.Base. "
                "All models must share the same Base instance."
            )


# ---------------------------------------------------------------------------
# R5 — CHECK and UNIQUE Constraints
# ---------------------------------------------------------------------------

class TestCheckConstraints:
    """R5.S1 — __table_args__ must contain CheckConstraint for all CHECK columns."""

    from sqlalchemy import CheckConstraint as CC, UniqueConstraint as UC

    def _get_check_constraints(self, model):
        """Return set of CheckConstraint sqltext strings for a model."""
        from sqlalchemy import CheckConstraint
        args = model.__table_args__ if hasattr(model, "__table_args__") else ()
        if isinstance(args, dict):
            return set()
        return {
            str(a.sqltext) if isinstance(a, CheckConstraint) else None
            for a in args
            if isinstance(a, CheckConstraint)
        }

    def _has_check_for(self, model, substring):
        """Return True if any CheckConstraint's sqltext contains the substring."""
        from sqlalchemy import CheckConstraint
        args = getattr(model, "__table_args__", ())
        if isinstance(args, dict):
            return False
        for a in args:
            if isinstance(a, CheckConstraint) and substring in str(a.sqltext):
                return True
        return False

    def test_social_mention_platform_check(self):
        assert self._has_check_for(SocialMention, "platform"), (
            "SocialMention missing CHECK constraint on 'platform'"
        )

    def test_social_mention_processing_status_check(self):
        assert self._has_check_for(SocialMention, "processing_status"), (
            "SocialMention missing CHECK constraint on 'processing_status'"
        )

    def test_sentiment_vader_compound_check(self):
        assert self._has_check_for(SentimentAnalysis, "vader_compound"), (
            "SentimentAnalysis missing CHECK constraint on 'vader_compound'"
        )

    def test_sentiment_label_check(self):
        assert self._has_check_for(SentimentAnalysis, "sentiment_label"), (
            "SentimentAnalysis missing CHECK constraint on 'sentiment_label'"
        )

    def test_threat_criticality_level_check(self):
        assert self._has_check_for(ThreatDetection, "criticality_level"), (
            "ThreatDetection missing CHECK constraint on 'criticality_level'"
        )

    def test_threat_review_status_check(self):
        assert self._has_check_for(ThreatDetection, "review_status"), (
            "ThreatDetection missing CHECK constraint on 'review_status'"
        )

    def test_alert_severity_check(self):
        assert self._has_check_for(Alert, "alert_severity"), (
            "Alert missing CHECK constraint on 'alert_severity'"
        )

    def test_alert_delivery_status_check(self):
        assert self._has_check_for(Alert, "delivery_status"), (
            "Alert missing CHECK constraint on 'delivery_status'"
        )

    def test_execution_log_status_check(self):
        assert self._has_check_for(ExecutionLog, "status"), (
            "ExecutionLog missing CHECK constraint on 'status'"
        )

    def test_keyword_weight_check(self):
        assert self._has_check_for(KeywordMonitor, "keyword_weight"), (
            "KeywordMonitor missing CHECK constraint on 'keyword_weight'"
        )


class TestUniqueConstraints:
    """R5.S2 — __table_args__ must include named UniqueConstraints."""

    def _has_unique_named(self, model, name):
        from sqlalchemy import UniqueConstraint
        args = getattr(model, "__table_args__", ())
        if isinstance(args, dict):
            return False
        for a in args:
            if isinstance(a, UniqueConstraint) and a.name == name:
                return True
        return False

    def test_unique_mention_per_platform(self):
        assert self._has_unique_named(SocialMention, "unique_mention_per_platform"), (
            "SocialMention missing UniqueConstraint named 'unique_mention_per_platform'"
        )

    def test_unique_sentiment_per_mention(self):
        assert self._has_unique_named(SentimentAnalysis, "unique_sentiment_per_mention"), (
            "SentimentAnalysis missing UniqueConstraint named 'unique_sentiment_per_mention'"
        )

    def test_unique_detection_per_mention(self):
        assert self._has_unique_named(ThreatDetection, "unique_detection_per_mention"), (
            "ThreatDetection missing UniqueConstraint named 'unique_detection_per_mention'"
        )
