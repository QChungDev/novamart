"""Router cho voices: /api/voices."""
from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

from app.core.storage import get_storage
from app.database.base import get_db
from app.database.models import Character, VoiceProfile
from app.modules.voices import service
from app.modules.voices.schemas import (
    AssignRequest,
    PreviewRequest,
    PreviewResponse,
    TtsVoice,
    VoiceProfileCreate,
    VoiceProfileOut,
    VoiceProfileUpdate,
)

router = APIRouter(prefix="/api/voices", tags=["voices"])


def _unset_others_default(db: Session, character_id: int, except_id: int | None = None) -> None:
    q = db.query(VoiceProfile).filter(
        VoiceProfile.character_id == character_id,
        VoiceProfile.is_default.is_(True),
    )
    if except_id is not None:
        q = q.filter(VoiceProfile.id != except_id)
    for v in q.all():
        v.is_default = False


def _voice_out(db: Session, v: VoiceProfile, char_names: dict[int, str]) -> VoiceProfileOut:
    storage = get_storage()
    out = VoiceProfileOut.model_validate(v)
    out.character_name = char_names.get(v.character_id) if v.character_id else None
    out.sample_url = storage.url_for(v.sample_path) if v.sample_path else None
    return out


def _char_names(db: Session) -> dict[int, str]:
    return {c.id: c.name for c in db.query(Character.id, Character.name).all()}


@router.get("/", response_model=list[VoiceProfileOut])
def list_voices(db: Session = Depends(get_db)):
    voices = db.query(VoiceProfile).order_by(VoiceProfile.created_at.desc()).all()
    names = _char_names(db)
    return [_voice_out(db, v, names) for v in voices]


@router.post("/", response_model=VoiceProfileOut, status_code=201)
def create_voice(payload: VoiceProfileCreate, db: Session = Depends(get_db)):
    if not payload.name.strip():
        raise HTTPException(status_code=400, detail="Tên hồ sơ giọng nói không được để trống.")
    if not payload.provider_voice_id.strip():
        raise HTTPException(status_code=400, detail="Chưa chọn giọng đọc của nhà cung cấp (provider_voice_id).")
    if payload.character_id is not None and not db.get(Character, payload.character_id):
        raise HTTPException(status_code=404, detail=f"Không tìm thấy nhân vật (id={payload.character_id}).")
    v = VoiceProfile(
        name=payload.name.strip(),
        character_id=payload.character_id,
        gender=payload.gender,
        language=payload.language,
        accent=payload.accent,
        pitch=payload.pitch,
        rate=payload.rate,
        tone=payload.tone,
        provider=payload.provider,
        provider_voice_id=payload.provider_voice_id.strip(),
        is_default=payload.is_default,
    )
    db.add(v)
    db.flush()
    if payload.is_default and payload.character_id is not None:
        _unset_others_default(db, payload.character_id, except_id=v.id)
    db.commit()
    db.refresh(v)
    return _voice_out(db, v, _char_names(db))


@router.post("/preview", response_model=PreviewResponse)
def preview_voice(payload: PreviewRequest, db: Session = Depends(get_db)):
    storage = get_storage()
    subdir = Path("voice_samples")
    (storage.abs_path("") / subdir).mkdir(parents=True, exist_ok=True)
    rel = f"{subdir}/preview_{uuid.uuid4().hex}.mp3"
    dest = storage.abs_path(rel)
    try:
        service.synthesize_speech(
            payload.text, payload.provider_voice_id, payload.rate, payload.pitch, str(dest)
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    return PreviewResponse(audio_url=storage.url_for(rel))


@router.patch("/{voice_id}", response_model=VoiceProfileOut)
def update_voice(voice_id: int, payload: VoiceProfileUpdate, db: Session = Depends(get_db)):
    v = db.get(VoiceProfile, voice_id)
    if not v:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy hồ sơ giọng nói (id={voice_id}).")
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(v, field, value)
    if data.get("is_default") and v.character_id is not None:
        _unset_others_default(db, v.character_id, except_id=v.id)
    db.commit()
    db.refresh(v)
    return _voice_out(db, v, _char_names(db))


@router.delete("/{voice_id}", status_code=204)
def delete_voice(voice_id: int, db: Session = Depends(get_db)):
    v = db.get(VoiceProfile, voice_id)
    if not v:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy hồ sơ giọng nói (id={voice_id}).")
    # go lien ket default khoi character
    for c in db.query(Character).filter(Character.default_voice_profile_id == voice_id).all():
        c.default_voice_profile_id = None
    if v.sample_path:
        get_storage().delete(v.sample_path)
    db.delete(v)
    db.commit()
    return Response(status_code=204)


@router.post("/assign", response_model=VoiceProfileOut)
def assign_voice(payload: AssignRequest, db: Session = Depends(get_db)):
    character = db.get(Character, payload.character_id)
    if not character:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy nhân vật (id={payload.character_id}).")
    v = db.get(VoiceProfile, payload.voice_profile_id)
    if not v:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy hồ sơ giọng nói (id={payload.voice_profile_id}).")
    v.character_id = character.id
    v.is_default = True
    _unset_others_default(db, character.id, except_id=v.id)
    character.default_voice_profile_id = v.id
    db.commit()
    db.refresh(v)
    return _voice_out(db, v, _char_names(db))


@router.get("/tts/voices", response_model=list[TtsVoice])
def tts_voices(language: str = Query(default="vi-VN")):
    try:
        return [TtsVoice(**v) for v in service.list_edge_tts_voices(language)]
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
