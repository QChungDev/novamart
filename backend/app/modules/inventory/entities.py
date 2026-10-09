"""Stock movement history. Every inventory change is recorded."""

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.mixins import TimestampMixin


class StockMovement(Base, TimestampMixin):
    __tablename__ = "stock_movements"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    type: Mapped[str] = mapped_column(String(16), nullable=False, index=True)  # in|out|adjust
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)  # signed
    reason: Mapped[str] = mapped_column(String(1024), nullable=False, default="")
    order_id: Mapped[int | None] = mapped_column(
        ForeignKey("orders.id", ondelete="SET NULL"), nullable=True, index=True
    )
    created_by: Mapped[str] = mapped_column(String(255), nullable=False, default="system")

    product: Mapped["Product"] = relationship("Product")
