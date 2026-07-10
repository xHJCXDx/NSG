"""Shared test configuration.

The application intentionally requires runtime secrets through environment
variables. Tests provide safe, fake values here so importing application modules
does not depend on local developer credentials.
"""
import os


os.environ.setdefault("DATABASE_URL", "postgresql://test-user:test-password@localhost:5432/osint_db")
os.environ.setdefault("JWT_SECRET_KEY", "test-jwt-secret")
os.environ.setdefault("ADMIN_USER", "test-admin")
os.environ.setdefault("ADMIN_PASSWORD", "test-admin-password")

# Some focused router tests install lightweight auth stubs with
# `sys.modules.setdefault("auth", auth_stub)`. Preloading the real auth module
# after test env setup prevents those stubs from leaking into tests that import
# the full FastAPI app from `main` and expect `/api/auth/login` to exist.
import auth  # noqa: F401, E402
