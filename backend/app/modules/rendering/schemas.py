"""Pydantic schemas cho module rendering."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


# ---------- Timeline ----------

class ClipIn(BaseModel):
    scene_id: int
    sort_order: int = 0
    trim_start_sec: float = 0.0
    trim_end_sec: float = 0.0  # 0 = khong cat cuoi
    transition: str = "cut"  # cut|fade


class TimelineUpdate(BaseModel):
    clips: list[ClipIn] = Field(default_factory=list)


class ClipOut(BaseModel):
    id: int
    scene_id: int
    scene_name: str
    sort_order: int
    trim_start_sec: float
    trim_end_sec: float
    transition: str
    video_url: str = ""
    duration_sec: float = 0.0


# ---------- Audio ----------

class TrackOut(BaseModel):
    id: int
    kind: str
    scene_id: int | None
    label: str
    file_path: str
    audio_url: str = ""
    volume: float
    fade_in_sec: float
    fade_out_sec: float
    start_offset_sec: float

    model_config = {"from_attributes": True}


class TrackUpdate(BaseModel):
    volume: float | None = None
    fade_in_sec: float | None = None
    fade_out_sec: float | None = None
    start_offset_sec: float | None = None
    label: str | None = None


class DialogueAudioOut(BaseModel):
    tracks: list[TrackOut]


# ---------- Subtitles ----------

class SubtitleEntryIn(BaseModel):
    start_sec: float
    end_sec: float
    text: str
    scene_id: int | None = None


class SubtitlesUpdate(BaseModel):
    entries: list[SubtitleEntryIn] = Field(default_factory=list)


class SubtitleOut(BaseModel):
    id: int | None = None  # None = entry tu sinh (preview), chua luu DB
    scene_id: int | None
    sort_order: int
    start_sec: float
    end_sec: float
    text: str

    model_config = {"from_attributes": True}


class SubtitlesOut(BaseModel):
    entries: list[SubtitleOut]
    srt_url: str = ""


# ---------- Render ----------

class RenderRequest(BaseModel):
    resolution: str = "1080x1920"
    fps: int = 30
    burn_subtitles: bool = True
    export_srt: bool = True


class RenderJobOut(BaseModel):
    id: int
    project_id: int
    status: str
    settings: dict
    progress: int
    output_path: str
    srt_path: str
    output_url: str = ""
    srt_url: str = ""
    error: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
