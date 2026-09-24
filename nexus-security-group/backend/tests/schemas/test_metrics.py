"""Tests for schemas.metrics."""
from datetime import datetime, timezone


NOW = datetime(2026, 7, 5, 10, 30, 0, tzinfo=timezone.utc)


def test_metrics_summary_endpoint_response_importable():
    from schemas.metrics import MetricsSummaryEndpointResponse
    assert MetricsSummaryEndpointResponse is not None


def test_recent_mention_response_importable():
    from schemas.metrics import RecentMentionResponse
    assert RecentMentionResponse is not None


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
