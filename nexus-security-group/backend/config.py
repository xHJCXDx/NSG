from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://REDACTED_USER:REDACTED_PASSWORD@localhost:5432/osint_db"
    JWT_SECRET_KEY: str = "REDACTED_JWT_SECRET"
    ADMIN_USER: str = "admin"
    ADMIN_PASSWORD: str = "REDACTED_PASSWORD"
    N8N_INTERNAL_URL: str = "http://n8n:5678"

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()
