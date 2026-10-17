"""Logic upload file chung cho module media."""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

from fastapi import UploadFile
from PIL import Image
from sqlalchemy.orm import Session

from app.core.storage import get_storage
from app.database.models import MediaAsset, Project


def _probe_media(path: Path) -> tuple[float, int, int]:
    """Dung ffprobe lay (duration_sec, width, height). Loi -> (0.0, 0, 0), khong crash."""
    try:
        proc = subprocess.run(
            [
                "ffprobe",
                "-v", "error",
                "-show_entries", "format=duration",
                "-show_entries", "stream=width,height",
                "-of", "json",
                str(path),
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )
        data = json.loads(proc.stdout or "{}")
        duration = float(data.get("format", {}).get("duration") or 0.0)
        width, height = 0, 0
        for stream in data.get("streams", []):
            if stream.get("width"):
                width = int(stream["width"])
                height = int(stream.get("height") or 0)
                break
        return duration, width, height
    except Exception:
        return 0.0, 0, 0


def _image_size(path: Path) -> tuple[int, int]:
    try:
        with Image.open(path) as im:
            return int(im.width), int(im.height)
    except Exception:
        return 0, 0


def upload_media(
    db: Session, file: UploadFile, kind: str, project_id: int | None
) -> MediaAsset:
    """Luu file upload, trich metadata, luu MediaAsset. Gia dinh file da duoc validate."""
    if project_id is not None and db.get(Project, project_id) is None:
        raise ValueError("Không tìm thấy dự án")

    storage = get_storage()
    rel_path = storage.save_upload(file, f"uploads/{kind}s")
    abs_path = storage.abs_path(rel_path)

    width, height, duration = 0, 0, 0.0
    if kind == "image":
        width, height = _image_size(abs_path)
    elif kind in ("video", "audio"):
        duration, width, height = _probe_media(abs_path)

    asset = MediaAsset(
        project_id=project_id,
        kind=kind,
        file_path=rel_path,
        mime=file.content_type or "",
        size_bytes=abs_path.stat().st_size if abs_path.is_file() else 0,
        width=width,
        height=height,
        duration_sec=duration,
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


def media_out_dict(asset: MediaAsset) -> dict:
    return {
        "id": asset.id,
        "url": get_storage().url_for(asset.file_path),
        "file_path": asset.file_path,
        "mime": asset.mime,
        "size_bytes": asset.size_bytes,
        "width": asset.width,
        "height": asset.height,
        "duration_sec": asset.duration_sec,
    }
