"""Tests for schemas.alert — AlertResponse and AcknowledgeRequest."""
import pytest
import uuid
from datetime import datetime, timezone
from unittest.mock import MagicMock
from pydantic import ValidationError


NOW = datetime(2026, 6, 24, 12, 0, 0, tzinfo=timezone.utc)
TEST_UUID = uuid.uuid4()


def _base_alert_fields():
    return {
        "alert_id": 1,
        "detection_id": 5,
        "alert_uuid": TEST_UUID,
        "alert_title": "Critical Threat Detected",
        "alert_message": "High criticality threat found",
        "alert_severity": "critical",
        "created_at": NOW,
        "delivery_status": "pending",
        "acknowledged": False,
        "last_updated": NOW,
    }


def test_alert_response_importable():
    from schemas.alert import AlertResponse
    assert AlertResponse is not None


def test_acknowledge_request_importable():
    from schemas.alert import AcknowledgeRequest
    assert AcknowledgeRequest is not None


def test_alert_response_happy_path():
    from schemas.alert import AlertResponse
    resp = AlertResponse(**_base_alert_fields())
    assert resp.alert_id == 1
    assert resp.alert_severity == "critical"
    assert resp.acknowledged is False


def test_alert_response_invalid_severity():
    from schemas.alert import AlertResponse
    fields = _base_alert_fields()
    fields["alert_severity"] = "unknown"
    with pytest.raises(ValidationError):
        AlertResponse(**fields)


def test_alert_response_valid_severities():
    from schemas.alert import AlertResponse
    for severity in ("info", "warning", "high", "critical"):
        fields = _base_alert_fields()
        fields["alert_severity"] = severity
        resp = AlertResponse(**fields)
        assert resp.alert_severity == severity


def test_alert_response_invalid_delivery_status():
    from schemas.alert import AlertResponse
    fields = _base_alert_fields()
    fields["delivery_status"] = "bounced"
    with pytest.raises(ValidationError):
        AlertResponse(**fields)


def test_alert_response_valid_delivery_statuses():
    from schemas.alert import AlertResponse
    for status in ("pending", "sent", "delivered", "failed"):
        fields = _base_alert_fields()
        fields["delivery_status"] = status
        resp = AlertResponse(**fields)
        assert resp.delivery_status == status


def test_alert_response_nullable_fields():
    from schemas.alert import AlertResponse
    fields = _base_alert_fields()
    fields.update({
        "alert_uuid": None,
        "channels_sent": None,
        "slack_channel": None,
        "sent_at": None,
        "acknowledged_by": None,
        "acknowledged_at": None,
    })
    resp = AlertResponse(**fields)
    assert resp.alert_uuid is None
    assert resp.channels_sent is None


def test_alert_response_trigger_columns_present():
    """last_updated must be present (trigger-maintained column) in Response."""
    from schemas.alert import AlertResponse
    resp = AlertResponse(**_base_alert_fields())
    assert resp.last_updated == NOW


def test_acknowledge_request_happy_path():
    from schemas.alert import AcknowledgeRequest
    req = AcknowledgeRequest(acknowledged_by="admin")
    assert req.acknowledged_by == "admin"


def test_alert_response_orm_mode():
    from schemas.alert import AlertResponse
    mock_orm = MagicMock()
    mock_orm.alert_id = 7
    mock_orm.detection_id = 3
    mock_orm.alert_uuid = TEST_UUID
    mock_orm.alert_title = "Threat Alert"
    mock_orm.alert_message = "Detected threat"
    mock_orm.alert_severity = "high"
    mock_orm.created_at = NOW
    mock_orm.delivery_status = "sent"
    mock_orm.acknowledged = True
    mock_orm.last_updated = NOW
    mock_orm.channels_sent = None
    mock_orm.slack_channel = None
    mock_orm.sent_at = None
    mock_orm.acknowledged_by = "admin"
    mock_orm.acknowledged_at = NOW

    result = AlertResponse.model_validate(mock_orm)
    assert result.alert_id == 7
    assert result.alert_severity == "high"
    assert result.last_updated == NOW
