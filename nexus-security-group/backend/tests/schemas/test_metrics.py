"""Tests for schemas.metrics."""
from datetime import datetime, timezone
from unittest.mock import MagicMock


NOW = datetime(2026, 7, 5, 10, 30, 0, tzinfo=timezone.utc)


def test_sentiment_distribution_importable():
    from schemas.metrics import SentimentDistribution
    assert SentimentDistribution is not None


def test_metrics_summary_response_importable():
    from schemas.metrics import MetricsSummaryResponse
    assert MetricsSummaryResponse is not None


def test_metrics_summary_endpoint_response_importable():
    from schemas.metrics import MetricsSummaryEndpointResponse
    assert MetricsSummaryEndpointResponse is not None


def test_recent_mention_response_importable():
    from schemas.metrics import RecentMentionResponse
    assert RecentMentionResponse is not None


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


def test_metrics_summary_endpoint_response_frontend_contract():
    """Current /api/metrics/summary shape consumed by the frontend."""
    from schemas.metrics import MetricsSummaryEndpointResponse

    resp = MetricsSummaryEndpointResponse(
        total_mentions=20,
        sentiment_distribution={"positive": 10, "neutral": 7, "negative": 3},
        alerts_count=4,
    )

    assert resp.model_dump() == {
        "total_mentions": 20,
        "sentiment_distribution": {"positive": 10, "neutral": 7, "negative": 3},
        "alerts_count": 4,
    }


def test_recent_mention_response_happy_path():
    """Recent mention items expose the frontend list item shape."""
    from schemas.metrics import RecentMentionResponse

    resp = RecentMentionResponse(
        id=123,
        platform="github",
        text="Potential secret leaked in issue",
        created_at=NOW,
        author="security-researcher",
    )

    assert resp.id == 123
    assert resp.platform == "github"
    assert resp.text == "Potential secret leaked in issue"
    assert resp.created_at == NOW
    assert resp.author == "security-researcher"


def test_recent_mention_response_accepts_missing_author():
    from schemas.metrics import RecentMentionResponse

    resp = RecentMentionResponse(
        id=124,
        platform="hackernews",
        text="Anonymous mention",
        created_at=NOW,
        author=None,
    )

    assert resp.author is None


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
