"""Shared FastAPI dependencies: auth, RBAC."""

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.security import decode_token
from app.db.session import get_db
from app.modules.users.entities import User

bearer_scheme = HTTPBearer(auto_error=False)


def _user_from_token(
    credentials: HTTPAuthorizationCredentials | None,
    db: Session,
) -> User | None:
    if not credentials:
        return None
    user_id = decode_token(credentials.credentials, expected_type="access")
    if not user_id:
        return None
    user = db.get(User, int(user_id))
    return user if user and user.is_active else None


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    user = _user_from_token(credentials, db)
    if not user:
        raise UnauthorizedError()
    return user


def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User | None:
    """Guest-friendly: returns None instead of 401 when no/invalid token."""
    return _user_from_token(credentials, db)


def require_admin(current: User = Depends(get_current_user)) -> User:
    if current.role != "admin":
        raise ForbiddenError("Chỉ quản trị viên mới được thực hiện thao tác này.")
    return current
