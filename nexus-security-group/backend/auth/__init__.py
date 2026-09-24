"""Authentication package.

Re-exports the public API so that ``from auth import X`` and
``import auth`` continue to work without changing any call-site.
"""

from database import get_db  # noqa: F401 — re-exported for test overrides
from .passwords import hash_password, verify_password  # noqa: F401
from .permissions import (  # noqa: F401
    ADMIN_PERMISSION_CLAIMS,
    require_permission,
)
from .routes import router  # noqa: F401
from .tokens import (  # noqa: F401
    ACCESS_TOKEN_EXPIRE_MINUTES,
    ALGORITHM,
    SECRET_KEY,
    create_access_token,
    get_current_user,
    oauth2_scheme,
    optional_oauth2_scheme,
)
