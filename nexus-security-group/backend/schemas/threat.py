"""Threat schemas — ThreatListItem, ThreatDetail, ThreatReviewRequest.

Maps to the threat_detections ORM model. last_updated is trigger-maintained
and included only in Response schemas. ThreatReviewRequest is an input-only
schema (no from_attributes needed).
"""
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict


_CriticalityLevel = Literal["low", "medium", "high", "critical"]
_ReviewStatus = Literal[
    "pending", "reviewing", "confirmed", "false_positive", "investigating", "resolved"
]
_RemediationStatus = Literal["none", "in_progress", "completed", "not_required"]


class ThreatListItem(BaseModel):
    """Compact threat representation for list views."""

    model_config = ConfigDict(from_attributes=True)

    detection_id: int
    mention_id: int
    threat_type: str
    threat_category: Optional[str] = None
    criticality_level: _CriticalityLevel
    confidence_score: float
    risk_score: Optional[int] = None
    detected_at: datetime
    review_status: _ReviewStatus
    # Trigger-maintained
    last_updated: Optional[datetime] = None


class ThreatDetail(BaseModel):
    """Full threat detection record including all nullable columns."""

    model_config = ConfigDict(from_attributes=True)

    detection_id: int
    mention_id: int
    sentiment_id: Optional[int] = None

    threat_type: str
    threat_category: Optional[str] = None
    criticality_level: _CriticalityLevel
    confidence_score: float
    risk_score: Optional[int] = None

    matched_keywords: Optional[list[str]] = None
    detection_rules_triggered: Optional[list[str]] = None
    detection_method: Optional[str] = None

    contextual_notes: Optional[str] = None
    related_iocs: Optional[list[str]] = None
    affected_assets: Optional[list[str]] = None
    potential_impact: Optional[str] = None

    detected_at: datetime

    review_status: _ReviewStatus
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    review_notes: Optional[str] = None

    actions_taken: Optional[list[str]] = None
    remediation_status: Optional[_RemediationStatus] = None
    resolution_time: Optional[datetime] = None

    escalated: Optional[bool] = None
    escalated_to: Optional[str] = None
    escalation_time: Optional[datetime] = None

    # Trigger-maintained
    last_updated: Optional[datetime] = None


class ThreatReviewRequest(BaseModel):
    """Input schema for reviewing / updating a threat detection.

    No from_attributes — this is a request body, not an ORM response.
    """

    review_status: _ReviewStatus
    review_notes: Optional[str] = None
    reviewed_by: Optional[str] = None
    remediation_status: Optional[_RemediationStatus] = None
