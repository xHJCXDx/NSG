from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from database import get_db
from auth import require_permission
from models import Alert, SentimentAnalysis, SocialMention
from schemas.metrics import MetricsSummaryEndpointResponse, RecentMentionResponse

router = APIRouter(prefix="/api/metrics", tags=["metrics"])


@router.get(
    "/summary",
    response_model=MetricsSummaryEndpointResponse,
    response_model_exclude_none=True,
)
def get_metrics_summary(
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("metrics", "read")),
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


@router.get("/mentions", response_model=list[RecentMentionResponse])
def get_recent_mentions(
    db: Session = Depends(get_db),
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    current_user=Depends(require_permission("mentions", "read")),
):
    mentions = (
        db.query(
            SocialMention.mention_id,
            SocialMention.platform,
            SocialMention.text_content,
            SocialMention.created_at,
            SocialMention.author_username,
        )
        .order_by(SocialMention.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": row.mention_id,
            "platform": row.platform,
            "text": row.text_content,
            "created_at": row.created_at,
            "author": row.author_username,
        }
        for row in mentions
    ]
