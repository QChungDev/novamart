"""ABC cho moi video provider adapter.

Moi adapter phai cai dat day du: kiem tra ket noi, kha nang ho tro,
gui scene, poll trang thai, huy task va tai ket qua ve.
"""
from __future__ import annotations

from abc import ABC, abstractmethod

import httpx

from app.database.models import ProviderConfiguration, Scene


class VideoProvider(ABC):
    """Giao dien chuan hoa cho dich vu tao video."""

    def __init__(self, config: ProviderConfiguration):
        self.config = config

    @abstractmethod
    async def check_connection(self) -> tuple[bool, str]:
        """Kiem tra ket noi toi provider. Tra (ok, message tieng Viet)."""

    @abstractmethod
    def capabilities(self) -> dict:
        """Kha nang ho tro, vd: {reference_images, max_seconds, audio_input, cancel, manual}."""

    @abstractmethod
    async def submit_scene(
        self, scene: Scene, ref_image_paths: list[str], prompt_pack: dict
    ) -> str:
        """Gui 1 scene di tao video. Tra ve provider_task_id."""

    @abstractmethod
    async def poll_task(self, task_id: str) -> dict:
        """Poll trang thai task.

        Tra ve dict:
          {status: "queued"|"processing"|"succeeded"|"failed"|"cancelled",
           video_url?: str, error?: str, progress?: int}
        """

    @abstractmethod
    async def cancel_task(self, task_id: str) -> bool:
        """Huy task neu provider ho tro. Tra True neu huy thanh cong."""

    async def download_result(self, video_url: str, dest_path: str) -> None:
        """Tai video ket qua ve dest_path (duong dan tuyet doi).

        Validate content-type la video, timeout 10 phut, stream theo chunk
        de khong ton RAM voi file lon.
        """
        if not video_url:
            raise ValueError("Thiếu video_url để tải kết quả")
        try:
            async with httpx.AsyncClient(timeout=600.0, follow_redirects=True) as client:
                async with client.stream("GET", video_url) as resp:
                    if resp.status_code != 200:
                        raise RuntimeError(
                            f"Tải video thất bại: HTTP {resp.status_code}"
                        )
                    ctype = (resp.headers.get("content-type") or "").lower()
                    if ctype and not ctype.startswith("video/"):
                        raise RuntimeError(
                            f"URL trả về không phải video (content-type: {ctype})"
                        )
                    total = 0
                    with open(dest_path, "wb") as f:
                        async for chunk in resp.aiter_bytes(chunk_size=1024 * 256):
                            if chunk:
                                f.write(chunk)
                                total += len(chunk)
                    if total == 0:
                        raise RuntimeError("File video tải về rỗng (0 bytes)")
        except (RuntimeError, ValueError):
            raise
        except Exception as e:  # noqa: BLE001
            raise RuntimeError(f"Lỗi khi tải video: {e}") from e
