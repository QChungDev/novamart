"""Product business logic."""

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.modules.categories.repository import CategoryRepository
from app.modules.products.entities import Product
from app.modules.products.repository import ProductRepository
from app.modules.products.schemas import (
    PaginatedProducts,
    ProductCreate,
    ProductResponse,
    ProductUpdate,
    ReviewCreate,
    ReviewResponse,
)
from app.modules.users.entities import User


def to_response(p: Product) -> ProductResponse:
    effective = p.sale_price if p.sale_price is not None else p.price
    discount = 0
    if p.sale_price is not None and p.price > 0:
        discount = round((1 - float(p.sale_price) / float(p.price)) * 100)
    data = {c.key: getattr(p, c.key) for c in p.__table__.columns}
    data["category_name"] = p.category.name if p.category else None
    data["effective_price"] = effective
    data["discount_percent"] = discount
    # specs stored as JSON list of dicts
    data["specs"] = p.specs or []
    data["images"] = p.images or []
    data["tags"] = p.tags or []
    return ProductResponse.model_validate(data)


class ProductService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ProductRepository(db)
        self.categories = CategoryRepository(db)

    def search(self, **filters) -> PaginatedProducts:
        if filters.get("category_slug"):
            cat = self.categories.get_by_slug(filters.pop("category_slug"))
            if not cat:
                return PaginatedProducts(items=[], total=0,
                                         page=filters.get("page", 1),
                                         page_size=filters.get("page_size", 12))
            filters["category_id"] = cat.id
        items, total = self.repo.search(**filters)
        return PaginatedProducts(
            items=[to_response(p) for p in items],
            total=total,
            page=filters.get("page", 1),
            page_size=filters.get("page_size", 12),
        )

    def get_by_slug(self, slug: str) -> ProductResponse:
        p = self.repo.get_by_slug(slug)
        if not p:
            raise NotFoundError("Không tìm thấy sản phẩm.")
        return to_response(p)

    def get_related(self, product_id: int, limit: int = 4) -> list[ProductResponse]:
        p = self.repo.get(product_id)
        if not p:
            raise NotFoundError("Không tìm thấy sản phẩm.")
        items, _ = self.repo.search(
            category_id=p.category_id, page=1, page_size=limit + 1, public_only=True
        )
        related = [x for x in items if x.id != p.id][:limit]
        return [to_response(x) for x in related]

    def price_bounds(self) -> dict:
        lo, hi = self.repo.price_bounds()
        return {"min": lo, "max": hi}

    # --- Admin ---

    def _validate(self, data: dict, existing: Product | None = None) -> None:
        sku = data.get("sku")
        if sku and sku != (existing.sku if existing else None):
            if self.repo.get_by_sku(sku):
                raise ConflictError("SKU đã tồn tại.")
        slug = data.get("slug")
        if slug and slug != (existing.slug if existing else None):
            if self.repo.get_by_slug(slug, public_only=False):
                raise ConflictError("Slug đã tồn tại.")
        category_id = data.get("category_id")
        if category_id and not self.categories.get(category_id):
            raise ValidationError("Danh mục không tồn tại.")
        price = data.get("price", existing.price if existing else None)
        sale = data.get("sale_price", existing.sale_price if existing else None)
        if sale is not None and price is not None and sale >= price:
            raise ValidationError("Giá khuyến mãi phải nhỏ hơn giá gốc.")

    def create(self, data: ProductCreate) -> ProductResponse:
        payload = data.model_dump()
        self._validate(payload)
        product = self.repo.create(**payload)
        self.db.commit()
        self.db.refresh(product)
        return to_response(self.repo.get(product.id))

    def update(self, product_id: int, data: ProductUpdate) -> ProductResponse:
        product = self.repo.get(product_id)
        if not product:
            raise NotFoundError("Không tìm thấy sản phẩm.")
        patch = data.model_dump(exclude_unset=True)
        if "specs" in patch and patch["specs"] is not None:
            patch["specs"] = [s.model_dump() if hasattr(s, "model_dump") else s for s in patch["specs"]]
        self._validate(patch, existing=product)
        for k, v in patch.items():
            setattr(product, k, v)
        self.db.commit()
        self.db.refresh(product)
        return to_response(self.repo.get(product.id))

    def deactivate(self, product_id: int) -> ProductResponse:
        product = self.repo.get(product_id)
        if not product:
            raise NotFoundError("Không tìm thấy sản phẩm.")
        product.status = "inactive"
        self.db.commit()
        self.db.refresh(product)
        return to_response(self.repo.get(product.id))

    # --- Reviews ---

    def list_reviews(self, product_id: int) -> list[ReviewResponse]:
        if not self.repo.get(product_id):
            raise NotFoundError("Không tìm thấy sản phẩm.")
        return [ReviewResponse.model_validate(r) for r in self.repo.list_reviews(product_id)]

    def add_review(self, product_id: int, user: User, data: ReviewCreate) -> ReviewResponse:
        product = self.repo.get(product_id)
        if not product:
            raise NotFoundError("Không tìm thấy sản phẩm.")
        review = self.repo.add_review(
            product_id=product_id,
            user_id=user.id,
            author_name=user.name,
            rating=data.rating,
            title=data.title,
            content=data.content,
            verified=True,
        )
        # Update aggregate rating.
        reviews = self.repo.list_reviews(product_id)
        product.review_count = len(reviews)
        product.rating = round(sum(r.rating for r in reviews) / len(reviews), 1) if reviews else 0
        self.db.commit()
        self.db.refresh(review)
        return ReviewResponse.model_validate(review)
