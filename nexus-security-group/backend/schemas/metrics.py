"""Metrics schemas — MetricsSummaryResponse and SentimentDistribution.

These schemas type the /api/metrics endpoint responses. They are
aggregate views computed from multiple tables, not directly mapped
to a single ORM model, but still support ORM-mode for flexibility.
"""
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
