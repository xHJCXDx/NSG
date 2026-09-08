"""Tests for schemas.threat — ThreatListItem, ThreatDetail, ThreatReviewRequest."""
import pytest
from datetime import datetime, timezone
from unittest.mock import MagicMock
from pydantic import ValidationError


NOW = datetime(2026, 6, 24, 12, 0, 0, tzinfo=timezone.utc)


def _base_threat_fields():
    return {
        "detection_id": 1,
        "mention_id": 10,
        "threat_type": "phishing",
        "criticality_level": "high",
        "confidence_score": 0.9,
        "detected_at": NOW,
        "review_status": "pending",
        "last_updated": NOW,
    }


def test_threat_list_item_importable():
    from schemas.threat import ThreatListItem
    assert ThreatListItem is not None


def test_threat_detail_importable():
    from schemas.threat import ThreatDetail
    assert ThreatDetail is not None


def test_threat_review_request_importable():
    from schemas.threat import ThreatReviewRequest
    assert ThreatReviewRequest is not None


def test_threat_list_item_happy_path():
    from schemas.threat import ThreatListItem
    item = ThreatListItem(**_base_threat_fields())
    assert item.detection_id == 1
    assert item.criticality_level == "high"
    assert item.review_status == "pending"


def test_threat_list_item_invalid_criticality():
    from schemas.threat import ThreatListItem
    fields = _base_threat_fields()
    fields["criticality_level"] = "extreme"
    with pytest.raises(ValidationError):
        ThreatListItem(**fields)


def test_threat_list_item_valid_criticality_levels():
    from schemas.threat import ThreatListItem
    for level in ("low", "medium", "high", "critical"):
        fields = _base_threat_fields()
        fields["criticality_level"] = level
        item = ThreatListItem(**fields)
        assert item.criticality_level == level


def test_threat_list_item_invalid_review_status():
    from schemas.threat import ThreatListItem
    fields = _base_threat_fields()
    fields["review_status"] = "approved"
    with pytest.raises(ValidationError):
        ThreatListItem(**fields)


def test_threat_detail_nullable_fields():
    from schemas.threat import ThreatDetail
    fields = _base_threat_fields()
    fields.update({
        "sentiment_id": None,
        "threat_category": None,
        "risk_score": None,
        "matched_keywords": None,
        "detection_rules_triggered": None,
        "detection_method": None,
        "contextual_notes": None,
        "related_iocs": None,
        "affected_assets": None,
        "potential_impact": None,
        "reviewed_by": None,
        "reviewed_at": None,
        "review_notes": None,
        "actions_taken": None,
        "remediation_status": None,
        "resolution_time": None,
        "escalated": None,
        "escalated_to": None,
        "escalation_time": None,
    })
    detail = ThreatDetail(**fields)
    assert detail.threat_category is None
    assert detail.remediation_status is None


def test_threat_review_request_happy_path():
    from schemas.threat import ThreatReviewRequest
    req = ThreatReviewRequest(review_status="confirmed", review_notes="Verified")
    assert req.review_status == "confirmed"
    assert req.review_notes == "Verified"


def test_threat_review_request_invalid_status():
    from schemas.threat import ThreatReviewRequest
    with pytest.raises(ValidationError):
        ThreatReviewRequest(review_status="approved")


def test_threat_list_item_orm_mode():
    from schemas.threat import ThreatListItem
    mock_orm = MagicMock()
    mock_orm.detection_id = 99
    mock_orm.mention_id = 55
    mock_orm.threat_type = "malware"
    mock_orm.criticality_level = "critical"
    mock_orm.confidence_score = 0.95
    mock_orm.detected_at = NOW
    mock_orm.review_status = "investigating"
    mock_orm.last_updated = NOW
    mock_orm.threat_category = None
    mock_orm.risk_score = None

    result = ThreatListItem.model_validate(mock_orm)
    assert result.detection_id == 99
    assert result.criticality_level == "critical"
