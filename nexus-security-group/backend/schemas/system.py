"""System info schemas."""

from pydantic import BaseModel


class SystemInfoResponse(BaseModel):
    """Static metadata about the NSG platform."""

    name: str
    version: str
    description: str
    stack: list[str]
