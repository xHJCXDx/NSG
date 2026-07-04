"""Auth schemas — Token and TokenData.

These were previously defined inline in auth.py and have been extracted here
to keep schema definitions separate from business logic.
"""
from typing import Optional

from pydantic import BaseModel


class Token(BaseModel):
    """JWT access token response."""

    access_token: str
    token_type: str


class TokenData(BaseModel):
    """Decoded token payload."""

    username: Optional[str] = None
