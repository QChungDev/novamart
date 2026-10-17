"""Manual Mode: khong goi API nao.

Nguoi dung tu tao video ben ngoai (vd bang Muse AI tren web) theo
prompt-pack ma he thong xuat ra, roi upload file MP4 tro lai dung scene.
"""
from __future__ import annotations

from app.database.models import Scene
from app.modules.video_generation.providers.base import VideoProvider


class ManualImportProvider(VideoProvider):
    """Provider gia lap cho quy trinh thu cong."""

    def capabilities(self) -> dict:
        return {
            "reference_images": False,  # nguoi dung tu xu ly anh tham chieu ben ngoai
            "max_seconds": 10,
            "audio_input": False,
            "cancel": False,
            "manual": True,
        }

    async def check_connection(self) -> tuple[bool, str]:
        return True, "Manual mode không cần API — xuất prompt và upload video thủ công"

    async def submit_scene(
        self, scene: Scene, ref_image_paths: list[str], prompt_pack: dict
    ) -> str:
        # KHONG goi mang. Tra task id gia de worker danh dau cho upload.
        return f"manual-{scene.id}"

    async def poll_task(self, task_id: str) -> dict:
        return {"status": "queued", "progress": 0}

    async def cancel_task(self, task_id: str) -> bool:
        return True

    async def download_result(self, video_url: str, dest_path: str) -> None:
        raise RuntimeError("Manual mode không tải tự động — hãy upload file MP4 cho scene")
