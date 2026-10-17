"""Router video_generation: prefix /api/video, tag 'video'."""
from __future__ import annotations

import asyncio

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.security import encrypt_secret
from app.core.storage import get_storage, validate_upload
from app.database.base import get_db
from app.database.models import GenerationJob, Project, ProviderConfiguration, Scene
from app.modules.video_generation import schemas
from app.modules.video_generation.providers import get_provider
from app.modules.video_generation.service import build_prompt_pack

router = APIRouter(prefix="/api/video", tags=["video"])


def _provider_out(cfg: ProviderConfiguration) -> dict:
    return {
        "id": cfg.id,
        "provider_type": cfg.provider_type,
        "name": cfg.name,
        "adapter": cfg.adapter,
        "base_url": cfg.base_url,
        "model": cfg.model,
        "api_key_set": bool(cfg.api_key_enc),
        "capabilities": get_provider(cfg).capabilities(),
        "is_active": cfg.is_active,
    }


# ---------- Providers ----------

@router.get("/providers", response_model=list[schemas.ProviderOut])
def list_providers(db: Session = Depends(get_db)):
    cfgs = db.query(ProviderConfiguration).order_by(ProviderConfiguration.id.asc()).all()
    return [_provider_out(c) for c in cfgs]


@router.post("/providers", response_model=schemas.ProviderOut, status_code=201)
def create_provider(payload: schemas.ProviderCreate, db: Session = Depends(get_db)):
    cfg = ProviderConfiguration(
        provider_type=payload.provider_type or "video",
        name=payload.name,
        adapter=payload.adapter or "manual",
        base_url=payload.base_url or "",
        api_key_enc=encrypt_secret(payload.api_key or ""),
        model=payload.model or "",
        options=payload.options or {},
        is_active=True,
    )
    db.add(cfg)
    db.commit()
    db.refresh(cfg)
    return _provider_out(cfg)


@router.patch("/providers/{provider_id}", response_model=schemas.ProviderOut)
def update_provider(
    provider_id: int, payload: schemas.ProviderUpdate, db: Session = Depends(get_db)
):
    cfg = db.get(ProviderConfiguration, provider_id)
    if not cfg:
        raise HTTPException(status_code=404, detail="Không tìm thấy provider")
    data = payload.model_dump(exclude_unset=True)
    if "api_key" in data:
        # Chi cap nhat key khi nguoi dung nhap key moi (khong ghi de bang chuoi rong)
        if data["api_key"]:
            cfg.api_key_enc = encrypt_secret(data["api_key"])
        data.pop("api_key")
    for k, v in data.items():
        setattr(cfg, k, v)
    db.commit()
    db.refresh(cfg)
    return _provider_out(cfg)


@router.delete("/providers/{provider_id}")
def delete_provider(provider_id: int, db: Session = Depends(get_db)):
    cfg = db.get(ProviderConfiguration, provider_id)
    if not cfg:
        raise HTTPException(status_code=404, detail="Không tìm thấy provider")
    db.delete(cfg)
    db.commit()
    return {"ok": True}


@router.post("/providers/{provider_id}/test", response_model=schemas.ProviderTestOut)
def test_provider(provider_id: int, db: Session = Depends(get_db)):
    cfg = db.get(ProviderConfiguration, provider_id)
    if not cfg:
        raise HTTPException(status_code=404, detail="Không tìm thấy provider")
    provider = get_provider(cfg)
    try:
        ok, message = asyncio.run(provider.check_connection())
    except Exception as e:  # noqa: BLE001
        ok, message = False, f"Lỗi khi kiểm tra kết nối: {e}"
    return {"ok": ok, "message": message, "capabilities": provider.capabilities()}


# ---------- Generate ----------

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


@router.post("/projects/{project_id}/generate", response_model=schemas.GenerateOut)
def generate_project(
    project_id: int, payload: schemas.GenerateRequest, db: Session = Depends(get_db)
):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Không tìm thấy project")
    config = _active_video_config(db)
    if not config:
        raise HTTPException(
            status_code=400,
            detail="Chưa cấu hình video provider. Vào API Settings để thêm provider.",
        )
    scenes = (
        db.query(Scene)
        .filter(Scene.project_id == project_id)
        .order_by(Scene.sort_order.asc())
        .all()
    )
    if payload.scene_ids:
        wanted = set(payload.scene_ids)
        scenes = [s for s in scenes if s.id in wanted]
    jobs: list[GenerationJob] = []
    for scene in scenes:
        if scene.status not in ("draft", "failed"):
            continue
        # Tranh tao job trung lap khi scene dang co job queued/processing
        existing = (
            db.query(GenerationJob)
            .filter(
                GenerationJob.scene_id == scene.id,
                GenerationJob.status.in_(("queued", "processing")),
            )
            .first()
        )
        if existing:
            jobs.append(existing)
            continue
        job = GenerationJob(
            scene_id=scene.id,
            provider_config_id=config.id,
            status="queued",
            max_attempts=3,
        )
        db.add(job)
        scene.status = "queued"
        scene.error = ""
        jobs.append(job)
    project.status = "generating"
    db.commit()
    for j in jobs:
        db.refresh(j)
    return {"jobs": jobs}


@router.get("/jobs", response_model=list[schemas.JobOut])
def list_jobs(project_id: int | None = None, db: Session = Depends(get_db)):
    q = db.query(GenerationJob).order_by(GenerationJob.created_at.desc())
    if project_id is not None:
        scene_ids = [s.id for s in db.query(Scene.id).filter(Scene.project_id == project_id).all()]
        q = q.filter(GenerationJob.scene_id.in_(scene_ids)) if scene_ids else q.filter(False)
    return q.limit(200).all()


@router.get("/jobs/{job_id}", response_model=schemas.JobOut)
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.get(GenerationJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Không tìm thấy job")
    return job


@router.post("/jobs/{job_id}/cancel", response_model=schemas.JobOut)
def cancel_job(job_id: int, db: Session = Depends(get_db)):
    job = db.get(GenerationJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Không tìm thấy job")
    if job.status in ("succeeded", "cancelled"):
        return job
    # Co gang huy tren provider neu da co task id
    if job.provider_task_id and job.provider_config_id:
        cfg = db.get(ProviderConfiguration, job.provider_config_id)
        if cfg:
            try:
                asyncio.run(get_provider(cfg).cancel_task(job.provider_task_id))
            except Exception:  # noqa: BLE001
                pass
    job.status = "cancelled"
    job.error = "Đã hủy bởi người dùng"
    scene = db.get(Scene, job.scene_id)
    if scene and scene.status in ("queued", "generating"):
        scene.status = "failed"
        scene.error = "Đã hủy tác vụ tạo video"
    db.commit()
    db.refresh(job)
    return job


@router.post("/jobs/{job_id}/retry", response_model=schemas.JobOut)
def retry_job(job_id: int, db: Session = Depends(get_db)):
    job = db.get(GenerationJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Không tìm thấy job")
    if job.status in ("queued", "processing"):
        raise HTTPException(status_code=400, detail="Job đang chạy, không cần retry")
    job.attempts = 0
    job.status = "queued"
    job.error = ""
    job.progress = 0
    job.provider_task_id = ""  # submit moi hoan toan
    scene = db.get(Scene, job.scene_id)
    if scene:
        scene.status = "queued"
        scene.error = ""
    db.commit()
    db.refresh(job)
    return job


# ---------- Prompt pack & manual upload ----------

@router.get("/scenes/{scene_id}/prompt-pack", response_model=schemas.PromptPackOut)
def get_prompt_pack(scene_id: int, db: Session = Depends(get_db)):
    scene = db.get(Scene, scene_id)
    if not scene:
        raise HTTPException(status_code=404, detail="Không tìm thấy scene")
    pack = build_prompt_pack(scene, db)
    return {
        "video_prompt": pack["video_prompt"],
        "negative_prompt": pack["negative_prompt"],
        "reference_image_urls": pack["reference_image_urls"],
        "characters": pack["characters"],
        "scene_info": pack["scene_info"],
    }


@router.post("/scenes/{scene_id}/upload")
def upload_scene_video(
    scene_id: int, video: UploadFile = File(...), db: Session = Depends(get_db)
):
    scene = db.get(Scene, scene_id)
    if not scene:
        raise HTTPException(status_code=404, detail="Không tìm thấy scene")
    ok, msg = validate_upload(video, "video")
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    storage = get_storage()
    rel = storage.save_upload(video, f"generated/project_{scene.project_id}")
    scene.output_video_path = rel
    scene.status = "ready"
    scene.error = ""
    # Dong cac job manual dang cho cua scene nay
    for job in (
        db.query(GenerationJob)
        .filter(GenerationJob.scene_id == scene.id, GenerationJob.status.in_(("queued", "processing")))
        .all()
    ):
        job.status = "succeeded"
        job.progress = 100
        job.error = "Đã upload video thủ công"
    db.commit()
    return {
        "ok": True,
        "file_path": rel,
        "video_url": storage.url_for(rel),
        "scene_status": scene.status,
    }
