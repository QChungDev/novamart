"""Router cho module media. Prefix: /api/media"""
from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.storage import validate_upload
from app.database.base import get_db

from . import service
from .schemas import MediaUploadOut

router = APIRouter(prefix="/api/media", tags=["media"])


@router.post("/upload", response_model=MediaUploadOut, status_code=201)
def upload_ep(
    file: UploadFile = File(...),
    kind: str = Form(...),
    project_id: int | None = Form(None),
    db: Session = Depends(get_db),
):
    if kind not in ("image", "video", "audio"):
        raise HTTPException(
            status_code=400,
            detail="kind phải là một trong: image, video, audio",
        )
    ok, msg = validate_upload(file, kind)
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    try:
        asset = service.upload_media(db, file, kind, project_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return service.media_out_dict(asset)
