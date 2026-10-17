"""Schemas cho module voices (VoiceProfile + TTS)."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class VoiceProfileCreate(BaseModel):
    name: str
    character_id: int | None = None
    gender: str = ""
    language: str = "vi-VN"
    accent: str = ""
    pitch: float = 1.0
    rate: float = 1.0
    tone: str = ""
    provider: str = "edge_tts"
    provider_voice_id: str
    is_default: bool = False


class VoiceProfileUpdate(BaseModel):
    name: str | None = None
    character_id: int | None = None
    gender: str | None = None
    language: str | None = None
    accent: str | None = None
    pitch: float | None = None
    rate: float | None = None
    tone: str | None = None
    provider: str | None = None
    provider_voice_id: str | None = None
    is_default: bool | None = None


class VoiceProfileOut(BaseModel):
    id: int
    name: str
    character_id: int | None
    character_name: str | None = None
    gender: str
    language: str
    accent: str
    pitch: float
    rate: float
    tone: str
    provider: str
    provider_voice_id: str
    sample_url: str | None = None
    is_default: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class PreviewRequest(BaseModel):
    provider_voice_id: str
    text: str = "Xin chào, tôi là trợ lý giọng nói."
    rate: float = 1.0
    pitch: float = 1.0


class PreviewResponse(BaseModel):
    audio_url: str


class AssignRequest(BaseModel):
    character_id: int
    voice_profile_id: int


class TtsVoice(BaseModel):
    voice_id: str
    name: str
    gender: str
    locale: str
