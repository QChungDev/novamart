"""Auth endpoints: register, login, refresh, me, logout."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies import get_current_user
from app.modules.auth.schemas import (
    AuthResponse,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenPair,
)
from app.modules.auth.service import AuthService
from app.modules.users.entities import User
from app.modules.users.schemas import UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse, status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    user, tokens = AuthService(db).register(
        email=payload.email,
        password=payload.password,
        name=payload.name,
        phone=payload.phone,
    )
    return AuthResponse(user=user, tokens=tokens)


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user, tokens = AuthService(db).login(email=payload.email, password=payload.password)
    return AuthResponse(user=user, tokens=tokens)


@router.post("/refresh", response_model=TokenPair)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    _, tokens = AuthService(db).refresh(payload.refresh_token)
    return tokens


@router.get("/me", response_model=UserResponse)
def me(current: User = Depends(get_current_user)):
    return current


@router.post("/logout")
def logout():
    # Stateless JWT: client discards tokens. Kept for API symmetry.
    return {"ok": True}
