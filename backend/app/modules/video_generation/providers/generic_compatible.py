"""Adapter cho provider ben thu ba TUONG THICH, cau hinh hoan toan qua options.

Cac options ho tro (luu trong ProviderConfiguration.options):
  submit_url: str            - URL gui yeu cau tao video (bat buoc)
  submit_method: str          - "POST" (mac dinh) hoac "PUT"
  submit_body: dict           - body mac dinh gop them (optional)
  status_url_template: str   - vd "https://api/x/tasks/{task_id}" (bat buoc)
  task_id_field: str          - field lay task id tu response submit ("id" mac dinh, hoac "task_id")
  status_field: str           - field trang thai trong response status ("status" mac dinh)
  status_map: dict            - {"succeeded": [...], "failed": [...]} cac gia tri status tuong ung
  video_url_field: str        - field lay video url, ho tro nested "content.video_url"
  progress_field: str         - field tien do (optional)
  auth_header: str            - template header auth, vd "Authorization: Bearer {api_key}"
  capabilities: dict          - ghi de capabilities mac dinh (optional)
"""
from __future__ import annotations

import httpx

from app.core.security import decrypt_secret
from app.database.models import Scene
from app.modules.video_generation.providers.base import VideoProvider


def _nested_get(data: dict, dotted: str):
    cur: object = data
    for part in (dotted or "").split("."):
        if isinstance(cur, dict):
            cur = cur.get(part)
        else:
            return None
    return cur


class GenericCompatibleAdapter(VideoProvider):
    def __init__(self, config):
        super().__init__(config)
        self.options = config.options or {}
        self.api_key = decrypt_secret(config.api_key_enc or "")

    def capabilities(self) -> dict:
        caps = {
            "reference_images": True,
            "max_seconds": 10,
            "audio_input": False,
            "cancel": True,
        }
        caps.update(self.options.get("capabilities", {}) or {})
        return caps

    def _auth_headers(self) -> dict:
        template = self.options.get("auth_header", "Authorization: Bearer {api_key}")
        header_value = template.format(api_key=self.api_key)
        headers = {"Content-Type": "application/json"}
        if ": " in header_value:
            name, value = header_value.split(": ", 1)
            headers[name.strip()] = value.strip()
        else:
            headers["Authorization"] = header_value
        return headers

    async def check_connection(self) -> tuple[bool, str]:
        submit_url = self.options.get("submit_url", "")
        if not submit_url:
            return False, "Chưa cấu hình submit_url cho provider"
        if not self.api_key and "{api_key}" in self.options.get("auth_header", ""):
            return False, "Chưa cấu hình API key cho provider"
        return True, "Cấu hình provider đầy đủ (kiểm tra sâu cần gửi thử 1 task)"

    async def submit_scene(
        self, scene: Scene, ref_image_paths: list[str], prompt_pack: dict
    ) -> str:
        submit_url = self.options.get("submit_url", "")
        if not submit_url:
            raise RuntimeError("Chưa cấu hình submit_url cho provider")
        method = (self.options.get("submit_method") or "POST").upper()
        caps = self.capabilities()
        body: dict = {
            "model": self.config.model or "",
            "prompt": (prompt_pack or {}).get("video_prompt") or scene.video_prompt,
            "negative_prompt": (prompt_pack or {}).get("negative_prompt") or "",
            "duration": max(1, min(int(scene.target_duration_sec or 10), int(caps.get("max_seconds", 10)))),
            "image_urls": ref_image_paths or [],
        }
        body.update(self.options.get("submit_body", {}) or {})
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.request(method, submit_url, headers=self._auth_headers(), json=body)
        except Exception as e:  # noqa: BLE001
            raise RuntimeError(f"Không gửi được yêu cầu tới provider: {e}") from e
        if resp.status_code not in (200, 201, 202):
            raise RuntimeError(
                f"Provider từ chối yêu cầu (HTTP {resp.status_code}): {resp.text[:500]}"
            )
        try:
            data = resp.json()
        except Exception as e:  # noqa: BLE001
            raise RuntimeError(f"Provider trả về không phải JSON: {resp.text[:300]}") from e
        task_id_field = self.options.get("task_id_field", "id")
        task_id = _nested_get(data, task_id_field)
        if not task_id:
            raise RuntimeError(
                f"Provider không trả về task id (field '{task_id_field}'): {str(data)[:300]}"
            )
        return str(task_id)

    def _map_status(self, raw: str) -> str:
        raw_l = str(raw or "").lower()
        status_map = self.options.get("status_map", {}) or {}
        ok_vals = {str(v).lower() for v in status_map.get("succeeded", [])}
        fail_vals = {str(v).lower() for v in status_map.get("failed", [])}
        if raw_l in ok_vals or raw_l in ("succeeded", "done", "completed", "success"):
            return "succeeded"
        if raw_l in fail_vals or raw_l in ("failed", "error", "failure"):
            return "failed"
        if "cancel" in raw_l:
            return "cancelled"
        if raw_l in ("queued", "pending", "waiting", "submitted"):
            return "queued"
        return "processing"

    async def poll_task(self, task_id: str) -> dict:
        template = self.options.get("status_url_template", "")
        if not template:
            raise RuntimeError("Chưa cấu hình status_url_template cho provider")
        url = template.format(task_id=task_id)
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.get(url, headers=self._auth_headers())
        except Exception as e:  # noqa: BLE001
            raise RuntimeError(f"Không poll được trạng thái provider: {e}") from e
        if resp.status_code == 404:
            return {"status": "failed", "error": "Task không tồn tại trên provider (404)"}
        if resp.status_code != 200:
            raise RuntimeError(
                f"Poll provider lỗi (HTTP {resp.status_code}): {resp.text[:300]}"
            )
        data = resp.json()
        status_field = self.options.get("status_field", "status")
        status = self._map_status(_nested_get(data, status_field))
        result: dict = {"status": status}
        if status == "succeeded":
            video_url_field = self.options.get("video_url_field", "video_url")
            result["video_url"] = _nested_get(data, video_url_field)
            if not result["video_url"]:
                result["status"] = "failed"
                result["error"] = (
                    f"Provider báo thành công nhưng thiếu video (field '{video_url_field}')"
                )
        elif status == "failed":
            err = data.get("error") or data.get("message") or "Tạo video thất bại"
            result["error"] = str(err)[:500]
        progress_field = self.options.get("progress_field")
        if progress_field:
            try:
                result["progress"] = int(_nested_get(data, progress_field) or 0)
            except (TypeError, ValueError):
                pass
        return result

    async def cancel_task(self, task_id: str) -> bool:
        template = self.options.get("cancel_url_template", "")
        if not template:
            return False
        url = template.format(task_id=task_id)
        method = (self.options.get("cancel_method") or "POST").upper()
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.request(method, url, headers=self._auth_headers())
            return resp.status_code in (200, 202, 204)
        except Exception:  # noqa: BLE001
            return False
