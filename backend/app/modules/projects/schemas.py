"""Pydantic schemas cho module projects."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str = ""
    target_duration_sec: int = Field(default=30, ge=1)
    aspect_ratio: str = "9:16"
    resolution: str = "1080x1920"
    fps: int = Field(default=30, ge=1)


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    status: str | None = None
    target_duration_sec: int | None = Field(default=None, ge=1)
    aspect_ratio: str | None = None
    resolution: str | None = None
    fps: int | None = Field(default=None, ge=1)
    thumbnail_path: str | None = None


class DuplicateRequest(BaseModel):
    new_name: str | None = Field(default=None, min_length=1, max_length=200)


class ProjectOut(BaseModel):
    id: int
    name: str
    description: str
    status: str
    target_duration_sec: int
    aspect_ratio: str
    resolution: str
    fps: int
    scene_count: int = 0
    thumbnail_url: str = ""
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
