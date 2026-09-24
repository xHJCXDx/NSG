import logging
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from auth import require_permission

logger = logging.getLogger("nsg.alerts")
from database import get_db
from models import Alert
from schemas.alert import AlertDeliveryStatus, AlertResponse
from schemas.auth import TokenData
from services.activity_audit import record_user_activity


router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("", response_model=list[AlertResponse])
def get_alerts(
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    delivery_status: Annotated[AlertDeliveryStatus | None, Query()] = None,
    acknowledged: Annotated[bool | None, Query()] = None,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_permission("alerts", "read")),
):
    query = db.query(Alert)

    if delivery_status is not None:
        query = query.filter(Alert.delivery_status == delivery_status)
    if acknowledged is not None:
        query = query.filter(Alert.acknowledged == acknowledged)

    return query.order_by(Alert.created_at.desc()).offset(offset).limit(limit).all()


@router.get("/{alert_id}", response_model=AlertResponse)
def get_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_permission("alerts", "read")),
):
    alert = db.query(Alert).filter(Alert.alert_id == alert_id).first()
    if alert is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found",
        )

    return alert


@router.patch("/{alert_id}/acknowledge", response_model=AlertResponse)
def acknowledge_alert(
    alert_id: int,
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_permission("alerts", "write")),
):
    alert = db.query(Alert).filter(Alert.alert_id == alert_id).first()
    if alert is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found",
        )

    alert.acknowledged = True
    alert.acknowledged_by = current_user.username
    alert.acknowledged_at = datetime.now(timezone.utc)
    record_user_activity(
        db,
        username=current_user.username or "unknown",
        user_role=getattr(current_user, "role", None),
        activity_type="acknowledge_alert",
        activity_description=f"Acknowledged alert #{alert_id}",
        related_alert_id=alert_id,
        request=request,
        activity_data={"alert_id": alert_id},
    )

    db.commit()
    db.refresh(alert)
    logger.info("Alert acknowledged: id=%s by %s", alert_id, current_user.username)

    return alert
