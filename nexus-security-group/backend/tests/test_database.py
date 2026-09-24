"""Tests for backend/database.py — Base, engine, SessionLocal, get_db."""
import inspect
from pathlib import Path


def test_base_is_importable():
    """Base must be importable and be a SQLAlchemy declarative base."""
    from database import Base
    # declarative_base() returns a class whose metaclass is DeclarativeMeta
    # (in modern SQLAlchemy the type may vary; check the canonical attribute)
    assert hasattr(Base, "metadata"), "Base must have a 'metadata' attribute (DeclarativeMeta)"
    assert hasattr(Base, "__subclasses__"), "Base must be a class"


def test_engine_url_matches_settings():
    """engine must be bound to settings.DATABASE_URL."""
    from database import engine
    from config import settings

    # SQLAlchemy engine exposes the URL via engine.url
    # render_as_string(hide_password=False) returns the full URL including the password
    assert engine.url.render_as_string(hide_password=False) == settings.DATABASE_URL


def test_database_has_no_os_import():
    """database.py must not contain 'import os'."""
    db_path = Path(__file__).parent.parent / "database.py"
    source = db_path.read_text()
    assert "import os" not in source, (
        "database.py still contains 'import os' — remove it"
    )


def test_session_local_importable():
    """SessionLocal must be importable from database."""
    from database import SessionLocal  # noqa: F401
    assert SessionLocal is not None


def test_get_db_yields_and_closes():
    """get_db must yield a session and close it on exit."""
    from database import get_db
    gen = get_db()
    session = next(gen)
    # Session must have a 'close' method (i.e. it's a real SQLAlchemy session)
    assert hasattr(session, "close"), "get_db must yield an object with a close() method"
    # Exhaust the generator (triggers the finally block)
    try:
        next(gen)
    except StopIteration:
        pass  # expected
