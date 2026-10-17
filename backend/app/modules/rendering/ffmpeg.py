"""Helper sync cho ffprobe/ffmpeg. Loi deu dich sang tieng Viet."""
from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path


def _bin(name: str) -> str:
    path = shutil.which(name)
    if not path:
        raise RuntimeError(
            f"Không tìm thấy {name} trên hệ thống. Hãy cài đặt FFmpeg để render video."
        )
    return path


def probe(path: str | Path) -> dict:
    """Doc metadata video/audio: {duration, width, height, fps, has_audio}.

    Raise RuntimeError (tieng Viet) neu file khong doc duoc.
    """
    p = Path(path)
    if not p.is_file():
        raise RuntimeError(f"Không tìm thấy file để probe: {p}")
    cmd = [
        _bin("ffprobe"),
        "-v", "error",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        str(p),
    ]
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=60, check=True)
    except subprocess.TimeoutExpired as e:
        raise RuntimeError(f"ffprobe timeout khi đọc file: {p.name}") from e
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"ffprobe không đọc được file {p.name}: {(e.stderr or '')[:300]}") from e
    try:
        data = json.loads(out.stdout or "{}")
    except json.JSONDecodeError as e:
        raise RuntimeError(f"ffprobe trả về dữ liệu không hợp lệ cho {p.name}") from e

    fmt = data.get("format") or {}
    streams = data.get("streams") or []
    video = next((s for s in streams if s.get("codec_type") == "video"), None)
    audio = next((s for s in streams if s.get("codec_type") == "audio"), None)

    duration = 0.0
    try:
        duration = float(fmt.get("duration") or (video or {}).get("duration") or 0)
    except (TypeError, ValueError):
        duration = 0.0

    fps = 0.0
    if video:
        for key in ("avg_frame_rate", "r_frame_rate"):
            raw = video.get(key) or ""
            if "/" in str(raw):
                try:
                    num, den = str(raw).split("/", 1)
                    if float(den) != 0:
                        fps = float(num) / float(den)
                        break
                except (ValueError, ZeroDivisionError):
                    continue

    return {
        "duration": duration,
        "width": int((video or {}).get("width") or 0),
        "height": int((video or {}).get("height") or 0),
        "fps": fps,
        "has_audio": audio is not None,
    }


def run(cmd: list[str], timeout: int = 3600) -> str:
    """Chay lenh ffmpeg, check=True. Loi -> RuntimeError voi stderr rut gon."""
    label = " ".join(cmd[:2])
    try:
        proc = subprocess.run(
            cmd, capture_output=True, text=True, timeout=timeout, check=True
        )
        return proc.stdout or ""
    except subprocess.TimeoutExpired as e:
        raise RuntimeError(f"{label}: quá thời gian xử lý (timeout {timeout}s)") from e
    except subprocess.CalledProcessError as e:
        stderr = (e.stderr or "").strip()
        # Lay vai dong cuoi co y nghia, bo log dai dong
        tail = "\n".join(stderr.splitlines()[-8:])[:1500]
        raise RuntimeError(f"{label} thất bại (exit {e.returncode}):\n{tail}") from e
    except FileNotFoundError as e:
        raise RuntimeError(
            "Không tìm thấy ffmpeg trên hệ thống. Hãy cài đặt FFmpeg để render video."
        ) from e
