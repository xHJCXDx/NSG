import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from models import SystemUser
from schemas.auth import TokenData

from .permissions import _permissions_from_payload

logger = logging.getLogger("nsg.auth")

SECRET_KEY = settings.JWT_SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
optional_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


BOOTSTRAP_AUTH_SOURCE = "bootstrap"


def _ensure_user_is_active(db: Session, token_data: TokenData, credentials_exception: HTTPException) -> None:
    """Reject the request when the token's user no longer exists or is inactive.

    The token is checked on every request, not only at login (§8.5.2; A.3,
    rule 3). The bootstrap administrator has no database row: its token is
    valid only while system_users is empty, the same condition under which the
    bootstrap login is allowed (auth/routes.py).
    """
    try:
        if token_data.auth_source == BOOTSTRAP_AUTH_SOURCE:
            if db.query(SystemUser.user_id).first() is not None:
                logger.warning("Token rejected: bootstrap token used after database users exist")
                raise credentials_exception
            return
        query = db.query(SystemUser)
        if token_data.user_id is not None:
            query = query.filter(SystemUser.user_id == token_data.user_id)
        else:
            query = query.filter(func.lower(SystemUser.username) == token_data.username.lower())
        db_user = query.first()
    except SQLAlchemyError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service unavailable",
        )
    if db_user is None or not db_user.is_active:
        logger.warning("Token rejected: user=%s is missing or inactive", token_data.username)
        raise credentials_exception


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    # Plain def: the active-user lookup is blocking database I/O, so FastAPI must
    # run this dependency in its threadpool instead of on the event loop.
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(
            username=username,
            user_id=payload.get("user_id"),
            role=payload.get("role"),
            auth_source=payload.get("auth_source"),
            permissions=_permissions_from_payload(payload),
        )
    except InvalidTokenError:
        logger.warning("Invalid token presented")
        raise credentials_exception
    _ensure_user_is_active(db, token_data, credentials_exception)
    return token_data
