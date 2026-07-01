from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    app_name: str = "SkillHub API"
    debug: bool = True

    # SQLite by default — no Postgres needed
    database_url: str = "sqlite+aiosqlite:///./skillhub.db"

    # Local file storage — no MinIO needed
    upload_dir: str = "./uploads"

    # CORS — comma-separated list of allowed origins
    allowed_origins: str = "http://localhost:5173,http://localhost:3000"

    # Auth
    secret_key: str = "dev-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7

    # Upload limits
    max_upload_mb: int = 10

    @property
    def async_database_url(self) -> str:
        url = self.database_url
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
