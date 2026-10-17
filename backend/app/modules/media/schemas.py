"""Pydantic schemas cho module media."""
from __future__ import annotations

from pydantic import BaseModel


class MediaUploadOut(BaseModel):
    id: int
    url: str
    file_path: str
    mime: str
    size_bytes: int
    width: int = 0
    height: int = 0
    duration_sec: float = 0.0
