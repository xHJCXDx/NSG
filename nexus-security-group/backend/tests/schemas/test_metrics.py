"""Tests for schemas.metrics — MetricsSummaryResponse and SentimentDistribution."""
import pytest
from unittest.mock import MagicMock


def test_sentiment_distribution_importable():
    from schemas.metrics import SentimentDistribution
    assert SentimentDistribution is not None


def test_metrics_summary_response_importable():
    from schemas.metrics import MetricsSummaryResponse
    assert MetricsSummaryResponse is not None


def test_sentiment_distribution_happy_path():
    from schemas.metrics import SentimentDistribution
    sd = SentimentDistribution(positive=10, neutral=5, negative=3, mixed=2)
    assert sd.positive == 10
    assert sd.neutral == 5
    assert sd.negative == 3
    assert sd.mixed == 2


def test_metrics_summary_response_happy_path():
    from schemas.metrics import MetricsSummaryResponse, SentimentDistribution
    sd = SentimentDistribution(positive=10, neutral=5, negative=3, mixed=2)
    resp = MetricsSummaryResponse(
        total_mentions=20,
        processed_mentions=18,
        pending_mentions=2,
        total_threats=5,
        critical_threats=1,
        high_threats=2,
        total_alerts=3,
        unacknowledged_alerts=1,
        sentiment_distribution=sd,
    )
    assert resp.total_mentions == 20
    assert resp.total_threats == 5


def test_metrics_summary_response_orm_mode():
    """MetricsSummaryResponse must support from_attributes (ORM mode)."""
    from schemas.metrics import MetricsSummaryResponse, SentimentDistribution

    sd = SentimentDistribution(positive=1, neutral=2, negative=3, mixed=0)

    mock_orm = MagicMock()
    mock_orm.total_mentions = 100
    mock_orm.processed_mentions = 90
    mock_orm.pending_mentions = 10
    mock_orm.total_threats = 7
    mock_orm.critical_threats = 2
    mock_orm.high_threats = 3
    mock_orm.total_alerts = 5
    mock_orm.unacknowledged_alerts = 2
    mock_orm.sentiment_distribution = sd

    result = MetricsSummaryResponse.model_validate(mock_orm)
    assert result.total_mentions == 100
    assert result.total_threats == 7
