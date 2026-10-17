"""Pydantic schemas cho module characters."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class CharacterCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    character_code: str = ""
    description: str = ""
    appearance: str = ""
    colors: str = ""
    outfit: str = ""
    accessories: str = ""
    body_ratio: str = ""
    art_style: str = ""
    lock_rules: dict = Field(default_factory=dict)
    default_voice_profile_id: int | None = None


class CharacterUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    character_code: str | None = None
    description: str | None = None
    appearance: str | None = None
    colors: str | None = None
    outfit: str | None = None
    accessories: str | None = None
    body_ratio: str | None = None
    art_style: str | None = None
    lock_rules: dict | None = None
    default_voice_profile_id: int | None = None


class CharacterImageOut(BaseModel):
    id: int
    character_id: int
    file_path: str
    image_url: str = ""
    is_primary: bool
    sort_order: int

    model_config = {"from_attributes": True}


class CharacterOut(BaseModel):
    id: int
    name: str
    character_code: str
    description: str
    appearance: str
    colors: str
    outfit: str
    accessories: str
    body_ratio: str
    art_style: str
    lock_rules: dict
    default_voice_profile_id: int | None
    primary_image_url: str = ""
    image_count: int = 0
    voice_name: str = ""
    created_at: datetime
    images: list[CharacterImageOut] = []

    model_config = {"from_attributes": True}


class LockPromptOut(BaseModel):
    prompt: str
