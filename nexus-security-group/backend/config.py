from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str
    JWT_SECRET_KEY: str
    ADMIN_USER: str
    ADMIN_PASSWORD: str
    N8N_INTERNAL_URL: str = "http://n8n:5678"
    WEBHOOK_SECRET: str = ""
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://localhost"

    model_config = SettingsConfigDict(env_file=".env")

    @model_validator(mode="after")
    def validate_secret_key_length(self):
        if len(self.JWT_SECRET_KEY) < 32:
            raise ValueError("JWT_SECRET_KEY must be at least 32 characters")
        return self


settings = Settings()
