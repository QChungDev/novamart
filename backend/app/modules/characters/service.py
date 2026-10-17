"""Logic nghiep vu cho module characters, bao gom Character Lock System."""
from __future__ import annotations

import re

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.core.storage import get_storage
from app.database.models import Character, CharacterReferenceImage, SceneCharacter, VoiceProfile

from .schemas import CharacterCreate, CharacterUpdate


# ---------- Character Lock prompt (co dinh, khong viet lai moi lan goi) ----------

DEFAULT_LOCK_RULES = ["fur color", "face", "body shape", "eye color"]


def _lock_rules_list(lock_rules) -> list[str]:
    """Trich danh sach quy tac tu lock_rules (dict hoac list). Mac dinh 4 quy tac co ban."""
    if isinstance(lock_rules, dict):
        for key in ("do_not_change", "rules", "items"):
            value = lock_rules.get(key)
            if isinstance(value, list) and value:
                return [str(x) for x in value if str(x).strip()]
        values = [str(v) for v in lock_rules.values() if v and str(v).strip()]
        if values:
            return values
    elif isinstance(lock_rules, list) and lock_rules:
        return [str(x) for x in lock_rules if str(x).strip()]
    return list(DEFAULT_LOCK_RULES)


def build_lock_prompt(character: Character, extra_refs: bool = True) -> str:
    """Dung prompt Character Lock tieng Anh co dinh cho moi canh de giu nhat quan.

    Prompt duoc ghep tu du lieu da luu, KHONG viet lai dien dat moi lan goi.
    """
    rules = _lock_rules_list(character.lock_rules)
    lines = [
        f"CHARACTER LOCK — {character.name} [{character.character_code}]",
    ]
    if character.description:
        lines.append(f"Description: {character.description}")
    lines += [
        f"Appearance: {character.appearance or 'not specified'}",
        f"Art style: {character.art_style or 'not specified'}",
        f"Colors: {character.colors or 'not specified'} | "
        f"Outfit: {character.outfit or 'not specified'} | "
        f"Accessories: {character.accessories or 'not specified'} | "
        f"Body: {character.body_ratio or 'not specified'}",
        "STRICT CONSISTENCY RULES — DO NOT change the following across any scene: "
        + "; ".join(rules)
        + ".",
        "Keep the exact same identity, proportions and identifying features in every generated frame.",
    ]
    if extra_refs:
        lines.append(
            "When reference images are provided, match the character's look in those images exactly."
        )
    return "\n".join(lines)


# ---------- character_code ----------

def _next_character_code(db: Session, name: str) -> str:
    base = re.sub(r"[^A-Za-z0-9]", "", name)[:3].upper() or "CHR"
    base = base.ljust(3, "X")
    n = 1
    while True:
        code = f"{base}_{n:03d}"
        exists = db.query(Character.id).filter(Character.character_code == code).first()
        if not exists:
            return code
        n += 1


# ---------- helpers ----------

def voice_name_of(db: Session, character: Character) -> str:
    if character.default_voice_profile_id:
        vp = db.get(VoiceProfile, character.default_voice_profile_id)
        if vp:
            return vp.name
    return ""


def image_out(img: CharacterReferenceImage) -> dict:
    return {
        "id": img.id,
        "character_id": img.character_id,
        "file_path": img.file_path,
        "image_url": get_storage().url_for(img.file_path) if img.file_path else "",
        "is_primary": img.is_primary,
        "sort_order": img.sort_order,
    }


def character_out_dict(db: Session, character: Character) -> dict:
    images = sorted(character.images, key=lambda i: i.sort_order)
    primary = next((i for i in images if i.is_primary), images[0] if images else None)
    return {
        "id": character.id,
        "name": character.name,
        "character_code": character.character_code,
        "description": character.description or "",
        "appearance": character.appearance or "",
        "colors": character.colors or "",
        "outfit": character.outfit or "",
        "accessories": character.accessories or "",
        "body_ratio": character.body_ratio or "",
        "art_style": character.art_style or "",
        "lock_rules": character.lock_rules or {},
        "default_voice_profile_id": character.default_voice_profile_id,
        "primary_image_url": (
            get_storage().url_for(primary.file_path) if primary and primary.file_path else ""
        ),
        "image_count": len(images),
        "voice_name": voice_name_of(db, character),
        "created_at": character.created_at,
        "images": [image_out(i) for i in images],
    }


# ---------- CRUD ----------

def create_character(
    db: Session, data: CharacterCreate, image_files: list[UploadFile]
) -> Character:
    code = data.character_code.strip() if data.character_code else ""
    if not code:
        code = _next_character_code(db, data.name)
    else:
        exists = db.query(Character.id).filter(Character.character_code == code).first()
        if exists:
            raise ValueError(f"Mã nhân vật '{code}' đã tồn tại")

    character = Character(
        name=data.name,
        character_code=code,
        description=data.description,
        appearance=data.appearance,
        colors=data.colors,
        outfit=data.outfit,
        accessories=data.accessories,
        body_ratio=data.body_ratio,
        art_style=data.art_style,
        lock_rules=data.lock_rules or {},
        default_voice_profile_id=data.default_voice_profile_id,
    )
    db.add(character)
    db.flush()

    _save_images(db, character, image_files)
    db.commit()
    db.refresh(character)
    return character


def _save_images(db: Session, character: Character, image_files: list[UploadFile]) -> None:
    storage = get_storage()
    existing = db.query(CharacterReferenceImage).filter(
        CharacterReferenceImage.character_id == character.id
    ).count()
    for idx, f in enumerate(image_files):
        rel = storage.save_upload(f, "characters")
        db.add(
            CharacterReferenceImage(
                character_id=character.id,
                file_path=rel,
                is_primary=(existing == 0 and idx == 0),
                sort_order=existing + idx,
            )
        )
    db.flush()


def get_character(db: Session, character_id: int) -> Character | None:
    return db.get(Character, character_id)


def list_characters(db: Session) -> list[Character]:
    return db.query(Character).order_by(Character.id.desc()).all()


def update_character(
    db: Session, character_id: int, data: CharacterUpdate
) -> Character | None:
    character = db.get(Character, character_id)
    if not character:
        return None
    updates = data.model_dump(exclude_unset=True)
    if "character_code" in updates and updates["character_code"]:
        code = updates["character_code"].strip()
        exists = (
            db.query(Character.id)
            .filter(Character.character_code == code, Character.id != character_id)
            .first()
        )
        if exists:
            raise ValueError(f"Mã nhân vật '{code}' đã tồn tại")
        updates["character_code"] = code
    for field, value in updates.items():
        setattr(character, field, value)
    db.commit()
    db.refresh(character)
    return character


def delete_character(db: Session, character_id: int) -> bool:
    character = db.get(Character, character_id)
    if not character:
        return False

    image_paths = [img.file_path for img in character.images if img.file_path]

    # Goi lien ket scene_characters (tranh vi pham FK)
    db.query(SceneCharacter).filter(SceneCharacter.character_id == character_id).delete()
    # Voice profile gan nhan vat nay -> bo gan
    db.query(VoiceProfile).filter(VoiceProfile.character_id == character_id).update(
        {"character_id": None}
    )

    db.delete(character)  # cascade ORM: character_reference_images
    db.commit()

    storage = get_storage()
    for rel in image_paths:
        try:
            storage.delete(rel)
        except Exception:
            pass
    return True


def add_images(
    db: Session, character_id: int, image_files: list[UploadFile]
) -> Character | None:
    character = db.get(Character, character_id)
    if not character:
        return None
    _save_images(db, character, image_files)
    db.commit()
    db.refresh(character)
    return character


def delete_image(db: Session, image_id: int) -> bool:
    img = db.get(CharacterReferenceImage, image_id)
    if not img:
        return False
    rel = img.file_path
    was_primary = img.is_primary
    character_id = img.character_id

    db.delete(img)
    db.flush()

    if was_primary:
        nxt = (
            db.query(CharacterReferenceImage)
            .filter(CharacterReferenceImage.character_id == character_id)
            .order_by(CharacterReferenceImage.sort_order.asc())
            .first()
        )
        if nxt:
            nxt.is_primary = True
    db.commit()

    if rel:
        try:
            get_storage().delete(rel)
        except Exception:
            pass
    return True
