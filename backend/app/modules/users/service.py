"""User business logic."""

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError, ValidationError
from app.modules.users.entities import Address, User
from app.modules.users.repository import AddressRepository, UserRepository
from app.modules.users.schemas import AddressCreate, AddressUpdate, UserAdminUpdate, UserUpdate


class UserService:
    def __init__(self, db: Session):
        self.db = db
        self.users = UserRepository(db)
        self.addresses = AddressRepository(db)

    def update_profile(self, user: User, data: UserUpdate) -> User:
        if data.name is not None:
            if len(data.name.strip()) < 2:
                raise ValidationError("Tên phải có ít nhất 2 ký tự.")
            user.name = data.name.strip()
        if data.phone is not None:
            user.phone = data.phone.strip()
        self.db.flush()
        return user

    def admin_update(self, user_id: int, data: UserAdminUpdate) -> User:
        user = self.users.get(user_id)
        if not user:
            raise NotFoundError("Không tìm thấy người dùng.")
        if data.is_active is not None:
            user.is_active = data.is_active
        if data.role is not None:
            user.role = data.role
        self.db.flush()
        return user

    def list_users(self, page: int, page_size: int, q: str | None):
        return self.users.list(page=page, page_size=page_size, q=q)

    # --- Addresses ---

    def list_addresses(self, user: User) -> list[Address]:
        return self.addresses.list_for_user(user.id)

    def create_address(self, user: User, data: AddressCreate) -> Address:
        return self.addresses.create(user.id, **data.model_dump())

    def update_address(self, user: User, address_id: int, data: AddressUpdate) -> Address:
        addr = self.addresses.get(address_id, user.id)
        if not addr:
            raise NotFoundError("Không tìm thấy địa chỉ.")
        return self.addresses.update(addr, **data.model_dump(exclude_unset=True))

    def delete_address(self, user: User, address_id: int) -> None:
        addr = self.addresses.get(address_id, user.id)
        if not addr:
            raise NotFoundError("Không tìm thấy địa chỉ.")
        self.addresses.delete(addr)
