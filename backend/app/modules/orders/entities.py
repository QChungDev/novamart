"""Order, OrderItem (price snapshots), OrderTimeline entities.

Orders are never hard-deleted; cancellation is a status change.
"""

from decimal import Decimal

from sqlalchemy import ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.mixins import TimestampMixin

# Legal status transitions.
ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    "pending": {"confirmed", "cancelled"},
    "confirmed": {"shipping", "cancelled"},
    "shipping": {"delivered"},
    "delivered": set(),
    "cancelled": set(),
}


class Order(Base, TimestampMixin):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False, index=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    customer_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(32), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    street: Mapped[str] = mapped_column(String(512), nullable=False)
    district: Mapped[str] = mapped_column(String(128), nullable=False)
    city: Mapped[str] = mapped_column(String(128), nullable=False)
    note: Mapped[str] = mapped_column(String(1024), nullable=False, default="")

    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 0), nullable=False)
    shipping_fee: Mapped[Decimal] = mapped_column(Numeric(12, 0), nullable=False, default=0)
    discount: Mapped[Decimal] = mapped_column(Numeric(12, 0), nullable=False, default=0)
    total: Mapped[Decimal] = mapped_column(Numeric(12, 0), nullable=False)
    coupon_code: Mapped[str | None] = mapped_column(String(64), nullable=True)

    status: Mapped[str] = mapped_column(String(16), nullable=False, default="pending", index=True)
    payment_method: Mapped[str] = mapped_column(String(16), nullable=False, default="cod")
    shipping_method: Mapped[str] = mapped_column(String(16), nullable=False, default="standard")

    items: Mapped[list["OrderItem"]] = relationship(
        "OrderItem", back_populates="order", cascade="all, delete-orphan"
    )
    timeline: Mapped[list["OrderTimeline"]] = relationship(
        "OrderTimeline",
        back_populates="order",
        cascade="all, delete-orphan",
        order_by="OrderTimeline.id",
    )


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(
        ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    # Snapshots — historical orders never change when products change.
    name: Mapped[str] = mapped_column(String(512), nullable=False)
    image: Mapped[str] = mapped_column(String(1024), nullable=False, default="")
    price: Mapped[Decimal] = mapped_column(Numeric(12, 0), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)

    order: Mapped[Order] = relationship("Order", back_populates="items")


class OrderTimeline(Base, TimestampMixin):
    __tablename__ = "order_timeline"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(
        ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(String(16), nullable=False)
    note: Mapped[str] = mapped_column(String(1024), nullable=False, default="")

    order: Mapped[Order] = relationship("Order", back_populates="timeline")
