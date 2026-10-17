"""Worker nen: 1 thread, poll DB, xu ly GenerationJob va RenderJob tuan tu."""
from __future__ import annotations

import threading
import time
import traceback

from app.core.config import settings
from app.database.base import SessionLocal
from app.database.models import GenerationJob, RenderJob

_stop = threading.Event()
_thread: threading.Thread | None = None


def _process_one_generation() -> bool:
    from app.modules.video_generation.service import process_generation_job

    db = SessionLocal()
    try:
        job = (
            db.query(GenerationJob)
            .filter(GenerationJob.status == "queued")
            .order_by(GenerationJob.created_at.asc())
            .first()
        )
        if not job:
            return False
        job.status = "processing"
        db.commit()
        try:
            process_generation_job(job, db)
        except Exception as e:  # noqa: BLE001
            db.rollback()
            job = db.query(GenerationJob).get(job.id)
            if job:
                job.attempts += 1
                job.error = str(e)[:2000] + "\n" + traceback.format_exc()[-2000:]
                job.status = "failed" if job.attempts >= job.max_attempts else "queued"
                db.commit()
        return True
    finally:
        db.close()


def _process_one_render() -> bool:
    from app.modules.rendering.service import process_render_job

    db = SessionLocal()
    try:
        job = (
            db.query(RenderJob)
            .filter(RenderJob.status == "queued")
            .order_by(RenderJob.created_at.asc())
            .first()
        )
        if not job:
            return False
        job.status = "processing"
        db.commit()

        def progress_cb(pct: int):
            j = db.query(RenderJob).get(job.id)
            if j:
                j.progress = pct
                db.commit()

        try:
            process_render_job(job, db, progress_cb)
        except Exception as e:  # noqa: BLE001
            db.rollback()
            j = db.query(RenderJob).get(job.id)
            if j:
                j.error = str(e)[:2000]
                j.status = "failed"
                db.commit()
        return True
    finally:
        db.close()


def _loop():
    while not _stop.is_set():
        try:
            did = _process_one_generation()
            did = _process_one_render() or did
            if not did:
                _stop.wait(settings.WORKER_POLL_SECONDS)
        except Exception:  # noqa: BLE001
            _stop.wait(settings.WORKER_POLL_SECONDS)


def start_worker() -> None:
    global _thread
    if _thread and _thread.is_alive():
        return
    _stop.clear()
    _thread = threading.Thread(target=_loop, daemon=True, name="studio-worker")
    _thread.start()


def stop_worker() -> None:
    _stop.set()
