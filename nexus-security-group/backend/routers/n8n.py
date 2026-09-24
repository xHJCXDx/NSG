import hashlib
import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from auth import require_permission
from config import settings
from database import get_db
from schemas.auth import TokenData
from services.activity_audit import record_user_activity

router = APIRouter(prefix="/api/n8n", tags=["n8n"])

N8N_URL = settings.N8N_INTERNAL_URL
logger = logging.getLogger("nsg.n8n")


@router.post(
    "/webhook/{webhook_id}",
    responses={
        200: {"description": "Payload returned by the n8n workflow."},
        401: {"description": "Missing or invalid bearer token."},
        502: {"description": "n8n could not be reached."},
    },
)
async def proxy_webhook(
    webhook_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_permission("workflows", "execute")),
):
    """Protected passthrough proxy for n8n webhooks.

    n8n workflow responses are intentionally passed through instead of forcing a
    local Pydantic response_model: webhook payloads are workflow-owned and can be
    JSON or non-JSON depending on the automation being triggered.
    """
    body = await request.body()
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{N8N_URL}/webhook/{webhook_id}",
                content=body,
                headers={
                    "Content-Type": request.headers.get("Content-Type", "application/json"),
                    **({"X-Webhook-Secret": settings.WEBHOOK_SECRET} if settings.WEBHOOK_SECRET else {}),
                },
            )
        except httpx.HTTPError:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="n8n workflow service unavailable",
            )

    content_type = response.headers.get("content-type", "")
    if "application/json" in content_type.lower():
        try:
            payload = response.json()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="n8n workflow returned invalid JSON",
            )
        _record_successful_workflow_execution(db, current_user, webhook_id, request, response.status_code)
        return JSONResponse(content=payload, status_code=response.status_code)

    _record_successful_workflow_execution(db, current_user, webhook_id, request, response.status_code)
    return Response(
        content=response.content,
        status_code=response.status_code,
        media_type=content_type or None,
    )


def _record_successful_workflow_execution(
    db: Session,
    current_user: TokenData,
    webhook_id: str,
    request: Request,
    response_status_code: int,
) -> None:
    if response_status_code >= 400:
        return

    webhook_ref = _safe_webhook_ref(webhook_id)
    try:
        record_user_activity(
            db,
            username=current_user.username or "unknown",
            user_role=current_user.role,
            activity_type="execute_workflow",
            activity_description=f"Executed workflow webhook ref={webhook_ref}",
            request=request,
            activity_data={
                "webhook_ref": webhook_ref,
                "response_status_code": response_status_code,
            },
        )
        db.commit()
    except Exception:
        try:
            db.rollback()
        except Exception:
            logger.warning("Failed to rollback n8n activity audit", exc_info=True)
        logger.warning(
            "Failed to record n8n activity audit: username=%s response_status_code=%s",
            current_user.username or "unknown",
            response_status_code,
            exc_info=True,
        )


def _safe_webhook_ref(webhook_id: str) -> str:
    return hashlib.sha256(webhook_id.encode("utf-8")).hexdigest()[:12]
