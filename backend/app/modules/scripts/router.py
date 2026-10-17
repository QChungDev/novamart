"""Router cho scripts & scenes: /api/scripts."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.database.base import get_db
from app.database.models import Scene, Script
from app.modules.scripts import service
from app.modules.scripts.schemas import (
    GenerateScriptRequest,
    GenerateScriptResponse,
    ProjectScriptResponse,
    ReorderScenesRequest,
    SceneOut,
    SceneUpdate,
    ScriptOut,
    ScriptUpdate,
)

router = APIRouter(prefix="/api/scripts", tags=["scripts"])

SCENE_STATUSES = {"draft", "queued", "generating", "ready", "failed"}
SCRIPT_STATUSES = {"draft", "confirmed"}

EDITABLE_SCENE_FIELDS = {
    "name", "target_duration_sec", "location", "action", "expression", "camera",
    "dialogue", "ambient_audio", "video_prompt", "negative_prompt",
    "reference_image_paths", "status",
}


def _scene_out(scene: Scene) -> SceneOut:
    return SceneOut(**service.serialize_scene(scene))


def _provider_max_scene_sec(db: Session) -> float | None:
    """Gioi han giay/canh theo video provider dang active (vd Seedance 2.5: 30s).

    Tra None de service dung gia tri mac dinh an toan.
    """
    try:
        from app.database.models import ProviderConfiguration
        from app.modules.video_generation.providers import get_provider

        cfg = (
            db.query(ProviderConfiguration)
            .filter(
                ProviderConfiguration.provider_type == "video",
                ProviderConfiguration.is_active.is_(True),
            )
            .order_by(ProviderConfiguration.id.asc())
            .first()
        )
        if not cfg:
            return None
        caps = get_provider(cfg).capabilities() or {}
        max_s = caps.get("max_seconds")
        if isinstance(max_s, (int, float)) and max_s > 0:
            return float(min(max_s, 60))
    except Exception:
        pass
    return None


@router.post("/generate", response_model=GenerateScriptResponse)
def generate(payload: GenerateScriptRequest, db: Session = Depends(get_db)):
    try:
        script = service.generate_script(
            db,
            project_id=payload.project_id,
            idea=payload.idea,
            character_ids=payload.character_ids,
            style=payload.style,
            audience=payload.audience,
            target_duration_sec=payload.target_duration_sec,
            dialogue_language=payload.dialogue_language,
            max_scene_sec=_provider_max_scene_sec(db),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    scenes = (
        db.query(Scene).filter(Scene.project_id == payload.project_id)
        .order_by(Scene.sort_order).all()
    )
    return GenerateScriptResponse(
        script=ScriptOut.model_validate(script),
        scenes=[_scene_out(s) for s in scenes],
    )


@router.get("/project/{project_id}", response_model=ProjectScriptResponse)
def get_by_project(project_id: int, db: Session = Depends(get_db)):
    try:
        script, scenes = service.get_project_script(db, project_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return ProjectScriptResponse(
        script=ScriptOut.model_validate(script) if script else None,
        scenes=[_scene_out(s) for s in scenes],
    )


@router.patch("/{script_id}", response_model=ScriptOut)
def update_script(script_id: int, payload: ScriptUpdate, db: Session = Depends(get_db)):
    script = db.get(Script, script_id)
    if not script:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy kịch bản (id={script_id}).")
    if payload.story_text is not None:
        script.story_text = payload.story_text
    if payload.status is not None:
        if payload.status not in SCRIPT_STATUSES:
            raise HTTPException(status_code=400, detail=f"Trạng thái không hợp lệ: {payload.status}.")
        script.status = payload.status
    db.commit()
    db.refresh(script)
    return ScriptOut.model_validate(script)


@router.patch("/scenes/{scene_id}", response_model=SceneOut)
def update_scene(scene_id: int, payload: SceneUpdate, db: Session = Depends(get_db)):
    scene = db.get(Scene, scene_id)
    if not scene:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy cảnh (id={scene_id}).")
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        if field not in EDITABLE_SCENE_FIELDS:
            continue
        if field == "status" and value not in SCENE_STATUSES:
            raise HTTPException(status_code=400, detail=f"Trạng thái không hợp lệ: {value}.")
        setattr(scene, field, value)
    db.commit()
    db.refresh(scene)
    return _scene_out(scene)


@router.post("/project/{project_id}/scenes/reorder", response_model=list[SceneOut])
def reorder(project_id: int, payload: ReorderScenesRequest, db: Session = Depends(get_db)):
    try:
        scenes = service.reorder_scenes(db, project_id, payload.ordered_ids)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return [_scene_out(s) for s in scenes]


@router.delete("/scenes/{scene_id}", status_code=204)
def remove_scene(scene_id: int, db: Session = Depends(get_db)):
    try:
        service.delete_scene(db, scene_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return Response(status_code=204)
