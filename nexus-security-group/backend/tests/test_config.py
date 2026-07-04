"""Tests for backend/config.py — Settings class and singleton."""
import ast
import os
from pathlib import Path


def test_settings_default_database_url():
    """Settings() uses the hardcoded default when no env var is set."""
    # Ensure DATABASE_URL is NOT in env for this test
    env_backup = os.environ.pop("DATABASE_URL", None)
    try:
        from config import Settings
        s = Settings()
        assert s.DATABASE_URL == "postgresql://REDACTED_USER:REDACTED_PASSWORD@localhost:5432/osint_db"
    finally:
        if env_backup is not None:
            os.environ["DATABASE_URL"] = env_backup


def test_settings_env_var_override(monkeypatch):
    """Settings() picks up DATABASE_URL from the environment."""
    expected = "postgresql://user:pass@host:5432/mydb"
    monkeypatch.setenv("DATABASE_URL", expected)

    # Force re-instantiation (module-level singleton is already set, test Settings directly)
    from config import Settings
    s = Settings()
    assert s.DATABASE_URL == expected


def test_settings_dotenv_override(tmp_path, monkeypatch):
    """Settings() reads DATABASE_URL from a .env file when no env var is set."""
    expected = "postgresql://user:pass@dotenv:5432/envdb"
    env_file = tmp_path / ".env"
    env_file.write_text(f"DATABASE_URL={expected}\n")

    monkeypatch.delenv("DATABASE_URL", raising=False)

    from config import Settings
    from pydantic_settings import SettingsConfigDict
    # Create a Settings subclass pointing at our tmp .env
    class TestSettings(Settings):
        model_config = SettingsConfigDict(env_file=str(env_file))

    s = TestSettings()
    assert s.DATABASE_URL == expected


def test_settings_singleton_importable():
    """from config import settings does not raise ImportError or ValidationError."""
    from config import settings  # noqa: F401 — import is the test
    assert settings.DATABASE_URL is not None
    assert isinstance(settings.DATABASE_URL, str)


def test_config_no_internal_imports():
    """config.py must not import from any internal backend module."""
    config_path = Path(__file__).parent.parent / "config.py"
    source = config_path.read_text()
    tree = ast.parse(source)

    internal_modules = {
        "database", "auth", "routers", "models", "schemas", "main"
    }

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                root = alias.name.split(".")[0]
                assert root not in internal_modules, (
                    f"config.py imports internal module '{alias.name}'"
                )
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                root = node.module.split(".")[0]
                assert root not in internal_modules, (
                    f"config.py imports from internal module '{node.module}'"
                )


# --- Tests for Paso B (backend-config-migrate) ---


def test_jwt_secret_key_default(monkeypatch):
    """Settings().JWT_SECRET_KEY equals the hardcoded default when no env var is set."""
    monkeypatch.delenv("JWT_SECRET_KEY", raising=False)
    from config import Settings
    s = Settings()
    assert s.JWT_SECRET_KEY == "REDACTED_JWT_SECRET"


def test_jwt_secret_key_env_override(monkeypatch):
    """Settings() picks up JWT_SECRET_KEY from the environment."""
    monkeypatch.setenv("JWT_SECRET_KEY", "my-prod-secret")
    from config import Settings
    s = Settings()
    assert s.JWT_SECRET_KEY == "my-prod-secret"


def test_admin_user_password_defaults(monkeypatch):
    """Settings().ADMIN_USER and ADMIN_PASSWORD equal their hardcoded defaults."""
    monkeypatch.delenv("ADMIN_USER", raising=False)
    monkeypatch.delenv("ADMIN_PASSWORD", raising=False)
    from config import Settings
    s = Settings()
    assert s.ADMIN_USER == "admin"
    assert s.ADMIN_PASSWORD == "REDACTED_PASSWORD"


def test_admin_credentials_env_override(monkeypatch):
    """Settings() picks up ADMIN_USER and ADMIN_PASSWORD from the environment."""
    monkeypatch.setenv("ADMIN_USER", "ops")
    monkeypatch.setenv("ADMIN_PASSWORD", "s3cr3t")
    from config import Settings
    s = Settings()
    assert s.ADMIN_USER == "ops"
    assert s.ADMIN_PASSWORD == "s3cr3t"


def test_n8n_internal_url_default(monkeypatch):
    """Settings().N8N_INTERNAL_URL equals the hardcoded default when no env var is set."""
    monkeypatch.delenv("N8N_INTERNAL_URL", raising=False)
    from config import Settings
    s = Settings()
    assert s.N8N_INTERNAL_URL == "http://n8n:5678"


def test_n8n_internal_url_env_override(monkeypatch):
    """Settings() picks up N8N_INTERNAL_URL from the environment."""
    monkeypatch.setenv("N8N_INTERNAL_URL", "http://n8n-prod:5678")
    from config import Settings
    s = Settings()
    assert s.N8N_INTERNAL_URL == "http://n8n-prod:5678"
