from fastapi import APIRouter

from schemas.system import SystemInfoResponse

router = APIRouter(prefix="/api/system", tags=["system"])

_SYSTEM_INFO = SystemInfoResponse(
    name="Nexus Security Group",
    version="1.0.0",
    description="OSINT monitoring and threat detection platform",
    stack=["FastAPI", "React", "PostgreSQL", "n8n", "Traefik"],
)


@router.get("/info", response_model=SystemInfoResponse)
def get_system_info() -> SystemInfoResponse:
    return _SYSTEM_INFO
