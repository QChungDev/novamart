"""Nghiep vu tao video: build prompt-pack + xu ly GenerationJob (worker goi)."""
from __future__ import annotations

import asyncio
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.storage import get_storage
from app.database.models import Character, GenerationJob, ProviderConfiguration, Scene
from app.modules.video_generation.providers import get_provider
from app.modules.video_generation.providers.manual import ManualImportProvider


def _fallback_lock_prompt(character: Character) -> str:
    """Dung khi module characters.service chua trien khai build_lock_prompt."""
    parts = [
        f"Nhân vật: {character.name} ({character.character_code})",
        f"Mô tả ngoại hình: {character.description or character.appearance}".strip(),
    ]
    if character.colors:
        parts.append(f"Màu sắc: {character.colors}")
    if character.outfit:
        parts.append(f"Trang phục: {character.outfit}")
    if character.accessories:
        parts.append(f"Phụ kiện: {character.accessories}")
    if character.body_ratio:
        parts.append(f"Tỷ lệ cơ thể: {character.body_ratio}")
    if character.art_style:
        parts.append(f"Phong cách đồ họa: {character.art_style}")
    rules = character.lock_rules or {}
    must = rules.get("must_keep") or rules.get("rules") or []
    if must:
        if isinstance(must, list):
            parts.append("QUY TẮC BẮT BUỘC GIỮ NGUYÊN: " + "; ".join(str(x) for x in must))
        else:
            parts.append(f"QUY TẮC BẮT BUỘC GIỮ NGUYÊN: {must}")
    else:
        parts.append(
            "QUY TẮC BẮT BUỘC: giữ nguyên màu lông/da, khuôn mặt, hình dáng cơ thể, "
            "màu mắt và mọi đặc điểm nhận dạng đã mô tả — không tự ý thay đổi."
        )
    return "\n".join(p for p in parts if p)


def _character_lock_prompt(character: Character) -> str:
    """Uu tien characters.service.build_lock_prompt neu module do da co."""
    try:
        from app.modules.characters.service import build_lock_prompt  # type: ignore

        return str(build_lock_prompt(character))
    except Exception:  # noqa: BLE001
        return _fallback_lock_prompt(character)


def build_prompt_pack(scene: Scene, db: Session) -> dict:
    """Xay dung prompt-pack day du cho 1 scene (dung cho API mode va Manual Mode)."""
    storage = get_storage()
    char_prompts: list[dict] = []
    lock_texts: list[str] = []
    for sc in scene.characters or []:
        character = db.get(Character, sc.character_id)
        if not character:
            continue
        lp = _character_lock_prompt(character)
        char_prompts.append(
            {"character_id": character.id, "name": character.name, "lock_prompt": lp}
        )
        lock_texts.append(lp)

    base_prompt = (scene.video_prompt or "").strip()
    if not base_prompt:
        base_prompt = " ".join(
            x for x in [scene.action, scene.expression, scene.camera, scene.location] if x
        ).strip()
    full_prompt = "\n\n".join([*lock_texts, base_prompt]) if lock_texts else base_prompt

    ref_rels: list[str] = []
    ref_urls: list[str] = []
    for rel in scene.reference_image_paths or []:
        if rel and storage.exists(rel):
            ref_rels.append(rel)
            ref_urls.append(storage.url_for(rel))

    return {
        "video_prompt": full_prompt,
        "negative_prompt": scene.negative_prompt or "",
        "reference_image_urls": ref_urls,   # URL public de hien thi
        "reference_image_rels": ref_rels,   # relative path trong storage
        "characters": char_prompts,
        "scene_info": {
            "scene_id": scene.id,
            "scene_code": scene.scene_code,
            "name": scene.name,
            "target_duration_sec": scene.target_duration_sec,
            "location": scene.location,
            "action": scene.action,
            "expression": scene.expression,
            "camera": scene.camera,
            "dialogue": scene.dialogue or [],
            "ambient_audio": scene.ambient_audio,
        },
    }


def _active_video_config(db: Session) -> ProviderConfiguration | None:
    return (
        db.query(ProviderConfiguration)
        .filter(
            ProviderConfiguration.provider_type == "video",
            ProviderConfiguration.is_active.is_(True),
        )
        .order_by(ProviderConfiguration.id.asc())
        .first()
    )


def _validate_video_file(path: Path) -> None:
    """Kiem tra file video tai ve hop le (ton tai, >0 bytes, duration>0 neu probe duoc)."""
    if not path.is_file():
        raise RuntimeError("File video tải về không tồn tại")
    if path.stat().st_size == 0:
        raise RuntimeError("File video tải về rỗng (0 bytes)")
    try:
        from app.modules.rendering.ffmpeg import probe

        info = probe(path)
        if info.get("duration", 0) <= 0:
            raise RuntimeError("File video tải về không có duration hợp lệ")
    except RuntimeError:
        raise
    except Exception:  # noqa: BLE001
        # ffprobe khong co/khong doc duoc -> chap nhan neu file >0 bytes
        pass


def process_generation_job(job: GenerationJob, db: Session) -> None:
    """Worker goi. Dong bo ben ngoai, ben trong dung asyncio.run cho provider async.

    Quy uoc voi worker (app/core/worker.py):
    - Raise Exception -> worker tang attempts, het max_attempts thi failed.
    - Dat job.status="queued" (khong raise) -> worker se poll lai sau.
    """
    job = db.get(GenerationJob, job.id)
    if job is None:
        raise RuntimeError("GenerationJob không tồn tại")
    if job.attempts >= job.max_attempts:
        raise RuntimeError(
            f"Đã vượt quá số lần thử cho phép ({job.max_attempts}). "
            "Hãy kiểm tra lỗi và dùng Retry để thử lại."
        )
    scene = db.get(Scene, job.scene_id)
    if scene is None:
        raise RuntimeError("Scene của job không tồn tại")

    config = _active_video_config(db)
    if config is None:
        raise RuntimeError(
            "Chưa cấu hình video provider. Vào API Settings để thêm provider "
            "(hoặc chọn Manual mode để upload video thủ công)."
        )
    job.provider_config_id = config.id
    provider = get_provider(config)

    # --- Manual mode: khong goi API, danh dau cho upload thu cong ---
    if isinstance(provider, ManualImportProvider):
        scene.status = "queued"
        scene.error = ""
        job.status = "succeeded"
        job.progress = 100
        job.error = "Chờ upload thủ công: vào Manual Mode để xem prompt và tải MP4 lên scene"
        db.commit()
        return

    storage = get_storage()

    # --- Submit (chi 1 lan) ---
    if not job.provider_task_id:
        pack = build_prompt_pack(scene, db)
        ref_abs = [
            str(storage.abs_path(rel))
            for rel in pack["reference_image_rels"]
            if storage.exists(rel)
        ]
        caps = provider.capabilities()
        max_refs = int(caps.get("max_reference_images", 9) or 9)
        task_id = asyncio.run(provider.submit_scene(scene, ref_abs[:max_refs], pack))
        job.provider_task_id = task_id
        scene.status = "generating"
        scene.error = ""
        job.status = "processing"
        job.progress = 5
        db.commit()

    # --- Poll ---
    result = asyncio.run(provider.poll_task(job.provider_task_id))
    status = result.get("status", "processing")

    if status == "succeeded":
        video_url = result.get("video_url")
        if not video_url:
            raise RuntimeError("Provider báo thành công nhưng không có video_url")
        subdir = f"generated/project_{scene.project_id}"
        dest_dir = storage.abs_path(subdir)
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest = dest_dir / f"scene_{scene.id}.mp4"
        asyncio.run(provider.download_result(video_url, str(dest)))
        _validate_video_file(dest)
        scene.output_video_path = f"{subdir}/scene_{scene.id}.mp4"
        scene.status = "ready"
        scene.error = ""
        job.status = "succeeded"
        job.progress = 100
        job.error = ""
        db.commit()
    elif status == "failed":
        raise RuntimeError(result.get("error") or "Tạo video thất bại (provider báo failed)")
    elif status == "cancelled":
        job.status = "cancelled"
        job.error = "Task đã bị hủy trên provider"
        scene.status = "failed"
        scene.error = "Đã hủy tác vụ tạo video"
        db.commit()
    else:  # queued | processing -> worker se poll lai
        job.status = "queued"
        try:
            job.progress = max(0, min(99, int(result.get("progress") or job.progress or 10)))
        except (TypeError, ValueError):
            pass
        db.commit()
