"""Voice service: danh sach giong edge-tts (cache 1h) + tong hop giong noi."""
from __future__ import annotations

import asyncio
import time

import edge_tts

# Giong mac dinh tieng Viet
DEFAULT_VOICE_FEMALE = "vi-VN-HoaiMyNeural"
DEFAULT_VOICE_MALE = "vi-VN-NamMinhNeural"

_VOICES_CACHE: dict[str, tuple[float, list[dict]]] = {}
_VOICES_TTL_SEC = 3600


def list_edge_tts_voices(language: str = "vi-VN") -> list[dict]:
    """Lay danh sach giong edge-tts theo locale, cache trong memory 1 gio."""
    now = time.time()
    cached = _VOICES_CACHE.get(language)
    if cached and now - cached[0] < _VOICES_TTL_SEC:
        return cached[1]
    try:
        voices = asyncio.run(edge_tts.list_voices())
    except Exception as e:
        raise RuntimeError(f"Không thể lấy danh sách giọng đọc từ dịch vụ TTS: {e}")
    result = []
    for v in voices:
        if (v.get("Locale") or "") != language:
            continue
        result.append({
            "voice_id": v.get("ShortName") or "",
            "name": v.get("FriendlyName") or v.get("DisplayName") or v.get("ShortName") or "",
            "gender": (v.get("Gender") or "").lower(),
            "locale": v.get("Locale") or "",
        })
    result.sort(key=lambda x: x["voice_id"])
    _VOICES_CACHE[language] = (now, result)
    return result


def synthesize_speech(text: str, voice_id: str, rate: float, pitch: float, dest_path: str) -> str:
    """Tong hop giong noi thanh file mp3.

    rate: 1.0 -> "+0%", 1.1 -> "+10%".  pitch: 1.0 -> "+0Hz", moi 0.1 = 5Hz.
    """
    if not text or not text.strip():
        raise ValueError("Văn bản thoại không được để trống.")
    if not voice_id:
        raise ValueError("Chưa chọn giọng đọc (provider_voice_id).")
    rate_str = f"{(rate - 1) * 100:+.0f}%"
    pitch_str = f"{(pitch - 1) * 50:+.0f}Hz"
    communicate = edge_tts.Communicate(text.strip(), voice_id, rate=rate_str, pitch=pitch_str)
    try:
        asyncio.run(communicate.save(dest_path))
    except Exception as e:
        raise RuntimeError(f"Tạo giọng nói thất bại: {e}")
    return dest_path
