import hmac
import logging
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from rate_limit import limiter
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from models import SystemUser
from schemas.auth import Token
from services.activity_audit import record_user_activity

from .passwords import verify_password
from .permissions import ADMIN_PERMISSION_CLAIMS, _permissions_from_user
from .tokens import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    create_access_token,
    get_current_user,
    optional_oauth2_scheme,
)

logger = logging.getLogger("nsg.auth")

router = APIRouter(prefix="/api/auth", tags=["auth"])

ADMIN_USER = settings.ADMIN_USER
ADMIN_PASSWORD = settings.ADMIN_PASSWORD


def _record_auth_activity(
    db: Session,
    *,
    username: str,
    user_role: str | None,
    activity_type: str,
    activity_description: str,
    request: Request | None = None,
    activity_data: dict | None = None,
) -> None:
    """Best-effort auth audit writer that owns auth endpoint commits."""
    try:
        record_user_activity(
            db,
            username=username,
            user_role=user_role,
            activity_type=activity_type,
            activity_description=activity_description,
            request=request,
            activity_data=activity_data,
        )
        db.commit()
    except Exception:
        try:
            db.rollback()
        except Exception:
            logger.warning("Failed to rollback auth activity audit", exc_info=True)
        logger.warning(
            "Failed to record auth activity: username=%s activity_type=%s",
            username,
            activity_type,
            exc_info=True,
        )


@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
async def login_for_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user_id = None
    permissions = []

    try:
        has_db_users = db.query(SystemUser.user_id).first() is not None
        db_user = None
        if has_db_users:
            db_user = db.query(SystemUser).filter(SystemUser.username == form_data.username).first()
    except SQLAlchemyError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service unavailable",
        )

    if has_db_users:
        failure_reason = None
        if not db_user:
            failure_reason = "invalid_credentials"
        elif not db_user.is_active:
            failure_reason = "inactive_user"
        elif not verify_password(form_data.password, db_user.password_hash):
            failure_reason = "invalid_credentials"

        if failure_reason is not None:
            logger.warning("Login failed: user=%s", form_data.username)
            _record_auth_activity(
                db,
                username=form_data.username,
                user_role=None,
                activity_type="login_failed",
                activity_description="Login failed",
                request=request,
                activity_data={"auth_source": "database", "reason": failure_reason},
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        role = db_user.role
        auth_source = "database"
        user_id = db_user.user_id
        permissions = _permissions_from_user(db_user)
    else:
        if not hmac.compare_digest(form_data.username, ADMIN_USER) or not hmac.compare_digest(form_data.password, ADMIN_PASSWORD):
            logger.warning("Login failed: user=%s (bootstrap)", form_data.username)
            _record_auth_activity(
                db,
                username=form_data.username,
                user_role=None,
                activity_type="login_failed",
                activity_description="Login failed",
                request=request,
                activity_data={"auth_source": "bootstrap", "reason": "invalid_credentials"},
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        role = "admin"
        auth_source = "bootstrap"
        permissions = ADMIN_PERMISSION_CLAIMS

    token_data = {"sub": form_data.username, "role": role, "auth_source": auth_source, "permissions": permissions}
    if user_id is not None:
        token_data["user_id"] = user_id

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data=token_data,
        expires_delta=access_token_expires,
    )
    logger.info("Login successful: user=%s source=%s", form_data.username, auth_source)
    _record_auth_activity(
        db,
        username=form_data.username,
        user_role=role,
        activity_type="login_success",
        activity_description="Login successful",
        request=request,
        activity_data={"auth_source": auth_source},
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/logout")
async def logout(
    request: Request,
    token: str | None = Depends(optional_oauth2_scheme),
    db: Session = Depends(get_db),
):
    """Client-side logout acknowledgment. Token invalidation is handled by the
    client clearing stored credentials. Server-side token blacklist is
    documented as future work."""
    if token is not None:
        try:
            current_user = await get_current_user(token=token)
        except HTTPException:
            current_user = None
        if current_user is not None:
            _record_auth_activity(
                db,
                username=current_user.username,
                user_role=current_user.role,
                activity_type="logout",
                activity_description="Logout requested",
                request=request,
                activity_data={"auth_source": current_user.auth_source},
            )
    return {"message": "Logged out successfully"}
