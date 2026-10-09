"""Authentication business logic: register, login, refresh."""

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, UnauthorizedError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.modules.auth.schemas import TokenPair
from app.modules.users.entities import User
from app.modules.users.repository import UserRepository


class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.users = UserRepository(db)

    def register(self, *, email: str, password: str, name: str, phone: str = "") -> tuple[User, TokenPair]:
        if self.users.get_by_email(email):
            raise ConflictError("Email đã được đăng ký.")
        user = self.users.create(
            email=email,
            password_hash=hash_password(password),
            name=name.strip(),
            phone=phone.strip(),
        )
        self.db.commit()
        self.db.refresh(user)
        return user, self._tokens(user)

    def login(self, *, email: str, password: str) -> tuple[User, TokenPair]:
        user = self.users.get_by_email(email)
        if not user or not verify_password(password, user.password_hash):
            raise UnauthorizedError("Email hoặc mật khẩu không đúng.")
        if not user.is_active:
            raise UnauthorizedError("Tài khoản đã bị khóa.")
        return user, self._tokens(user)

    def refresh(self, refresh_token: str) -> tuple[User, TokenPair]:
        user_id = decode_token(refresh_token, expected_type="refresh")
        if not user_id:
            raise UnauthorizedError("Refresh token không hợp lệ hoặc đã hết hạn.")
        user = self.users.get(int(user_id))
        if not user or not user.is_active:
            raise UnauthorizedError("Tài khoản không tồn tại hoặc đã bị khóa.")
        return user, self._tokens(user)

    @staticmethod
    def _tokens(user: User) -> TokenPair:
        sub = str(user.id)
        return TokenPair(
            access_token=create_access_token(sub),
            refresh_token=create_refresh_token(sub),
        )
