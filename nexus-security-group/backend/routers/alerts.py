from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from auth import get_current_user, require_permission
from database import get_db
from models import Alert
from schemas.alert import AcknowledgeRequest, AlertDeliveryStatus, AlertResponse
from schemas.auth import TokenData


router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("", response_model=list[AlertResponse])
def get_alerts(
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
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

    return query.order_by(Alert.created_at.desc()).limit(limit).all()


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
    request: AcknowledgeRequest,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    alert = db.query(Alert).filter(Alert.alert_id == alert_id).first()
    if alert is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found",
        )

    alert.acknowledged = True
    alert.acknowledged_by = request.acknowledged_by
    alert.acknowledged_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(alert)

    return alert
