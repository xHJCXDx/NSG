from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import Alert, ExecutionLog, KeywordMonitor, ThreatDetection, UserActivity
from schemas.dashboard import DashboardSummaryResponse


router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return {
        "total_threats": db.query(ThreatDetection).count() or 0,
        "pending_threats": db.query(ThreatDetection)
        .filter(ThreatDetection.review_status == "pending")
        .count()
        or 0,
        "total_alerts": db.query(Alert).count() or 0,
        "unacknowledged_alerts": db.query(Alert)
        .filter(Alert.acknowledged.is_(False))
        .count()
        or 0,
        "active_keywords": db.query(KeywordMonitor)
        .filter(KeywordMonitor.is_active.is_(True))
        .count()
        or 0,
        "execution_logs_count": db.query(ExecutionLog).count() or 0,
        "activity_count": db.query(UserActivity).count() or 0,
    }
