from fastapi import APIRouter, Depends, HTTPException, Request
import httpx
from auth import get_current_user
from config import settings

router = APIRouter(prefix="/api/n8n", tags=["n8n"])

N8N_URL = settings.N8N_INTERNAL_URL

@router.post("/webhook/{webhook_id}")
async def proxy_webhook(webhook_id: str, request: Request, current_user=Depends(get_current_user)):
    body = await request.body()
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{N8N_URL}/webhook/{webhook_id}",
                content=body,
                headers={"Content-Type": request.headers.get("Content-Type", "application/json")}
            )
            return response.json()
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
