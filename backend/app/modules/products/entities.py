"""Product + Review entities. Money uses DECIMAL, never float."""

from decimal import Decimal

from sqlalchemy import JSON, DECIMAL, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.mixins import TimestampMixin


class Product(Base, TimestampMixin):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    sku: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(512), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(512), unique=True, nullable=False, index=True)
    category_id: Mapped[int | None] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True
    )
    description: Mapped[str] = mapped_column(String(8192), nullable=False, default="")
    price: Mapped[Decimal] = mapped_column(Numeric(12, 0), nullable=False)
    sale_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 0), nullable=True)
    stock: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    sold: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    images: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    specs: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    tags: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    rating: Mapped[float] = mapped_column(default=0.0, nullable=False)
    review_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_featured: Mapped[bool] = mapped_column(default=False, nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="active", index=True)

    category: Mapped["Category | None"] = relationship("Category", back_populates="products")
    reviews: Mapped[list["Review"]] = relationship("Review", back_populates="product")


class Review(Base, TimestampMixin):
    __tablename__ = "reviews"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    author_name: Mapped[str] = mapped_column(String(255), nullable=False)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(512), nullable=False, default="")
    content: Mapped[str] = mapped_column(String(4096), nullable=False, default="")
    verified: Mapped[bool] = mapped_column(default=False, nullable=False)

    product: Mapped[Product] = relationship("Product", back_populates="reviews")
