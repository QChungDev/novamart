"""Tat ca DB models. Dung kieu du lieu portable (SQLite dev / PostgreSQL prod)."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


def _now() -> datetime:
    return datetime.utcnow()


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(30), default="draft")  # draft|generating|ready_to_edit|rendering|completed
    target_duration_sec: Mapped[int] = mapped_column(Integer, default=30)
    aspect_ratio: Mapped[str] = mapped_column(String(10), default="9:16")
    resolution: Mapped[str] = mapped_column(String(20), default="1080x1920")
    fps: Mapped[int] = mapped_column(Integer, default=30)
    thumbnail_path: Mapped[str] = mapped_column(String(500), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now)

    script: Mapped["Script | None"] = relationship(back_populates="project", cascade="all, delete-orphan", uselist=False)
    scenes: Mapped[list["Scene"]] = relationship(back_populates="project", cascade="all, delete-orphan", order_by="Scene.sort_order")


class Character(Base):
    __tablename__ = "characters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    character_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)  # vd: MOC_001
    description: Mapped[str] = mapped_column(Text, default="")
    appearance: Mapped[str] = mapped_column(Text, default="")
    colors: Mapped[str] = mapped_column(String(500), default="")
    outfit: Mapped[str] = mapped_column(String(500), default="")
    accessories: Mapped[str] = mapped_column(String(500), default="")
    body_ratio: Mapped[str] = mapped_column(String(200), default="")
    art_style: Mapped[str] = mapped_column(String(500), default="")
    lock_rules: Mapped[dict] = mapped_column(JSON, default=dict)
    default_voice_profile_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("voice_profiles.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    images: Mapped[list["CharacterReferenceImage"]] = relationship(
        back_populates="character", cascade="all, delete-orphan", order_by="CharacterReferenceImage.sort_order"
    )


class CharacterReferenceImage(Base):
    __tablename__ = "character_reference_images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    character_id: Mapped[int] = mapped_column(Integer, ForeignKey("characters.id", ondelete="CASCADE"), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    character: Mapped["Character"] = relationship(back_populates="images")


class VoiceProfile(Base):
    __tablename__ = "voice_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    character_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("characters.id", ondelete="SET NULL"), nullable=True)
    gender: Mapped[str] = mapped_column(String(30), default="")  # male|female|other
    language: Mapped[str] = mapped_column(String(20), default="vi-VN")
    accent: Mapped[str] = mapped_column(String(50), default="")  # Bac|Nam|...
    pitch: Mapped[float] = mapped_column(Float, default=1.0)
    rate: Mapped[float] = mapped_column(Float, default=1.0)
    tone: Mapped[str] = mapped_column(String(50), default="")
    provider: Mapped[str] = mapped_column(String(50), default="edge_tts")
    provider_voice_id: Mapped[str] = mapped_column(String(200), default="")
    sample_path: Mapped[str] = mapped_column(String(500), default="")
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class Script(Base):
    __tablename__ = "scripts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, unique=True)
    idea: Mapped[str] = mapped_column(Text, default="")
    story_text: Mapped[str] = mapped_column(Text, default="")
    style: Mapped[str] = mapped_column(String(200), default="")
    audience: Mapped[str] = mapped_column(String(200), default="")
    target_duration_sec: Mapped[int] = mapped_column(Integer, default=30)
    dialogue_language: Mapped[str] = mapped_column(String(10), default="vi")
    status: Mapped[str] = mapped_column(String(30), default="draft")  # draft|confirmed
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    project: Mapped["Project"] = relationship(back_populates="script")


class Scene(Base):
    __tablename__ = "scenes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    script_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("scripts.id", ondelete="SET NULL"), nullable=True)
    scene_code: Mapped[str] = mapped_column(String(20), default="")  # SCENE_01
    name: Mapped[str] = mapped_column(String(200), default="")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    target_duration_sec: Mapped[int] = mapped_column(Integer, default=10)
    location: Mapped[str] = mapped_column(String(500), default="")
    action: Mapped[str] = mapped_column(Text, default="")
    expression: Mapped[str] = mapped_column(String(500), default="")
    camera: Mapped[str] = mapped_column(String(500), default="")
    dialogue: Mapped[list] = mapped_column(JSON, default=list)  # [{character_id, character_name, text, voice_profile_id}]
    ambient_audio: Mapped[str] = mapped_column(String(500), default="")
    video_prompt: Mapped[str] = mapped_column(Text, default="")
    negative_prompt: Mapped[str] = mapped_column(Text, default="")
    reference_image_paths: Mapped[list] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String(30), default="draft")  # draft|queued|generating|ready|failed
    output_video_path: Mapped[str] = mapped_column(String(500), default="")
    error: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    project: Mapped["Project"] = relationship(back_populates="scenes")
    characters: Mapped[list["SceneCharacter"]] = relationship(back_populates="scene", cascade="all, delete-orphan")


class SceneCharacter(Base):
    __tablename__ = "scene_characters"
    __table_args__ = (UniqueConstraint("scene_id", "character_id", name="uq_scene_character"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    scene_id: Mapped[int] = mapped_column(Integer, ForeignKey("scenes.id", ondelete="CASCADE"), nullable=False)
    character_id: Mapped[int] = mapped_column(Integer, ForeignKey("characters.id", ondelete="CASCADE"), nullable=False)

    scene: Mapped["Scene"] = relationship(back_populates="characters")
    character: Mapped["Character"] = relationship()


class GenerationJob(Base):
    __tablename__ = "generation_jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    scene_id: Mapped[int] = mapped_column(Integer, ForeignKey("scenes.id", ondelete="CASCADE"), nullable=False, index=True)
    provider_config_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("provider_configurations.id", ondelete="SET NULL"), nullable=True)
    provider_task_id: Mapped[str] = mapped_column(String(200), default="")
    status: Mapped[str] = mapped_column(String(30), default="queued")  # queued|processing|succeeded|failed|cancelled
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    max_attempts: Mapped[int] = mapped_column(Integer, default=3)
    progress: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now)


class MediaAsset(Base):
    __tablename__ = "media_assets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    kind: Mapped[str] = mapped_column(String(20), default="image")  # image|video|audio
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    mime: Mapped[str] = mapped_column(String(100), default="")
    size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    width: Mapped[int] = mapped_column(Integer, default=0)
    height: Mapped[int] = mapped_column(Integer, default=0)
    duration_sec: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class TimelineClip(Base):
    __tablename__ = "timeline_clips"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    scene_id: Mapped[int] = mapped_column(Integer, ForeignKey("scenes.id", ondelete="CASCADE"), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    trim_start_sec: Mapped[float] = mapped_column(Float, default=0.0)
    trim_end_sec: Mapped[float] = mapped_column(Float, default=0.0)  # 0 = khong cat cuoi
    transition: Mapped[str] = mapped_column(String(20), default="cut")  # cut|fade


class AudioTrack(Base):
    __tablename__ = "audio_tracks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    kind: Mapped[str] = mapped_column(String(20), default="dialogue")  # dialogue|ambient|music|sfx
    scene_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("scenes.id", ondelete="CASCADE"), nullable=True)
    label: Mapped[str] = mapped_column(String(200), default="")
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    volume: Mapped[float] = mapped_column(Float, default=1.0)
    fade_in_sec: Mapped[float] = mapped_column(Float, default=0.0)
    fade_out_sec: Mapped[float] = mapped_column(Float, default=0.0)
    start_offset_sec: Mapped[float] = mapped_column(Float, default=0.0)


class SubtitleEntry(Base):
    __tablename__ = "subtitle_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    scene_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("scenes.id", ondelete="CASCADE"), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    start_sec: Mapped[float] = mapped_column(Float, default=0.0)
    end_sec: Mapped[float] = mapped_column(Float, default=0.0)
    text: Mapped[str] = mapped_column(Text, default="")


class RenderJob(Base):
    __tablename__ = "render_jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(30), default="queued")  # queued|processing|succeeded|failed|cancelled
    settings: Mapped[dict] = mapped_column(JSON, default=dict)
    progress: Mapped[int] = mapped_column(Integer, default=0)
    output_path: Mapped[str] = mapped_column(String(500), default="")
    srt_path: Mapped[str] = mapped_column(String(500), default="")
    error: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now)


class ProviderConfiguration(Base):
    __tablename__ = "provider_configurations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    provider_type: Mapped[str] = mapped_column(String(20), default="video")  # video|tts|llm
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    adapter: Mapped[str] = mapped_column(String(50), default="manual")  # byteplus_seedance|generic|manual
    base_url: Mapped[str] = mapped_column(String(500), default="")
    api_key_enc: Mapped[str] = mapped_column(Text, default="")
    model: Mapped[str] = mapped_column(String(200), default="")
    options: Mapped[dict] = mapped_column(JSON, default=dict)
    capabilities: Mapped[dict] = mapped_column(JSON, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
