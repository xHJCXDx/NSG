from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from auth import require_permission
from database import get_db
from models import ExecutionLog
from schemas.auth import TokenData
from schemas.log import ExecutionLogResponse, ExecutionLogStatus


router = APIRouter(prefix="/api/logs", tags=["logs"])


@router.get("", response_model=list[ExecutionLogResponse])
def get_logs(
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    log_status: Annotated[ExecutionLogStatus | None, Query(alias="status")] = None,
    workflow_name: Annotated[str | None, Query(min_length=1, max_length=100)] = None,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_permission("logs", "read")),
):
    query = db.query(ExecutionLog)

    if log_status is not None:
        query = query.filter(ExecutionLog.status == log_status)
    if workflow_name is not None:
        query = query.filter(ExecutionLog.workflow_name == workflow_name)

    return query.order_by(ExecutionLog.started_at.desc()).limit(limit).all()


@router.get("/{log_id}", response_model=ExecutionLogResponse)
def get_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_permission("logs", "read")),
):
    log = db.query(ExecutionLog).filter(ExecutionLog.log_id == log_id).first()
    if log is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Execution log not found",
        )

    return log
