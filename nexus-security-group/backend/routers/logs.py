from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import ExecutionLog
from schemas.log import ExecutionLogResponse


router = APIRouter(prefix="/api/logs", tags=["logs"])


@router.get("", response_model=list[ExecutionLogResponse])
def get_logs(
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return (
        db.query(ExecutionLog)
        .order_by(ExecutionLog.started_at.desc())
        .limit(limit)
        .all()
    )


@router.get("/{log_id}", response_model=ExecutionLogResponse)
def get_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    log = db.query(ExecutionLog).filter(ExecutionLog.log_id == log_id).first()
    if log is None:
        raise HTTPException(status_code=404, detail="Execution log not found")

    return log
