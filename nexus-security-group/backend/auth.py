import base64
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from config import settings

from database import get_db
from models import SystemUser
from schemas.auth import Token, TokenData

SECRET_KEY = settings.JWT_SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

router = APIRouter(prefix="/api/auth", tags=["auth"])
PASSWORD_HASH_SCHEME = "pbkdf2_sha256"
PASSWORD_HASH_ITERATIONS = 600_000

ADMIN_USER = settings.ADMIN_USER
ADMIN_PASSWORD = settings.ADMIN_PASSWORD

ADMIN_PERMISSION_CLAIMS = [
    "alerts:read",
    "alerts:write",
    "dashboard:read",
    "keywords:delete",
    "keywords:read",
    "keywords:write",
    "logs:read",
    "mentions:read",
    "metrics:read",
    "permissions:read",
    "permissions:write",
    "threats:read",
    "threats:write",
    "users:delete",
    "users:read",
    "users:write",
    "workflows:execute",
    "workflows:read",
]


def hash_password(password: str) -> str:
    salt = secrets.token_urlsafe(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        PASSWORD_HASH_ITERATIONS,
    )
    encoded_digest = base64.b64encode(digest).decode("ascii")
    return f"{PASSWORD_HASH_SCHEME}${PASSWORD_HASH_ITERATIONS}${salt}${encoded_digest}"


def verify_password(plain_password: str, password_hash: str) -> bool:
    if password_hash.startswith(("$2a$", "$2b$", "$2y$")):
        try:
            return bcrypt.checkpw(plain_password.encode("utf-8"), password_hash.encode("utf-8"))
        except ValueError:
            return False

    try:
        scheme, iterations, salt, encoded_digest = password_hash.split("$", 3)
    except ValueError:
        return False

    if scheme != PASSWORD_HASH_SCHEME:
        return False

    try:
        iterations_value = int(iterations)
    except ValueError:
        return False

    digest = hashlib.pbkdf2_hmac(
        "sha256",
        plain_password.encode("utf-8"),
        salt.encode("utf-8"),
        iterations_value,
    )
    candidate_digest = base64.b64encode(digest).decode("ascii")
    return hmac.compare_digest(candidate_digest, encoded_digest)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def _normalize_permission(resource: str, action: str) -> str:
    return f"{resource.strip().lower()}:{action.strip().lower()}"


def _serialize_permissions(permissions) -> list[str]:
    serialized_permissions = set()
    try:
        permission_items = iter(permissions or [])
    except TypeError:
        return []

    for permission in permission_items:
        resource = getattr(permission, "resource", None)
        action = getattr(permission, "action", None)
        if not isinstance(resource, str) or not isinstance(action, str):
            continue
        normalized_permission = _normalize_permission(resource, action)
        if normalized_permission != ":":
            serialized_permissions.add(normalized_permission)
    return sorted(serialized_permissions)


def _permissions_from_user(db_user: SystemUser) -> list[str]:
    try:
        return _serialize_permissions(getattr(db_user, "permissions", []))
    except SQLAlchemyError:
        return []


def _permissions_from_payload(payload: dict) -> list[str]:
    permissions = payload.get("permissions")
    if not isinstance(permissions, list):
        return []
    return [permission for permission in permissions if isinstance(permission, str)]


async def get_current_user(token: str = Depends(oauth2_scheme)):
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
    except JWTError:
        raise credentials_exception
    return token_data


def require_permission(resource: str, action: str):
    required_permission = _normalize_permission(resource, action)

    def permission_dependency(current_user: TokenData = Depends(get_current_user)):
        if required_permission not in current_user.permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission required: {required_permission}",
            )
        return current_user

    permission_dependency.required_permission = required_permission
    return permission_dependency


@router.post("/login", response_model=Token)
async def login_for_access_token(
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
        if not db_user or not db_user.is_active or not verify_password(form_data.password, db_user.password_hash):
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
        if form_data.username != ADMIN_USER or form_data.password != ADMIN_PASSWORD:
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
    return {"access_token": access_token, "token_type": "bearer"}
