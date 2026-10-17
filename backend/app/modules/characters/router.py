"""Router cho module characters. Prefix: /api/characters"""
from __future__ import annotations

import json

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.storage import validate_upload
from app.database.base import get_db

from . import service
from .schemas import CharacterOut, CharacterUpdate, LockPromptOut

router = APIRouter(prefix="/api/characters", tags=["characters"])

NOT_FOUND = "Không tìm thấy nhân vật"


def _check_images(images: list[UploadFile]) -> None:
    for f in images:
        ok, msg = validate_upload(f, "image")
        if not ok:
            raise HTTPException(status_code=400, detail=f"Ảnh '{f.filename}': {msg}")


@router.get("/", response_model=list[CharacterOut])
def list_characters_ep(db: Session = Depends(get_db)):
    return [service.character_out_dict(db, c) for c in service.list_characters(db)]


@router.post("/", response_model=CharacterOut, status_code=201)
def create_character_ep(
    name: str = Form(...),
    character_code: str = Form(""),
    description: str = Form(""),
    appearance: str = Form(""),
    colors: str = Form(""),
    outfit: str = Form(""),
    accessories: str = Form(""),
    body_ratio: str = Form(""),
    art_style: str = Form(""),
    lock_rules: str = Form("{}"),
    default_voice_profile_id: int | None = Form(None),
    images: list[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
):
    try:
        lock_rules_dict = json.loads(lock_rules) if lock_rules else {}
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="lock_rules không phải JSON hợp lệ")
    if not isinstance(lock_rules_dict, dict):
        raise HTTPException(status_code=400, detail="lock_rules phải là object JSON")

    _check_images(images)

    from .schemas import CharacterCreate

    try:
        character = service.create_character(
            db,
            CharacterCreate(
                name=name,
                character_code=character_code,
                description=description,
                appearance=appearance,
                colors=colors,
                outfit=outfit,
                accessories=accessories,
                body_ratio=body_ratio,
                art_style=art_style,
                lock_rules=lock_rules_dict,
                default_voice_profile_id=default_voice_profile_id,
            ),
            images,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return service.character_out_dict(db, character)


@router.get("/{character_id}", response_model=CharacterOut)
def get_character_ep(character_id: int, db: Session = Depends(get_db)):
    character = service.get_character(db, character_id)
    if not character:
        raise HTTPException(status_code=404, detail=NOT_FOUND)
    return service.character_out_dict(db, character)


@router.patch("/{character_id}", response_model=CharacterOut)
def update_character_ep(
    character_id: int, data: CharacterUpdate, db: Session = Depends(get_db)
):
    try:
        character = service.update_character(db, character_id, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not character:
        raise HTTPException(status_code=404, detail=NOT_FOUND)
    return service.character_out_dict(db, character)


@router.delete("/{character_id}", status_code=204)
def delete_character_ep(character_id: int, db: Session = Depends(get_db)):
    if not service.delete_character(db, character_id):
        raise HTTPException(status_code=404, detail=NOT_FOUND)
    return None


@router.post("/{character_id}/images", response_model=CharacterOut)
def add_images_ep(
    character_id: int,
    images: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
):
    if not images:
        raise HTTPException(status_code=400, detail="Chưa chọn ảnh nào")
    _check_images(images)
    character = service.add_images(db, character_id, images)
    if not character:
        raise HTTPException(status_code=404, detail=NOT_FOUND)
    return service.character_out_dict(db, character)


@router.delete("/images/{image_id}", status_code=204)
def delete_image_ep(image_id: int, db: Session = Depends(get_db)):
    if not service.delete_image(db, image_id):
        raise HTTPException(status_code=404, detail="Không tìm thấy ảnh")
    return None


@router.get("/{character_id}/lock-prompt", response_model=LockPromptOut)
def lock_prompt_ep(character_id: int, db: Session = Depends(get_db)):
    character = service.get_character(db, character_id)
    if not character:
        raise HTTPException(status_code=404, detail=NOT_FOUND)
    return {"prompt": service.build_lock_prompt(character)}
