from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str
    JWT_SECRET_KEY: str
    ADMIN_USER: str
    ADMIN_PASSWORD: str
    N8N_INTERNAL_URL: str = "http://n8n:5678"

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()
