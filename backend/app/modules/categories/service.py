"""Category business logic."""

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.modules.categories.entities import Category
from app.modules.categories.repository import CategoryRepository
from app.modules.categories.schemas import CategoryCreate, CategoryResponse, CategoryUpdate


class CategoryService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = CategoryRepository(db)

    def list(self) -> list[CategoryResponse]:
        out = []
        for cat, count in self.repo.list():
            r = CategoryResponse.model_validate(cat)
            r.product_count = count
            out.append(r)
        return out

    def get_by_slug(self, slug: str) -> CategoryResponse:
        cat = self.repo.get_by_slug(slug)
        if not cat:
            raise NotFoundError("Không tìm thấy danh mục.")
        r = CategoryResponse.model_validate(cat)
        r.product_count = self.repo.product_count(cat.id)
        return r

    def create(self, data: CategoryCreate) -> Category:
        if self.repo.get_by_slug(data.slug):
            raise ConflictError("Slug danh mục đã tồn tại.")
        cat = self.repo.create(**data.model_dump())
        self.db.commit()
        self.db.refresh(cat)
        return cat

    def update(self, category_id: int, data: CategoryUpdate) -> Category:
        cat = self.repo.get(category_id)
        if not cat:
            raise NotFoundError("Không tìm thấy danh mục.")
        patch = data.model_dump(exclude_unset=True)
        if "slug" in patch and patch["slug"] != cat.slug:
            if self.repo.get_by_slug(patch["slug"]):
                raise ConflictError("Slug danh mục đã tồn tại.")
        for k, v in patch.items():
            setattr(cat, k, v)
        self.db.commit()
        self.db.refresh(cat)
        return cat

    def delete(self, category_id: int) -> None:
        cat = self.repo.get(category_id)
        if not cat:
            raise NotFoundError("Không tìm thấy danh mục.")
        if self.repo.product_count(category_id) > 0:
            raise ValidationError("Không thể xóa danh mục đang có sản phẩm.")
        self.repo.delete(cat)
        self.db.commit()
