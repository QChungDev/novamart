"""Schemas cho module scripts (kich ban + scenes)."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


# ---------- Request ----------

class GenerateScriptRequest(BaseModel):
    project_id: int
    idea: str
    character_ids: list[int] = Field(default_factory=list)
    style: str | None = None
    audience: str | None = None
    target_duration_sec: int = 30
    dialogue_language: str = "vi"


class ScriptUpdate(BaseModel):
    story_text: str | None = None
    status: str | None = None


class SceneUpdate(BaseModel):
    name: str | None = None
    target_duration_sec: int | None = None
    location: str | None = None
    action: str | None = None
    expression: str | None = None
    camera: str | None = None
    dialogue: list[dict[str, Any]] | None = None
    ambient_audio: str | None = None
    video_prompt: str | None = None
    negative_prompt: str | None = None
    reference_image_paths: list[str] | None = None
    status: str | None = None


class ReorderScenesRequest(BaseModel):
    ordered_ids: list[int]


# ---------- Response ----------

class CharacterMini(BaseModel):
    id: int
    name: str
    character_code: str


class SceneOut(BaseModel):
    id: int
    project_id: int
    script_id: int | None
    scene_code: str
    name: str
    sort_order: int
    target_duration_sec: int
    location: str
    action: str
    expression: str
    camera: str
    dialogue: list[dict[str, Any]]
    ambient_audio: str
    video_prompt: str
    negative_prompt: str
    reference_image_paths: list[str]
    status: str
    output_video_path: str
    video_url: str | None = None
    error: str
    characters: list[CharacterMini] = Field(default_factory=list)
    created_at: datetime

    model_config = {"from_attributes": True}


class ScriptOut(BaseModel):
    id: int
    project_id: int
    idea: str
    story_text: str
    style: str
    audience: str
    target_duration_sec: int
    dialogue_language: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class GenerateScriptResponse(BaseModel):
    script: ScriptOut
    scenes: list[SceneOut]


class ProjectScriptResponse(BaseModel):
    script: ScriptOut | None
    scenes: list[SceneOut]
