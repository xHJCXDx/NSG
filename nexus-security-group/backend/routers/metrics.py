from datetime import UTC, datetime, timedelta
from math import ceil
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from database import get_db
from auth import require_permission
from models import Alert, SentimentAnalysis, SocialMention, ThreatDetection
from schemas.auth import TokenData
from schemas.metrics import (
    CategoryCount,
    MetricsSummaryEndpointResponse,
    PaginatedMentionsResponse,
    RecentMentionResponse,
    SentimentTimeSeriesPoint,
    TimeSeriesPoint,
)

router = APIRouter(prefix="/api/metrics", tags=["metrics"])


@router.get(
    "/summary",
    response_model=MetricsSummaryEndpointResponse,
    response_model_exclude_none=True,
)
def get_metrics_summary(
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_permission("metrics", "read")),
):
    # Total mentions
    total_mentions = db.query(func.count(SocialMention.mention_id)).scalar() or 0

    # Sentiment distribution
    sentiment_counts = (
        db.query(
            SentimentAnalysis.sentiment_label,
            func.count(SentimentAnalysis.sentiment_id),
        )
        .group_by(SentimentAnalysis.sentiment_label)
        .all()
    )
    sentiment_dist = {label: count for label, count in sentiment_counts}

    # Alerts count
    alerts_count = db.query(func.count(Alert.alert_id)).scalar() or 0

    return {
        "total_mentions": total_mentions,
        "sentiment_distribution": sentiment_dist,
        "alerts_count": alerts_count,
    }


@router.get("/mentions", response_model=PaginatedMentionsResponse)
def get_recent_mentions(
    db: Session = Depends(get_db),
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 25,
    current_user: TokenData = Depends(require_permission("mentions", "read")),
):
    total_count = db.query(func.count(SocialMention.mention_id)).scalar() or 0

    mentions = (
        db.query(
            SocialMention.mention_id,
            SocialMention.platform,
            SocialMention.text_content,
            SocialMention.created_at,
            SocialMention.author_username,
        )
        .order_by(SocialMention.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    data = [
        {
            "id": row.mention_id,
            "platform": row.platform,
            "text": row.text_content,
            "created_at": row.created_at,
            "author": row.author_username,
        }
        for row in mentions
    ]
    return {
        "data": data,
        "total": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": ceil(total_count / page_size) if total_count > 0 else 1,
    }


@router.get("/mentions-over-time", response_model=list[TimeSeriesPoint])
def get_mentions_over_time(
    db: Session = Depends(get_db),
    days: Annotated[int, Query(ge=1, le=365)] = 30,
    current_user: TokenData = Depends(require_permission("metrics", "read")),
):
    since = datetime.now(UTC) - timedelta(days=days)
    rows = (
        db.query(
            func.date(SocialMention.created_at).label("date"),
            func.count().label("count"),
        )
        .filter(SocialMention.created_at >= since)
        .group_by(func.date(SocialMention.created_at))
        .order_by(func.date(SocialMention.created_at))
        .all()
    )
    return [TimeSeriesPoint(date=str(row.date), count=row.count) for row in rows]


@router.get("/sentiment-over-time", response_model=list[SentimentTimeSeriesPoint])
def get_sentiment_over_time(
    db: Session = Depends(get_db),
    days: Annotated[int, Query(ge=1, le=365)] = 30,
    current_user: TokenData = Depends(require_permission("metrics", "read")),
):
    since = datetime.now(UTC) - timedelta(days=days)
    rows = (
        db.query(
            func.date(SocialMention.created_at).label("date"),
            SentimentAnalysis.sentiment_label,
            func.count().label("count"),
        )
        .join(SentimentAnalysis, SentimentAnalysis.mention_id == SocialMention.mention_id)
        .filter(SocialMention.created_at >= since)
        .group_by(
            func.date(SocialMention.created_at),
            SentimentAnalysis.sentiment_label,
        )
        .order_by(func.date(SocialMention.created_at))
        .all()
    )

    # Pivot: date -> SentimentTimeSeriesPoint
    pivot: dict[str, SentimentTimeSeriesPoint] = {}
    for row in rows:
        date_str = str(row.date)
        if date_str not in pivot:
            pivot[date_str] = SentimentTimeSeriesPoint(date=date_str)
        point = pivot[date_str]
        label = (row.sentiment_label or "").lower()
        if label == "positive":
            point.positive += row.count
        elif label == "negative":
            point.negative += row.count
        else:
            point.neutral += row.count

    return sorted(pivot.values(), key=lambda p: p.date)


@router.get("/threats-by-severity", response_model=list[CategoryCount])
def get_threats_by_severity(
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_permission("metrics", "read")),
):
    rows = (
        db.query(
            ThreatDetection.criticality_level.label("label"),
            func.count().label("count"),
        )
        .group_by(ThreatDetection.criticality_level)
        .order_by(func.count().desc())
        .all()
    )
    return [CategoryCount(label=row.label, count=row.count) for row in rows]


@router.get("/platform-distribution", response_model=list[CategoryCount])
def get_platform_distribution(
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_permission("metrics", "read")),
):
    rows = (
        db.query(
            SocialMention.platform.label("label"),
            func.count().label("count"),
        )
        .group_by(SocialMention.platform)
        .order_by(func.count().desc())
        .all()
    )
    return [CategoryCount(label=row.label, count=row.count) for row in rows]


@router.get("/threat-categories", response_model=list[CategoryCount])
def get_threat_categories(
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_permission("metrics", "read")),
):
    rows = (
        db.query(
            func.coalesce(ThreatDetection.threat_category, "uncategorized").label("label"),
            func.count().label("count"),
        )
        .group_by(ThreatDetection.threat_category)
        .order_by(func.count().desc())
        .all()
    )
    return [CategoryCount(label=row.label, count=row.count) for row in rows]
