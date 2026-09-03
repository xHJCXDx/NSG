"""Tests for schemas.log — ExecutionLogResponse."""
import pytest
import uuid
from datetime import datetime, timezone
from unittest.mock import MagicMock
from pydantic import ValidationError


NOW = datetime(2026, 6, 24, 12, 0, 0, tzinfo=timezone.utc)
TEST_UUID = uuid.uuid4()


def _base_log_fields():
    return {
        "log_id": 1,
        "execution_uuid": TEST_UUID,
        "workflow_name": "threat_detection",
        "status": "success",
        "mentions_collected": 100,
        "mentions_processed": 98,
        "detections_generated": 5,
        "alerts_generated": 2,
        "started_at": NOW,
        "last_updated": NOW,
    }


def test_execution_log_response_importable():
    from schemas.log import ExecutionLogResponse
    assert ExecutionLogResponse is not None


def test_execution_log_response_happy_path():
    from schemas.log import ExecutionLogResponse
    resp = ExecutionLogResponse(**_base_log_fields())
    assert resp.log_id == 1
    assert resp.status == "success"
    assert resp.workflow_name == "threat_detection"


def test_execution_log_response_invalid_status():
    from schemas.log import ExecutionLogResponse
    fields = _base_log_fields()
    fields["status"] = "running"
    with pytest.raises(ValidationError):
        ExecutionLogResponse(**fields)


def test_execution_log_response_valid_statuses():
    from schemas.log import ExecutionLogResponse
    for status in ("success", "partial_success", "error", "warning", "timeout"):
        fields = _base_log_fields()
        fields["status"] = status
        resp = ExecutionLogResponse(**fields)
        assert resp.status == status


def test_execution_log_response_nullable_fields():
    from schemas.log import ExecutionLogResponse
    fields = _base_log_fields()
    fields.update({
        "execution_id": None,
        "completed_at": None,
        "duration_seconds": None,
    })
    resp = ExecutionLogResponse(**fields)
    assert resp.duration_seconds is None
    assert resp.completed_at is None


def test_execution_log_response_trigger_duration_present():
    """duration_seconds is trigger-maintained — must be in Response schema."""
    from schemas.log import ExecutionLogResponse
    assert "duration_seconds" in ExecutionLogResponse.model_fields


def test_execution_log_response_uuid_field():
    """execution_uuid must be typed as uuid.UUID."""
    from schemas.log import ExecutionLogResponse
    fields = _base_log_fields()
    resp = ExecutionLogResponse(**fields)
    assert isinstance(resp.execution_uuid, uuid.UUID)


def test_execution_log_response_orm_mode():
    from schemas.log import ExecutionLogResponse
    mock_orm = MagicMock()
    mock_orm.log_id = 42
    mock_orm.execution_uuid = TEST_UUID
    mock_orm.workflow_name = "alert_pipeline"
    mock_orm.execution_id = None
    mock_orm.status = "error"
    mock_orm.mentions_collected = 0
    mock_orm.mentions_processed = 0
    mock_orm.detections_generated = 0
    mock_orm.alerts_generated = 0
    mock_orm.started_at = NOW
    mock_orm.completed_at = NOW
    mock_orm.duration_seconds = 45
    mock_orm.last_updated = NOW

    result = ExecutionLogResponse.model_validate(mock_orm)
    assert result.log_id == 42
    assert result.status == "error"
    assert result.duration_seconds == 45
