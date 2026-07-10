from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import SocialMention, ThreatDetection
from schemas.threat import ThreatDetail, ThreatListResponse, ThreatReviewRequest


router = APIRouter(prefix="/api/threats", tags=["threats"])


def _map_threat_list_item(threat: ThreatDetection, mention: SocialMention | None):
    related_mention = None
    if mention is not None:
        related_mention = {
            "mention_id": mention.mention_id,
            "text_content": mention.text_content,
            "platform": mention.platform,
        }

    return {
        "detection_id": threat.detection_id,
        "mention_id": threat.mention_id,
        "threat_type": threat.threat_type,
        "threat_category": threat.threat_category,
        "criticality_level": threat.criticality_level,
        "confidence_score": threat.confidence_score,
        "risk_score": threat.risk_score,
        "matched_keywords": threat.matched_keywords,
        "detection_rules_triggered": threat.detection_rules_triggered,
        "contextual_notes": threat.contextual_notes,
        "detected_at": threat.detected_at,
        "review_status": threat.review_status,
        "last_updated": threat.last_updated,
        "related_mention": related_mention,
    }


@router.get("", response_model=list[ThreatListResponse])
def get_threats(
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    rows = (
        db.query(ThreatDetection)
        .outerjoin(SocialMention, SocialMention.mention_id == ThreatDetection.mention_id)
        .add_entity(SocialMention)
        .order_by(ThreatDetection.detected_at.desc())
        .limit(limit)
        .all()
    )
    return [_map_threat_list_item(threat, mention) for threat, mention in rows]


@router.get("/{threat_id}", response_model=ThreatDetail)
def get_threat(
    threat_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    threat = (
        db.query(ThreatDetection)
        .filter(ThreatDetection.detection_id == threat_id)
        .first()
    )
    if threat is None:
        raise HTTPException(status_code=404, detail="Threat detection not found")

    return threat


@router.patch("/{threat_id}/review", response_model=ThreatDetail)
def review_threat(
    threat_id: int,
    request: ThreatReviewRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    threat = (
        db.query(ThreatDetection)
        .filter(ThreatDetection.detection_id == threat_id)
        .first()
    )
    if threat is None:
        raise HTTPException(status_code=404, detail="Threat detection not found")

    threat.review_status = request.review_status
    threat.review_notes = request.review_notes
    threat.reviewed_by = request.reviewed_by
    threat.remediation_status = request.remediation_status

    if (
        request.reviewed_by is not None
        or request.review_status is not None
        or request.review_notes is not None
    ):
        threat.reviewed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(threat)

    return threat
