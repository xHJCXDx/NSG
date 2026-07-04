from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db


router = APIRouter(prefix="/api/threats", tags=["threats"])


def _as_float(value):
    if isinstance(value, Decimal):
        return float(value)
    return value


def _map_threat_row(row):
    related_mention = None
    if row.mention_text_content is not None or row.mention_platform is not None:
        related_mention = {
            "mention_id": row.mention_id,
            "text_content": row.mention_text_content,
            "platform": row.mention_platform,
        }

    threat = {
        "detection_id": row.detection_id,
        "mention_id": row.mention_id,
        "threat_type": row.threat_type,
        "threat_category": row.threat_category,
        "criticality_level": row.criticality_level,
        "confidence_score": _as_float(row.confidence_score),
        "risk_score": row.risk_score,
        "matched_keywords": row.matched_keywords,
        "detection_rules_triggered": row.detection_rules_triggered,
        "contextual_notes": row.contextual_notes,
        "detected_at": row.detected_at,
        "review_status": row.review_status,
        "last_updated": row.last_updated,
    }

    if related_mention is not None:
        threat["related_mention"] = related_mention

    return threat


@router.get("")
def get_threats(
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    threats = db.execute(
        text(
            """
            SELECT
                td.detection_id,
                td.mention_id,
                td.threat_type,
                td.threat_category,
                td.criticality_level,
                td.confidence_score,
                td.risk_score,
                td.matched_keywords,
                td.detection_rules_triggered,
                td.contextual_notes,
                td.detected_at,
                td.review_status,
                td.last_updated,
                sm.text_content AS mention_text_content,
                sm.platform AS mention_platform
            FROM threat_detections td
            LEFT JOIN social_mentions sm ON sm.mention_id = td.mention_id
            ORDER BY td.detected_at DESC
            LIMIT :limit
            """
        ),
        {"limit": limit},
    ).fetchall()

    return [_map_threat_row(row) for row in threats]
