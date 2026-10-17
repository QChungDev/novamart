"""Storage Provider: luu file upload, de dang chuyen sang S3 khi production."""
from __future__ import annotations

import shutil
import uuid
from abc import ABC, abstractmethod
from pathlib import Path

from fastapi import UploadFile

from app.core.config import settings

ALLOWED_IMAGE = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_VIDEO = {"video/mp4", "video/quicktime", "video/webm"}
ALLOWED_AUDIO = {"audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4", "audio/x-m4a", "audio/aac"}


class StorageProvider(ABC):
    @abstractmethod
    def save_upload(self, upload: UploadFile, subdir: str) -> str:
        """Luu file upload, tra ve relative path (vd: 'characters/abc.png')."""

    @abstractmethod
    def abs_path(self, rel_path: str) -> Path:
        """Duong dan tuyet doi cua file."""

    @abstractmethod
    def url_for(self, rel_path: str) -> str:
        """URL public de frontend hien thi/tai."""

    @abstractmethod
    def delete(self, rel_path: str) -> None:
        """Xoa file."""

    @abstractmethod
    def exists(self, rel_path: str) -> bool:
        ...


class LocalStorageProvider(StorageProvider):
    def __init__(self, root: Path | None = None):
        self.root = root or settings.media_root_path

    def _safe_name(self, filename: str | None) -> str:
        ext = Path(filename or "bin").suffix.lower()[:10] or ".bin"
        return f"{uuid.uuid4().hex}{ext}"

    def save_upload(self, upload: UploadFile, subdir: str) -> str:
        dest_dir = self.root / subdir
        dest_dir.mkdir(parents=True, exist_ok=True)
        rel = f"{subdir}/{self._safe_name(upload.filename)}"
        with open(self.root / rel, "wb") as f:
            shutil.copyfileobj(upload.file, f)
        return rel

    def save_bytes(self, data: bytes, subdir: str, filename: str) -> str:
        dest_dir = self.root / subdir
        dest_dir.mkdir(parents=True, exist_ok=True)
        rel = f"{subdir}/{uuid.uuid4().hex}_{filename}"
        (self.root / rel).write_bytes(data)
        return rel

    def abs_path(self, rel_path: str) -> Path:
        return self.root / rel_path

    def url_for(self, rel_path: str) -> str:
        return f"/media/{rel_path}"

    def delete(self, rel_path: str) -> None:
        p = self.abs_path(rel_path)
        if p.is_file():
            p.unlink()

    def exists(self, rel_path: str) -> bool:
        return self.abs_path(rel_path).is_file()


class S3StorageProvider(StorageProvider):
    """Khung S3-compatible. Can boto3 + env: S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY."""

    def __init__(self):
        raise NotImplementedError(
            "S3StorageProvider chua duoc cau hinh. Cai boto3 va thiet lap bien moi truong S3_*."
        )

    def save_upload(self, upload: UploadFile, subdir: str) -> str:  # type: ignore[override]
        raise NotImplementedError

    def abs_path(self, rel_path: str) -> Path:  # type: ignore[override]
        raise NotImplementedError

    def url_for(self, rel_path: str) -> str:  # type: ignore[override]
        raise NotImplementedError

    def delete(self, rel_path: str) -> None:  # type: ignore[override]
        raise NotImplementedError

    def exists(self, rel_path: str) -> bool:  # type: ignore[override]
        raise NotImplementedError


def get_storage() -> StorageProvider:
    return LocalStorageProvider()


def validate_upload(upload: UploadFile, kind: str) -> tuple[bool, str]:
    """Kiem tra loai file va dung luong. Tra (ok, message)."""
    ctype = (upload.content_type or "").lower()
    if kind == "image":
        allowed, max_mb = ALLOWED_IMAGE, settings.MAX_IMAGE_MB
    elif kind == "video":
        allowed, max_mb = ALLOWED_VIDEO, settings.MAX_VIDEO_MB
    elif kind == "audio":
        allowed, max_mb = ALLOWED_AUDIO, settings.MAX_AUDIO_MB
    else:
        return False, f"Loai upload khong hop le: {kind}"
    if ctype not in allowed:
        return False, f"Dinh dang khong ho tro: {ctype or 'unknown'}"
    # Do dung luong bang cach doc stream
    upload.file.seek(0, 2)
    size = upload.file.tell()
    upload.file.seek(0)
    if size > max_mb * 1024 * 1024:
        return False, f"File vuot qua {max_mb}MB"
    if size == 0:
        return False, "File rong"
    return True, "OK"
