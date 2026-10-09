"""Order persistence."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.modules.orders.entities import ALLOWED_TRANSITIONS, Order, OrderItem, OrderTimeline


class OrderRepository:
    def __init__(self, db: Session):
        self.db = db

    def _detail_stmt(self):
        return select(Order).options(
            selectinload(Order.items), selectinload(Order.timeline)
        )

    def get(self, order_id: int) -> Order | None:
        return self.db.scalar(self._detail_stmt().where(Order.id == order_id))

    def get_by_code(self, code: str) -> Order | None:
        return self.db.scalar(self._detail_stmt().where(Order.code == code))

    def list(
        self,
        *,
        user_id: int | None = None,
        status: str | None = None,
        q: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Order], int]:
        stmt = self._detail_stmt().order_by(Order.id.desc())
        if user_id is not None:
            stmt = stmt.where(Order.user_id == user_id)
        if status:
            stmt = stmt.where(Order.status == status)
        if q:
            like = f"%{q}%"
            stmt = stmt.where(Order.code.ilike(like) | Order.customer_name.ilike(like)
                              | Order.phone.ilike(like))
        total = self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
        items = list(self.db.scalars(
            stmt.offset((page - 1) * page_size).limit(page_size)
        ).all())
        return items, total

    def create(self, **data) -> Order:
        items_data = data.pop("items", [])
        order = Order(**data)
        self.db.add(order)
        self.db.flush()
        for item_data in items_data:
            self.db.add(OrderItem(order_id=order.id, **item_data))
        self.db.flush()
        return order

    def add_timeline(self, order: Order, status: str, note: str = "") -> None:
        self.db.add(OrderTimeline(order_id=order.id, status=status, note=note))
        self.db.flush()

    @staticmethod
    def can_transition(from_status: str, to_status: str) -> bool:
        return to_status in ALLOWED_TRANSITIONS.get(from_status, set())
