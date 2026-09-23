"""Metrics schemas for aggregate dashboard endpoints."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class MetricsSummaryEndpointResponse(BaseModel):
    """Current /api/metrics/summary response consumed by the frontend."""

    model_config = ConfigDict(from_attributes=True)

    total_mentions: int
    sentiment_distribution: dict[str, int]
    alerts_count: int
    avg_sentiment_score: float | None = None


class TopKeywordEntry(BaseModel):
    """Keyword analytics from the top_keywords_stats materialized view."""

    model_config = ConfigDict(from_attributes=True)

    keyword: str
    detection_count: int
    days_active: int
    avg_confidence: float
    high_severity_count: int
    last_detection: datetime | None = None


class WorkflowHealthEntry(BaseModel):
    """Daily workflow execution stats from workflow_performance_stats."""

    model_config = ConfigDict(from_attributes=True)

    date: str
    execution_count: int
    success_count: int
    error_count: int
    avg_duration_seconds: float | None = None
    avg_mentions_processed: float | None = None
    avg_detections_generated: float | None = None


class RecentMentionResponse(BaseModel):
    """Recent mention item returned by /api/metrics/mentions."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    platform: str
    text: str
    created_at: datetime
    author: str | None


class TimeSeriesPoint(BaseModel):
    """Single data point for time-series charts."""

    model_config = ConfigDict(from_attributes=True)

    date: str
    count: int


class SentimentTimeSeriesPoint(BaseModel):
    """Daily sentiment breakdown for trend charts."""

    model_config = ConfigDict(from_attributes=True)

    date: str
    positive: int = 0
    neutral: int = 0
    negative: int = 0


class CategoryCount(BaseModel):
    """Label + count pair for distribution charts."""

    model_config = ConfigDict(from_attributes=True)

    label: str
    count: int


class AlertHealthSummary(BaseModel):
    """Alert delivery and acknowledgement metrics."""

    model_config = ConfigDict(from_attributes=True)

    total: int
    by_delivery_status: list["CategoryCount"]
    acknowledged_count: int
    unacknowledged_count: int
    acknowledgement_rate: float


class RiskScoreBucket(BaseModel):
    """Risk score histogram bucket."""

    model_config = ConfigDict(from_attributes=True)

    bucket: str
    count: int
    avg_score: float


class PaginatedMentionsResponse(BaseModel):
    """Paginated envelope for the /api/metrics/mentions endpoint."""

    data: list[RecentMentionResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
    available_platforms: list[str] = []
