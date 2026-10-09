"""Category persistence."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.categories.entities import Category
from app.modules.products.entities import Product


class CategoryRepository:
    def __init__(self, db: Session):
        self.db = db

    def list(self) -> list[tuple[Category, int]]:
        stmt = (
            select(Category, func.count(Product.id))
            .outerjoin(Product, (Product.category_id == Category.id) & (Product.status == "active"))
            .group_by(Category.id)
            .order_by(Category.name)
        )
        return list(self.db.execute(stmt).all())

    def get(self, category_id: int) -> Category | None:
        return self.db.get(Category, category_id)

    def get_by_slug(self, slug: str) -> Category | None:
        return self.db.scalar(select(Category).where(Category.slug == slug))

    def create(self, **data) -> Category:
        cat = Category(**data)
        self.db.add(cat)
        self.db.flush()
        return cat

    def delete(self, cat: Category) -> None:
        self.db.delete(cat)
        self.db.flush()

    def product_count(self, category_id: int) -> int:
        return self.db.scalar(
            select(func.count(Product.id)).where(Product.category_id == category_id)
        ) or 0
