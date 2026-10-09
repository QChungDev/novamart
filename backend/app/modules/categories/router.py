"""Category endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies import get_current_user, require_admin
from app.modules.categories.schemas import CategoryCreate, CategoryResponse, CategoryUpdate
from app.modules.categories.service import CategoryService
from app.modules.users.entities import User

router = APIRouter(prefix="/categories", tags=["categories"])


def _svc(db: Session = Depends(get_db)) -> CategoryService:
    return CategoryService(db)


@router.get("", response_model=list[CategoryResponse])
def list_categories(svc: CategoryService = Depends(_svc)):
    return svc.list()


@router.get("/{slug}", response_model=CategoryResponse)
def get_category(slug: str, svc: CategoryService = Depends(_svc)):
    return svc.get_by_slug(slug)


@router.post("", response_model=CategoryResponse, status_code=201)
def create_category(
    payload: CategoryCreate,
    admin: User = Depends(require_admin),
    svc: CategoryService = Depends(_svc),
):
    return svc.create(payload)


@router.patch("/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: int,
    payload: CategoryUpdate,
    admin: User = Depends(require_admin),
    svc: CategoryService = Depends(_svc),
):
    return svc.update(category_id, payload)


@router.delete("/{category_id}", status_code=204)
def delete_category(
    category_id: int,
    admin: User = Depends(require_admin),
    svc: CategoryService = Depends(_svc),
):
    svc.delete(category_id)
    return None
