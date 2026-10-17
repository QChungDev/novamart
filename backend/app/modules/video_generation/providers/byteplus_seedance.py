"""Adapter cho API CHINH THUC BytePlus ModelArk (model Seedance).

GHI CHU QUAN TRONG:
- Endpoint duoi day theo tai lieu BytePlus ModelArk hien hanh tai thoi diem viet code:
    POST {base_url}/contents/generations/tasks
        body: {model, prompt, image_urls?, duration?, size?} -> {id}
    GET  {base_url}/contents/generations/tasks/{id}
        -> {status, content: {video_url}, error}
    DELETE {base_url}/contents/generations/tasks/{id}  (huy task)
- Neu BytePlus doi path trong tuong lai, KHONG sua code: cau hinh lai
  `base_url` (va `options`) trong ProviderConfiguration la du.
- Auth: header `Authorization: Bearer <api_key>` (api_key duoc giai ma
  tu config.api_key_enc).
- base_url mac dinh: https://ark.ap-southeast.bytepluses.com/api/v3
  (co the doi sang region khac, vd Beijing: https://ark.cn-beijing.volces.com/api/v3).
- model mac dinh: dreamina-seedance-2-5-260628 (cau hinh qua config.model).
- Luu y: image_urls can la URL cong khai ma BytePlus doc duoc. Neu anh
  tham chieu chi luu local, hay cau hinh options["image_base_url"] de map
  sang URL public; neu khong co, adapter se bo qua image_urls.
"""
from __future__ import annotations

import httpx

from app.core.security import decrypt_secret
from app.database.models import ProviderConfiguration, Scene
from app.modules.video_generation.providers.base import VideoProvider

DEFAULT_BASE_URL = "https://ark.ap-southeast.bytepluses.com/api/v3"
DEFAULT_MODEL = "dreamina-seedance-2-5-260628"
# Seedance 2.5 (xac minh qua docs.byteplus.com, docs.sogni.ai, 17/10/2026):
# - duration [4,30] giay / lan goi (toi da 30s, khong phai 15s cua 2.0)
# - toi da 30 anh tham chieu / lan goi (2.0 chi 9 anh), tong 50 item da phuong thuc
MIN_DURATION_SEC = 4
MAX_DURATION_SEC = 30
MAX_REF_IMAGES = 30


class BytePlusSeedanceAdapter(VideoProvider):
    def __init__(self, config: ProviderConfiguration):
        super().__init__(config)
        self.base_url = (config.base_url or DEFAULT_BASE_URL).rstrip("/")
        self.api_key = decrypt_secret(config.api_key_enc or "")
        self.model = config.model or DEFAULT_MODEL

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def capabilities(self) -> dict:
        return {
            "reference_images": True,
            "max_reference_images": MAX_REF_IMAGES,
            "max_seconds": MAX_DURATION_SEC,
            "audio_input": False,
            "cancel": True,
        }

    async def check_connection(self) -> tuple[bool, str]:
        """Kiem tra mang toi duoc BytePlus + da co API key.

        Luu y trung thuc: day chi la kiem tra reachability, khong phai
        xac thuc day du vi ModelArk khong co endpoint ping chinh thuc.
        """
        if not self.api_key:
            return False, "Chưa cấu hình API key cho BytePlus"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(self.base_url)
            return True, (
                f"Kết nối tới BytePlus OK (HTTP {resp.status_code}). "
                "Lưu ý: đây chỉ kiểm tra mạng, chưa xác thực API key."
            )
        except Exception as e:  # noqa: BLE001
            return False, f"Không kết nối được tới BytePlus: {e}"

    def _image_urls(self, prompt_pack: dict) -> list[str]:
        """Map duong dan anh local sang URL public neu co image_base_url."""
        base = (self.config.options or {}).get("image_base_url", "").rstrip("/")
        if not base:
            return []
        urls: list[str] = []
        rels = (prompt_pack or {}).get("reference_image_rels", [])
        for rel in rels[:MAX_REF_IMAGES]:
            urls.append(f"{base}/{rel.lstrip('/')}")
        return urls

    async def submit_scene(
        self, scene: Scene, ref_image_paths: list[str], prompt_pack: dict
    ) -> str:
        if not self.api_key:
            raise RuntimeError("Chưa cấu hình API key cho BytePlus")
        options = self.config.options or {}
        duration = max(MIN_DURATION_SEC, min(int(scene.target_duration_sec or 20), MAX_DURATION_SEC))
        body: dict = {
            "model": self.model,
            "prompt": (prompt_pack or {}).get("video_prompt") or scene.video_prompt,
            "duration": duration,
            "size": options.get("size", "720x1280"),
        }
        image_urls = self._image_urls(prompt_pack or {})
        if image_urls:
            body["image_urls"] = image_urls
        url = f"{self.base_url}/contents/generations/tasks"
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(url, headers=self._headers(), json=body)
        except Exception as e:  # noqa: BLE001
            raise RuntimeError(f"Không gửi được yêu cầu tới BytePlus: {e}") from e
        if resp.status_code not in (200, 201, 202):
            raise RuntimeError(
                f"BytePlus từ chối yêu cầu (HTTP {resp.status_code}): "
                f"{resp.text[:500]}"
            )
        try:
            data = resp.json()
        except Exception as e:  # noqa: BLE001
            raise RuntimeError(f"BytePlus trả về không phải JSON: {resp.text[:300]}") from e
        task_id = data.get("id")
        if not task_id:
            raise RuntimeError(f"BytePlus không trả về task id: {str(data)[:300]}")
        return str(task_id)

    async def poll_task(self, task_id: str) -> dict:
        url = f"{self.base_url}/contents/generations/tasks/{task_id}"
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.get(url, headers=self._headers())
        except Exception as e:  # noqa: BLE001
            raise RuntimeError(f"Không poll được trạng thái BytePlus: {e}") from e
        if resp.status_code == 404:
            return {"status": "failed", "error": "Task không tồn tại trên BytePlus (404)"}
        if resp.status_code != 200:
            raise RuntimeError(
                f"Poll BytePlus lỗi (HTTP {resp.status_code}): {resp.text[:300]}"
            )
        data = resp.json()
        raw = str(data.get("status", "")).lower()
        content = data.get("content") or {}
        err = data.get("error")
        if isinstance(err, dict):
            err = err.get("message") or str(err)
        result: dict = {"progress": data.get("progress", 0)}
        if raw == "succeeded":
            result["status"] = "succeeded"
            result["video_url"] = content.get("video_url")
            if not result["video_url"]:
                result["status"] = "failed"
                result["error"] = "BytePlus báo succeeded nhưng thiếu video_url"
        elif raw in ("failed",):
            result["status"] = "failed"
            result["error"] = str(err or "Tạo video thất bại")
        elif raw in ("cancelled", "canceled"):
            result["status"] = "cancelled"
        elif raw in ("queued", "pending"):
            result["status"] = "queued"
        else:  # running, processing, ...
            result["status"] = "processing"
        return result

    async def cancel_task(self, task_id: str) -> bool:
        url = f"{self.base_url}/contents/generations/tasks/{task_id}"
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.delete(url, headers=self._headers())
            return resp.status_code in (200, 202, 204)
        except Exception:  # noqa: BLE001
            return False
