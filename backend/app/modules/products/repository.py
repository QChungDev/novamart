"""Product + Review persistence."""

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.modules.categories.entities import Category
from app.modules.products.entities import Product, Review


class ProductRepository:
    def __init__(self, db: Session):
        self.db = db

    def _base_stmt(self, *, public_only: bool):
        stmt = select(Product).options(joinedload(Product.category))
        if public_only:
            stmt = stmt.where(Product.status == "active")
        return stmt

    def search(
        self,
        *,
        q: str | None = None,
        category_id: int | None = None,
        min_price: int | None = None,
        max_price: int | None = None,
        in_stock_only: bool = False,
        on_sale_only: bool = False,
        sort: str = "popular",
        page: int = 1,
        page_size: int = 12,
        public_only: bool = True,
    ) -> tuple[list[Product], int]:
        stmt = self._base_stmt(public_only=public_only)

        if q:
            like = f"%{q}%"
            stmt = stmt.where(or_(Product.name.ilike(like), Product.sku.ilike(like)))
        if category_id:
            stmt = stmt.where(Product.category_id == category_id)
        if min_price is not None:
            stmt = stmt.where(func.coalesce(Product.sale_price, Product.price) >= min_price)
        if max_price is not None:
            stmt = stmt.where(func.coalesce(Product.sale_price, Product.price) <= max_price)
        if in_stock_only:
            stmt = stmt.where(Product.stock > 0)
        if on_sale_only:
            stmt = stmt.where(Product.sale_price.is_not(None))

        sorts = {
            "price-asc": func.coalesce(Product.sale_price, Product.price).asc(),
            "price-desc": func.coalesce(Product.sale_price, Product.price).desc(),
            "newest": Product.created_at.desc(),
            "rating": Product.rating.desc(),
            "popular": Product.sold.desc(),
        }
        stmt = stmt.order_by(sorts.get(sort, Product.sold.desc()), Product.id.desc())

        total = self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
        items = list(
            self.db.scalars(stmt.offset((page - 1) * page_size).limit(page_size)).unique().all()
        )
        return items, total

    def get(self, product_id: int) -> Product | None:
        return self.db.scalar(
            select(Product).options(joinedload(Product.category)).where(Product.id == product_id)
        )

    def get_by_slug(self, slug: str, *, public_only: bool = True) -> Product | None:
        stmt = select(Product).options(joinedload(Product.category)).where(Product.slug == slug)
        if public_only:
            stmt = stmt.where(Product.status == "active")
        return self.db.scalar(stmt)

    def get_by_sku(self, sku: str) -> Product | None:
        return self.db.scalar(select(Product).where(Product.sku == sku))

    def create(self, **data) -> Product:
        specs = data.pop("specs", [])
        data["specs"] = [s.model_dump() if hasattr(s, "model_dump") else s for s in specs]
        product = Product(**data)
        self.db.add(product)
        self.db.flush()
        return product

    def delete(self, product: Product) -> None:
        self.db.delete(product)
        self.db.flush()

    def list_reviews(self, product_id: int) -> list[Review]:
        return list(
            self.db.scalars(
                select(Review).where(Review.product_id == product_id).order_by(Review.id.desc())
            ).all()
        )

    def add_review(self, **data) -> Review:
        review = Review(**data)
        self.db.add(review)
        self.db.flush()
        return review

    def price_bounds(self) -> tuple[int, int]:
        row = self.db.execute(
            select(
                func.min(func.coalesce(Product.sale_price, Product.price)),
                func.max(func.coalesce(Product.sale_price, Product.price)),
            ).where(Product.status == "active")
        ).one()
        return int(row[0] or 0), int(row[1] or 0)
