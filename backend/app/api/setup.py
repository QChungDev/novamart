"""One-time setup endpoints (protected by setup token)."""

import os

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db import models
from app.db.session import get_db

router = APIRouter(prefix="/setup", tags=["setup"])

SETUP_TOKEN = os.getenv("SETUP_TOKEN", "")


class BootstrapAdminRequest(BaseModel):
    token: str
    email: str = "admin@novamart.vn"
    password: str
    full_name: str = "Administrator"


@router.post("/bootstrap-admin")
def bootstrap_admin(payload: BootstrapAdminRequest, db: Session = Depends(get_db)):
    if not SETUP_TOKEN or payload.token != SETUP_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid setup token")
    existing_admin = db.query(models.User).filter_by(role="admin").first()
    if existing_admin:
        raise HTTPException(status_code=400, detail="Admin already exists")
    email = payload.email.strip().lower()
    if db.query(models.User).filter_by(email=email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    admin = models.User(
        email=email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        role="admin",
        is_active=True,
    )
    db.add(admin)
    db.commit()
    return {"ok": True, "email": email}
