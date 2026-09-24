"""Shared test configuration.

The application intentionally requires runtime secrets through environment
variables. Tests provide safe, fake values here so importing application modules
does not depend on local developer credentials.
"""
import os


os.environ.setdefault("DATABASE_URL", "postgresql://test-user:test-password@localhost:5432/osint_db")
os.environ.setdefault("JWT_SECRET_KEY", "test-jwt-secret-that-is-at-least-32-characters-long")
os.environ.setdefault("ADMIN_USER", "test-admin")
os.environ.setdefault("ADMIN_PASSWORD", "test-admin-password")

# Some focused router tests install lightweight auth stubs with
# `sys.modules.setdefault("auth", auth_stub)`. Preloading the real auth module
# after test env setup prevents those stubs from leaking into tests that import
# the full FastAPI app from `main` and expect `/api/auth/login` to exist.
import auth  # noqa: F401, E402

# Disable rate limiting during tests to prevent 429 responses when multiple
# login tests run in rapid succession.
from rate_limit import limiter  # noqa: E402
limiter.enabled = False


# ---------------------------------------------------------------------------
# Shared test doubles for SQLAlchemy query chain mocking.
#
# Covers the standard pattern used by most router tests. Specialized tests
# (metrics, dashboard, permissions) that need scalar/count/dispatch keep
# their own variants.
# ---------------------------------------------------------------------------

class FakeQuery:
    def __init__(self, all_result=None, first_result=None):
        self.all_result = all_result or []
        self.first_result = first_result
        self.filter_args = []
        self.order_by_args = None
        self.offset_value = None
        self.limit_value = None
        self.outerjoin_args = None
        self.add_entity_args = None

    def filter(self, *args):
        self.filter_args.append(args)
        return self

    def order_by(self, *args):
        self.order_by_args = args
        return self

    def offset(self, value):
        self.offset_value = value
        return self

    def limit(self, value):
        self.limit_value = value
        return self

    def outerjoin(self, *args):
        self.outerjoin_args = args
        return self

    def add_entity(self, *args):
        self.add_entity_args = args
        return self

    def with_entities(self, *args):
        return self

    def scalar(self):
        return len(self.all_result)

    def all(self):
        return self.all_result

    def first(self):
        return self.first_result


class FakeDb:
    """Fake SQLAlchemy session.

    Pass a single FakeQuery to always return the same object for every
    ``db.query()`` call (original behaviour).  Pass a list of FakeQuery
    objects to return them in order — first call gets index 0, second gets
    index 1, etc.  Once the list is exhausted the last element is reused.
    """

    def __init__(self, query, commit_exception=None):
        if isinstance(query, list):
            self._query_list = query
        else:
            self._query_list = [query]
        self.query_args = []
        self.added = []
        self.deleted = []
        self.committed = False
        self.rolled_back = False
        self.refreshed = []
        self.commit_exception = commit_exception

    @property
    def query_obj(self):
        """Return the first (or only) query object for back-compat."""
        return self._query_list[0]

    def query(self, *args):
        self.query_args.append(args)
        idx = len(self.query_args) - 1
        if idx < len(self._query_list):
            return self._query_list[idx]
        return self._query_list[-1]

    def add(self, obj):
        self.added.append(obj)

    def delete(self, obj):
        self.deleted.append(obj)

    def commit(self):
        if self.commit_exception:
            raise self.commit_exception
        self.committed = True

    def rollback(self):
        self.rolled_back = True

    def refresh(self, obj):
        self.refreshed.append(obj)
