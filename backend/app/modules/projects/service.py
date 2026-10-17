"""Logic nghiep vu cho module projects."""
from __future__ import annotations

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.storage import get_storage
from app.database.models import (
    AudioTrack,
    GenerationJob,
    MediaAsset,
    Project,
    RenderJob,
    Scene,
    SceneCharacter,
    Script,
    SubtitleEntry,
    TimelineClip,
)

from .schemas import ProjectCreate, ProjectUpdate


# ---------- helpers ----------

def scene_count(db: Session, project_id: int) -> int:
    return db.query(func.count(Scene.id)).filter(Scene.project_id == project_id).scalar() or 0


def thumbnail_url(project: Project) -> str:
    if project.thumbnail_path:
        return get_storage().url_for(project.thumbnail_path)
    return ""


def project_out_dict(db: Session, project: Project) -> dict:
    return {
        "id": project.id,
        "name": project.name,
        "description": project.description or "",
        "status": project.status,
        "target_duration_sec": project.target_duration_sec,
        "aspect_ratio": project.aspect_ratio,
        "resolution": project.resolution,
        "fps": project.fps,
        "scene_count": scene_count(db, project.id),
        "thumbnail_url": thumbnail_url(project),
        "created_at": project.created_at,
        "updated_at": project.updated_at,
    }


# ---------- CRUD ----------

def create_project(db: Session, data: ProjectCreate) -> Project:
    project = Project(
        name=data.name,
        description=data.description,
        target_duration_sec=data.target_duration_sec,
        aspect_ratio=data.aspect_ratio,
        resolution=data.resolution,
        fps=data.fps,
        status="draft",
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def get_project(db: Session, project_id: int) -> Project | None:
    return db.get(Project, project_id)


def list_projects(db: Session) -> list[Project]:
    return db.query(Project).order_by(Project.updated_at.desc()).all()


def update_project(db: Session, project_id: int, data: ProjectUpdate) -> Project | None:
    project = db.get(Project, project_id)
    if not project:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    db.commit()
    db.refresh(project)
    return project


def delete_project(db: Session, project_id: int) -> bool:
    """Xoa project va toan bo file media thuoc ve project. Tra False neu khong tim thay."""
    project = db.get(Project, project_id)
    if not project:
        return False

    storage = get_storage()
    file_paths: list[str] = []
    if project.thumbnail_path:
        file_paths.append(project.thumbnail_path)

    for scene in db.query(Scene).filter(Scene.project_id == project_id).all():
        if scene.output_video_path:
            file_paths.append(scene.output_video_path)

    for asset in db.query(MediaAsset).filter(MediaAsset.project_id == project_id).all():
        if asset.file_path:
            file_paths.append(asset.file_path)

    for track in db.query(AudioTrack).filter(AudioTrack.project_id == project_id).all():
        if track.file_path:
            file_paths.append(track.file_path)

    for job in db.query(RenderJob).filter(RenderJob.project_id == project_id).all():
        if job.output_path:
            file_paths.append(job.output_path)
        if job.srt_path:
            file_paths.append(job.srt_path)

    # Xoa cac dong phu thuoc khong co cascade ORM tu phia Project
    scene_ids = [s.id for s in db.query(Scene.id).filter(Scene.project_id == project_id).all()]
    if scene_ids:
        db.query(GenerationJob).filter(GenerationJob.scene_id.in_(scene_ids)).delete(synchronize_session=False)
    db.query(TimelineClip).filter(TimelineClip.project_id == project_id).delete()
    db.query(SubtitleEntry).filter(SubtitleEntry.project_id == project_id).delete()
    db.query(AudioTrack).filter(AudioTrack.project_id == project_id).delete()
    db.query(RenderJob).filter(RenderJob.project_id == project_id).delete()
    db.query(MediaAsset).filter(MediaAsset.project_id == project_id).delete()

    db.delete(project)  # cascade ORM: script, scenes, scene_characters
    db.commit()

    for rel in file_paths:
        try:
            storage.delete(rel)
        except Exception:
            pass
    return True


def duplicate_project(db: Session, project_id: int, new_name: str | None = None) -> Project | None:
    """Nhan ban project: copy script + scenes + scene_characters + timeline_clips +
    subtitle_entries + audio_tracks (metadata). KHONG copy file video output/render;
    scene moi ve trang thai draft."""
    src = db.get(Project, project_id)
    if not src:
        return None

    name = new_name or f"{src.name} (bản sao)"
    new_project = Project(
        name=name,
        description=src.description,
        status="draft",
        target_duration_sec=src.target_duration_sec,
        aspect_ratio=src.aspect_ratio,
        resolution=src.resolution,
        fps=src.fps,
    )
    db.add(new_project)
    db.flush()

    # Script
    new_script_id: int | None = None
    if src.script is not None:
        s = src.script
        new_script = Script(
            project_id=new_project.id,
            idea=s.idea,
            story_text=s.story_text,
            style=s.style,
            audience=s.audience,
            target_duration_sec=s.target_duration_sec,
            dialogue_language=s.dialogue_language,
            status="draft",
        )
        db.add(new_script)
        db.flush()
        new_script_id = new_script.id

    # Scenes (ghi nho anh xa id cu -> id moi)
    scene_map: dict[int, int] = {}
    old_scenes = (
        db.query(Scene)
        .filter(Scene.project_id == project_id)
        .order_by(Scene.sort_order.asc())
        .all()
    )
    for s in old_scenes:
        ns = Scene(
            project_id=new_project.id,
            script_id=new_script_id,
            scene_code=s.scene_code,
            name=s.name,
            sort_order=s.sort_order,
            target_duration_sec=s.target_duration_sec,
            location=s.location,
            action=s.action,
            expression=s.expression,
            camera=s.camera,
            dialogue=list(s.dialogue or []),
            ambient_audio=s.ambient_audio,
            video_prompt=s.video_prompt,
            negative_prompt=s.negative_prompt,
            reference_image_paths=list(s.reference_image_paths or []),
            status="draft",
            output_video_path="",
            error="",
        )
        db.add(ns)
        db.flush()
        scene_map[s.id] = ns.id

    if scene_map:
        old_ids = list(scene_map.keys())

        for sc in db.query(SceneCharacter).filter(SceneCharacter.scene_id.in_(old_ids)).all():
            db.add(SceneCharacter(scene_id=scene_map[sc.scene_id], character_id=sc.character_id))

        for clip in db.query(TimelineClip).filter(TimelineClip.project_id == project_id).all():
            if clip.scene_id in scene_map:
                db.add(
                    TimelineClip(
                        project_id=new_project.id,
                        scene_id=scene_map[clip.scene_id],
                        sort_order=clip.sort_order,
                        trim_start_sec=clip.trim_start_sec,
                        trim_end_sec=clip.trim_end_sec,
                        transition=clip.transition,
                    )
                )

        for entry in db.query(SubtitleEntry).filter(SubtitleEntry.project_id == project_id).all():
            new_scene_id = scene_map.get(entry.scene_id) if entry.scene_id else None
            db.add(
                SubtitleEntry(
                    project_id=new_project.id,
                    scene_id=new_scene_id,
                    sort_order=entry.sort_order,
                    start_sec=entry.start_sec,
                    end_sec=entry.end_sec,
                    text=entry.text,
                )
            )

        for track in db.query(AudioTrack).filter(AudioTrack.project_id == project_id).all():
            new_scene_id = scene_map.get(track.scene_id) if track.scene_id else None
            db.add(
                AudioTrack(
                    project_id=new_project.id,
                    kind=track.kind,
                    scene_id=new_scene_id,
                    label=track.label,
                    file_path=track.file_path,
                    volume=track.volume,
                    fade_in_sec=track.fade_in_sec,
                    fade_out_sec=track.fade_out_sec,
                    start_offset_sec=track.start_offset_sec,
                )
            )

    db.commit()
    db.refresh(new_project)
    return new_project
