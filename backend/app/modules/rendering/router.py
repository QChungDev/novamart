"""Router rendering: prefix /api/render, tag 'render'.

Bao gom: timeline, dialogue-audio (TTS), audio tracks, music, subtitles,
render job va download MP4.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.storage import get_storage, validate_upload
from app.database.base import get_db
from app.database.models import (
    AudioTrack,
    Project,
    RenderJob,
    Scene,
    SubtitleEntry,
    TimelineClip,
    VoiceProfile,
)
from app.modules.rendering import schemas
from app.modules.rendering.ffmpeg import probe
from app.modules.rendering.service import timeline_clip_durations

router = APIRouter(prefix="/api/render", tags=["render"])


def _get_project(project_id: int, db: Session) -> Project:
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Không tìm thấy project")
    return project


def _render_job_out(job: RenderJob) -> dict:
    storage = get_storage()
    return {
        "id": job.id,
        "project_id": job.project_id,
        "status": job.status,
        "settings": job.settings or {},
        "progress": job.progress,
        "output_path": job.output_path,
        "srt_path": job.srt_path,
        "output_url": storage.url_for(job.output_path) if job.output_path else "",
        "srt_url": storage.url_for(job.srt_path) if job.srt_path else "",
        "error": job.error,
        "created_at": job.created_at,
        "updated_at": job.updated_at,
    }


# ---------- Timeline ----------

@router.get("/projects/{project_id}/timeline")
def get_timeline(project_id: int, db: Session = Depends(get_db)):
    _get_project(project_id, db)
    storage = get_storage()
    clips = (
        db.query(TimelineClip)
        .filter(TimelineClip.project_id == project_id)
        .order_by(TimelineClip.sort_order.asc(), TimelineClip.id.asc())
        .all()
    )
    out = []
    for clip in clips:
        scene = db.get(Scene, clip.scene_id)
        video_url = ""
        duration = 0.0
        name = ""
        if scene:
            name = scene.name or scene.scene_code or f"Scene {scene.id}"
            if scene.output_video_path and storage.exists(scene.output_video_path):
                video_url = storage.url_for(scene.output_video_path)
                try:
                    duration = probe(storage.abs_path(scene.output_video_path))["duration"]
                except Exception:  # noqa: BLE001
                    duration = float(scene.target_duration_sec or 0)
        out.append({
            "id": clip.id,
            "scene_id": clip.scene_id,
            "scene_name": name,
            "sort_order": clip.sort_order,
            "trim_start_sec": clip.trim_start_sec,
            "trim_end_sec": clip.trim_end_sec,
            "transition": clip.transition,
            "video_url": video_url,
            "duration_sec": duration,
        })
    return {"clips": out}


@router.put("/projects/{project_id}/timeline")
def put_timeline(
    project_id: int, payload: schemas.TimelineUpdate, db: Session = Depends(get_db)
):
    """Upsert tung clip theo scene_id; xoa clip khong con trong danh sach gui len."""
    _get_project(project_id, db)
    for item in payload.clips:
        scene = db.get(Scene, item.scene_id)
        if not scene or scene.project_id != project_id:
            raise HTTPException(
                status_code=400,
                detail=f"Scene {item.scene_id} không thuộc project này",
            )
        if (item.transition or "cut") not in ("cut", "fade"):
            raise HTTPException(status_code=400, detail="transition chỉ hỗ trợ cut|fade")
    existing = {
        c.scene_id: c
        for c in db.query(TimelineClip).filter(TimelineClip.project_id == project_id).all()
    }
    seen: set[int] = set()
    for item in payload.clips:
        seen.add(item.scene_id)
        clip = existing.get(item.scene_id)
        if clip is None:
            clip = TimelineClip(project_id=project_id, scene_id=item.scene_id)
            db.add(clip)
        clip.sort_order = item.sort_order
        clip.trim_start_sec = max(0.0, item.trim_start_sec or 0.0)
        clip.trim_end_sec = max(0.0, item.trim_end_sec or 0.0)
        clip.transition = item.transition or "cut"
    for scene_id, clip in existing.items():
        if scene_id not in seen:
            db.delete(clip)
    db.commit()
    return get_timeline(project_id, db)


# ---------- Dialogue audio (TTS) ----------

def _synthesize_or_raise():
    try:
        from app.modules.voices.service import synthesize_speech  # type: ignore

        return synthesize_speech
    except Exception as e:  # noqa: BLE001
        raise HTTPException(
            status_code=501,
            detail="Module Voice Studio chưa được triển khai (thiếu voices.service.synthesize_speech).",
        ) from e


def _voice_for_turn(turn: dict, db: Session) -> VoiceProfile | None:
    vp = None
    vid = turn.get("voice_profile_id")
    if vid:
        vp = db.get(VoiceProfile, vid)
    if vp is None:
        cid = turn.get("character_id")
        if cid:
            from app.database.models import Character

            ch = db.get(Character, cid)
            if ch and ch.default_voice_profile_id:
                vp = db.get(VoiceProfile, ch.default_voice_profile_id)
    if vp is None:
        vp = (
            db.query(VoiceProfile)
            .filter(VoiceProfile.is_default.is_(True))
            .order_by(VoiceProfile.id.asc())
            .first()
        )
    return vp


@router.post("/projects/{project_id}/dialogue-audio", response_model=schemas.DialogueAudioOut)
def generate_dialogue_audio(project_id: int, db: Session = Depends(get_db)):
    """TTS loi thoai tung scene theo voice da gan -> AudioTrack kind=dialogue."""
    _get_project(project_id, db)
    synthesize_speech = _synthesize_or_raise()
    storage = get_storage()

    pairs = timeline_clip_durations(project_id, db)
    if not pairs:
        raise HTTPException(status_code=400, detail="Timeline chưa có clip nào")

    # Xoa dialogue tracks cu de tranh trung lap khi tao lai
    db.query(AudioTrack).filter(
        AudioTrack.project_id == project_id, AudioTrack.kind == "dialogue"
    ).delete(synchronize_session=False)

    created: list[AudioTrack] = []
    offset = 0.0
    for clip, dur in pairs:
        scene = db.get(Scene, clip.scene_id)
        if scene is None:
            offset += dur
            continue
        for i, turn in enumerate(scene.dialogue or []):
            text = (turn or {}).get("text", "").strip()
            if not text:
                continue
            vp = _voice_for_turn(turn, db)
            if vp is None or not vp.provider_voice_id:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Scene '{scene.name or scene.scene_code}': chưa gán giọng nói "
                        "cho nhân vật. Vào Voice Studio để tạo/gán voice trước."
                    ),
                )
            subdir = f"audio/project_{project_id}"
            dest = storage.abs_path(subdir) / f"scene_{scene.id}_dlg_{i}.mp3"
            dest.parent.mkdir(parents=True, exist_ok=True)
            try:
                synthesize_speech(
                    text, vp.provider_voice_id, vp.rate or 1.0, vp.pitch or 1.0, str(dest)
                )
            except Exception as e:  # noqa: BLE001
                raise HTTPException(
                    status_code=502, detail=f"TTS thất bại ở scene {scene.scene_code}: {e}"
                ) from e
            if not dest.is_file() or dest.stat().st_size == 0:
                raise HTTPException(
                    status_code=502,
                    detail=f"TTS không tạo được file âm thanh cho scene {scene.scene_code}",
                )
            track = AudioTrack(
                project_id=project_id,
                kind="dialogue",
                scene_id=scene.id,
                label=f"{(turn.get('character_name') or 'Thoại')} — {scene.scene_code or scene.name}",
                file_path=f"{subdir}/scene_{scene.id}_dlg_{i}.mp3",
                volume=1.0,
                start_offset_sec=round(offset, 3),
            )
            db.add(track)
            created.append(track)
        offset += dur
    db.commit()
    for t in created:
        db.refresh(t)
    return {"tracks": [_track_out(t) for t in created]}


def _track_out(t: AudioTrack) -> dict:
    storage = get_storage()
    return {
        "id": t.id,
        "kind": t.kind,
        "scene_id": t.scene_id,
        "label": t.label,
        "file_path": t.file_path,
        "audio_url": storage.url_for(t.file_path) if t.file_path else "",
        "volume": t.volume,
        "fade_in_sec": t.fade_in_sec,
        "fade_out_sec": t.fade_out_sec,
        "start_offset_sec": t.start_offset_sec,
    }


# ---------- Audio tracks ----------

@router.get("/projects/{project_id}/audio")
def list_audio(project_id: int, db: Session = Depends(get_db)):
    _get_project(project_id, db)
    tracks = (
        db.query(AudioTrack)
        .filter(AudioTrack.project_id == project_id)
        .order_by(AudioTrack.id.asc())
        .all()
    )
    return {"tracks": [_track_out(t) for t in tracks]}


@router.patch("/audio/{track_id}")
def update_audio(track_id: int, payload: schemas.TrackUpdate, db: Session = Depends(get_db)):
    track = db.get(AudioTrack, track_id)
    if not track:
        raise HTTPException(status_code=404, detail="Không tìm thấy audio track")
    data = payload.model_dump(exclude_unset=True)
    if "volume" in data and data["volume"] is not None:
        v = float(data["volume"])
        if not 0.0 <= v <= 3.0:
            raise HTTPException(status_code=400, detail="volume phải trong khoảng 0.0–3.0")
    for k in ("fade_in_sec", "fade_out_sec", "start_offset_sec"):
        if k in data and data[k] is not None and float(data[k]) < 0:
            raise HTTPException(status_code=400, detail=f"{k} không được âm")
    for k, v in data.items():
        setattr(track, k, v)
    db.commit()
    db.refresh(track)
    return _track_out(track)


@router.delete("/audio/{track_id}")
def delete_audio(track_id: int, db: Session = Depends(get_db)):
    track = db.get(AudioTrack, track_id)
    if not track:
        raise HTTPException(status_code=404, detail="Không tìm thấy audio track")
    storage = get_storage()
    if track.file_path:
        storage.delete(track.file_path)
    db.delete(track)
    db.commit()
    return {"ok": True}


@router.post("/projects/{project_id}/music")
def upload_music(project_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    _get_project(project_id, db)
    ok, msg = validate_upload(file, "audio")
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    storage = get_storage()
    rel = storage.save_upload(file, f"audio/project_{project_id}")
    track = AudioTrack(
        project_id=project_id,
        kind="music",
        label=f"Nhạc nền — {(file.filename or 'upload')[:80]}",
        file_path=rel,
        volume=0.4,
        start_offset_sec=0.0,
    )
    db.add(track)
    db.commit()
    db.refresh(track)
    return _track_out(track)


# ---------- Subtitles ----------

@router.get("/projects/{project_id}/subtitles", response_model=schemas.SubtitlesOut)
def get_subtitles(project_id: int, db: Session = Depends(get_db)):
    """Neu chua co entries: tu sinh tu dialogue (chia deu theo target_duration_sec)."""
    _get_project(project_id, db)
    entries = (
        db.query(SubtitleEntry)
        .filter(SubtitleEntry.project_id == project_id)
        .order_by(SubtitleEntry.sort_order.asc(), SubtitleEntry.id.asc())
        .all()
    )
    if not entries:
        entries = _auto_subtitles(project_id, db)
    return {"entries": entries, "srt_url": ""}


def _auto_subtitles(project_id: int, db: Session) -> list[SubtitleEntry]:
    scenes = (
        db.query(Scene)
        .filter(Scene.project_id == project_id)
        .order_by(Scene.sort_order.asc(), Scene.id.asc())
        .all()
    )
    out: list[SubtitleEntry] = []
    order = 0
    offset = 0.0
    for scene in scenes:
        dur = float(scene.target_duration_sec or 10)
        turns = [t for t in (scene.dialogue or []) if (t or {}).get("text", "").strip()]
        if turns:
            per = dur / len(turns)
            for i, t in enumerate(turns):
                out.append(SubtitleEntry(
                    project_id=project_id,
                    scene_id=scene.id,
                    sort_order=order,
                    start_sec=round(offset + i * per, 3),
                    end_sec=round(offset + (i + 1) * per, 3),
                    text=(t.get("character_name") + ": " + t["text"].strip())
                    if t.get("character_name") else t["text"].strip(),
                ))
                order += 1
        offset += dur
    if out:
        db.add_all(out)
        db.commit()
        for e in out:
            db.refresh(e)
    return out


@router.put("/projects/{project_id}/subtitles", response_model=schemas.SubtitlesOut)
def put_subtitles(
    project_id: int, payload: schemas.SubtitlesUpdate, db: Session = Depends(get_db)
):
    _get_project(project_id, db)
    for e in payload.entries:
        if e.end_sec <= e.start_sec:
            raise HTTPException(status_code=400, detail="end_sec phải lớn hơn start_sec")
        if not e.text.strip():
            raise HTTPException(status_code=400, detail="Nội dung phụ đề không được rỗng")
    db.query(SubtitleEntry).filter(SubtitleEntry.project_id == project_id).delete(
        synchronize_session=False
    )
    created: list[SubtitleEntry] = []
    for i, e in enumerate(payload.entries):
        row = SubtitleEntry(
            project_id=project_id,
            scene_id=e.scene_id,
            sort_order=i,
            start_sec=e.start_sec,
            end_sec=e.end_sec,
            text=e.text.strip(),
        )
        db.add(row)
        created.append(row)
    db.commit()
    for r in created:
        db.refresh(r)
    return {"entries": created, "srt_url": ""}


# ---------- Render jobs ----------

@router.post("/projects/{project_id}/render", response_model=schemas.RenderJobOut, status_code=201)
def create_render_job(
    project_id: int, payload: schemas.RenderRequest, db: Session = Depends(get_db)
):
    project = _get_project(project_id, db)
    from app.modules.rendering.service import _parse_resolution

    try:
        _parse_resolution(payload.resolution)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if payload.fps not in (24, 30):
        raise HTTPException(status_code=400, detail="fps chỉ hỗ trợ 24 hoặc 30")
    running = (
        db.query(RenderJob)
        .filter(RenderJob.project_id == project_id,
                RenderJob.status.in_(("queued", "processing")))
        .first()
    )
    if running:
        raise HTTPException(status_code=400, detail="Project đang có render job chạy")
    job = RenderJob(
        project_id=project_id,
        status="queued",
        settings={
            "resolution": payload.resolution,
            "fps": payload.fps,
            "burn_subtitles": payload.burn_subtitles,
            "export_srt": payload.export_srt,
        },
    )
    db.add(job)
    project.status = "rendering"
    db.commit()
    db.refresh(job)
    return _render_job_out(job)


@router.get("/jobs/{job_id}", response_model=schemas.RenderJobOut)
def get_render_job(job_id: int, db: Session = Depends(get_db)):
    job = db.get(RenderJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Không tìm thấy render job")
    return _render_job_out(job)


@router.get("/jobs/{job_id}/download")
def download_render(job_id: int, db: Session = Depends(get_db)):
    job = db.get(RenderJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Không tìm thấy render job")
    if job.status != "succeeded" or not job.output_path:
        raise HTTPException(status_code=400, detail="Video chưa render xong")
    storage = get_storage()
    abs_path = storage.abs_path(job.output_path)
    if not abs_path.is_file():
        raise HTTPException(status_code=404, detail="File MP4 không còn tồn tại")
    return FileResponse(
        path=str(abs_path),
        media_type="video/mp4",
        filename=f"ai-shorts-studio-{job.project_id}-{job.id}.mp4",
    )
