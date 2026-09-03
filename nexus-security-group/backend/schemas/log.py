"""Execution log schemas — ExecutionLogResponse.

Maps to the execution_logs ORM model. duration_seconds is trigger-maintained
(computed when completed_at is set) and included in the Response only.
execution_uuid is server-generated via uuid_generate_v4().
"""
import uuid
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict


ExecutionLogStatus = Literal[
    "success", "partial_success", "error", "warning", "timeout"
]


class ExecutionLogResponse(BaseModel):
    """Full execution log record including trigger-computed duration."""

    model_config = ConfigDict(from_attributes=True)

    log_id: int
    execution_uuid: Optional[uuid.UUID] = None

    workflow_name: str
    execution_id: Optional[str] = None

    status: ExecutionLogStatus

    mentions_collected: Optional[int] = None
    mentions_processed: Optional[int] = None
    detections_generated: Optional[int] = None
    alerts_generated: Optional[int] = None

    started_at: datetime
    completed_at: Optional[datetime] = None
    # Trigger-maintained — computed when completed_at is set
    duration_seconds: Optional[int] = None

    last_updated: Optional[datetime] = None
