"""Metrics schemas for aggregate dashboard endpoints."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict


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
