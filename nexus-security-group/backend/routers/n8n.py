import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse

from auth import require_permission
from config import settings
from schemas.auth import TokenData

router = APIRouter(prefix="/api/n8n", tags=["n8n"])

N8N_URL = settings.N8N_INTERNAL_URL


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
                    "Content-Type": request.headers.get("Content-Type", "application/json")
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
        return JSONResponse(content=payload, status_code=response.status_code)

    return Response(
        content=response.content,
        status_code=response.status_code,
        media_type=content_type or None,
    )
