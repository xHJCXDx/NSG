"""Metrics schemas for aggregate dashboard endpoints."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SentimentDistribution(BaseModel):
    """Breakdown of sentiment labels across processed mentions."""

    model_config = ConfigDict(from_attributes=True)

    positive: int
    neutral: int
    negative: int
    mixed: int


class MetricsSummaryResponse(BaseModel):
    """Aggregated dashboard metrics summary."""

    model_config = ConfigDict(from_attributes=True)

    total_mentions: int
    processed_mentions: int
    pending_mentions: int
    total_threats: int
    critical_threats: int
    high_threats: int
    total_alerts: int
    unacknowledged_alerts: int
    sentiment_distribution: SentimentDistribution


class MetricsSummaryEndpointResponse(BaseModel):
    """Current /api/metrics/summary response consumed by the frontend."""

    model_config = ConfigDict(from_attributes=True)

    total_mentions: int
    sentiment_distribution: dict[str, int]
    alerts_count: int


class RecentMentionResponse(BaseModel):
    """Recent mention item returned by /api/metrics/mentions."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    platform: str
    text: str
    created_at: datetime
    author: str | None
