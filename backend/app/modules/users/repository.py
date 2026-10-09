"""User + Address persistence."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.orders.entities import Order
from app.modules.users.entities import Address, User


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, user_id: int) -> User | None:
        return self.db.get(User, user_id)

    def get_by_email(self, email: str) -> User | None:
        return self.db.scalar(select(User).where(User.email == email.lower()))

    def create(self, *, email: str, password_hash: str, name: str, phone: str = "",
               role: str = "customer") -> User:
        user = User(email=email.lower(), password_hash=password_hash,
                    name=name, phone=phone, role=role)
        self.db.add(user)
        self.db.flush()
        return user

    def list(self, *, page: int = 1, page_size: int = 20, q: str | None = None):
        stmt = select(User).order_by(User.id.desc())
        if q:
            like = f"%{q}%"
            stmt = stmt.where(User.email.ilike(like) | User.name.ilike(like))
        total = self.db.scalar(select(func.count()).select_from(stmt.subquery()))
        items = self.db.scalars(stmt.offset((page - 1) * page_size).limit(page_size)).all()
        return list(items), total or 0

    def order_stats(self, user_id: int) -> tuple[int, int]:
        total_orders = self.db.scalar(
            select(func.count(Order.id)).where(Order.user_id == user_id)
        ) or 0
        total_spent = self.db.scalar(
            select(func.coalesce(func.sum(Order.total), 0)).where(
                Order.user_id == user_id, Order.status != "cancelled"
            )
        ) or 0
        return total_orders, int(total_spent)


class AddressRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_for_user(self, user_id: int) -> list[Address]:
        return list(self.db.scalars(
            select(Address).where(Address.user_id == user_id).order_by(Address.is_default.desc(), Address.id.desc())
        ).all())

    def get(self, address_id: int, user_id: int) -> Address | None:
        return self.db.scalar(
            select(Address).where(Address.id == address_id, Address.user_id == user_id)
        )

    def create(self, user_id: int, **data) -> Address:
        if data.get("is_default"):
            self.db.query(Address).filter(Address.user_id == user_id).update({"is_default": False})
        addr = Address(user_id=user_id, **data)
        self.db.add(addr)
        self.db.flush()
        return addr

    def update(self, addr: Address, **data) -> Address:
        if data.get("is_default"):
            self.db.query(Address).filter(
                Address.user_id == addr.user_id, Address.id != addr.id
            ).update({"is_default": False})
        for k, v in data.items():
            if v is not None:
                setattr(addr, k, v)
        self.db.flush()
        return addr

    def delete(self, addr: Address) -> None:
        self.db.delete(addr)
        self.db.flush()
