"""Dashboard composition schemas."""

from pydantic import BaseModel, ConfigDict


class DashboardSummaryResponse(BaseModel):
    """Small aggregate summary for the dashboard landing view."""

    model_config = ConfigDict(from_attributes=True)

    total_threats: int
    pending_threats: int
    total_alerts: int
    unacknowledged_alerts: int
    active_keywords: int
    execution_logs_count: int
    activity_count: int
