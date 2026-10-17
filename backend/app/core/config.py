"""Cau hinh ung dung doc tu bien moi truong."""
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_NAME: str = "AI Shorts Studio"
    APP_ENV: str = "dev"
    SECRET_KEY: str = "change-me-generate-a-real-one"
    DATABASE_URL: str = "sqlite:///./data/app.db"
    MEDIA_ROOT: str = "./data/media"
    CORS_ORIGINS: str = "http://localhost:3000"

    MAX_IMAGE_MB: int = 10
    MAX_VIDEO_MB: int = 500
    MAX_AUDIO_MB: int = 50

    DEFAULT_SCENE_SECONDS: int = 20

    SEEDANCE_API_KEY: str = ""
    SEEDANCE_BASE_URL: str = "https://ark.ap-southeast.bytepluses.com/api/v3"
    SEEDANCE_MODEL: str = "dreamina-seedance-2-5-260628"

    WORKER_POLL_SECONDS: int = 5

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def media_root_path(self) -> Path:
        p = Path(self.MEDIA_ROOT)
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def is_sqlite(self) -> bool:
        return self.DATABASE_URL.startswith("sqlite")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
