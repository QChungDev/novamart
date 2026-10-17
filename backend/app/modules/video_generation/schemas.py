"""Pydantic schemas cho module video_generation."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class ProviderCreate(BaseModel):
    provider_type: str = "video"
    name: str
    adapter: str = "manual"
    base_url: str = ""
    api_key: str = ""
    model: str = ""
    options: dict = Field(default_factory=dict)


class ProviderUpdate(BaseModel):
    name: str | None = None
    adapter: str | None = None
    base_url: str | None = None
    api_key: str | None = None
    model: str | None = None
    options: dict | None = None
    is_active: bool | None = None


class ProviderOut(BaseModel):
    id: int
    provider_type: str
    name: str
    adapter: str
    base_url: str
    model: str
    api_key_set: bool
    capabilities: dict
    is_active: bool

    model_config = {"from_attributes": True}


class ProviderTestOut(BaseModel):
    ok: bool
    message: str
    capabilities: dict | None = None


class GenerateRequest(BaseModel):
    scene_ids: list[int] | None = None


class JobOut(BaseModel):
    id: int
    scene_id: int
    provider_config_id: int | None
    provider_task_id: str
    status: str
    attempts: int
    max_attempts: int
    progress: int
    error: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class GenerateOut(BaseModel):
    jobs: list[JobOut]


class PromptPackOut(BaseModel):
    video_prompt: str
    negative_prompt: str
    reference_image_urls: list[str]
    characters: list[dict]
    scene_info: dict
