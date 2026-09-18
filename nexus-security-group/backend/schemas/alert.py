"""Alert schemas — AlertResponse.

Maps to the alerts ORM model. alert_uuid is a server-generated UUID
(uuid-ossp extension). last_updated is trigger-maintained and included
only in Response schemas.
"""
import uuid
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict


AlertSeverity = Literal["info", "warning", "high", "critical"]
AlertDeliveryStatus = Literal["pending", "sent", "delivered", "failed"]


class AlertResponse(BaseModel):
    """Full alert record including trigger-maintained fields."""

    model_config = ConfigDict(from_attributes=True)

    alert_id: int
    detection_id: int
    alert_uuid: Optional[uuid.UUID] = None

    alert_title: str
    alert_message: str
    alert_severity: AlertSeverity

    channels_sent: Optional[list[str]] = None
    slack_channel: Optional[str] = None

    created_at: datetime
    sent_at: Optional[datetime] = None
    delivery_status: AlertDeliveryStatus

    acknowledged: bool
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None

    # Trigger-maintained
    last_updated: Optional[datetime] = None


