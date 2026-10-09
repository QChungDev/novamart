"""Product endpoints."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies import get_current_user, require_admin
from app.modules.products.schemas import (
    PaginatedProducts,
    ProductCreate,
    ProductResponse,
    ProductUpdate,
    ReviewCreate,
    ReviewResponse,
)
from app.modules.products.service import ProductService
from app.modules.users.entities import User

router = APIRouter(prefix="/products", tags=["products"])


def _svc(db: Session = Depends(get_db)) -> ProductService:
    return ProductService(db)


@router.get("", response_model=PaginatedProducts)
def list_products(
    q: str | None = None,
    category: str | None = Query(default=None, description="Category slug"),
    min_price: int | None = Query(default=None, ge=0),
    max_price: int | None = Query(default=None, ge=0),
    in_stock: bool = False,
    on_sale: bool = False,
    sort: str = Query(default="popular",
                      pattern="^(popular|price-asc|price-desc|newest|rating)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=60),
    featured: bool = False,
    svc: ProductService = Depends(_svc),
):
    kwargs: dict = dict(
        q=q, min_price=min_price, max_price=max_price,
        in_stock_only=in_stock, on_sale_only=on_sale,
        sort=sort, page=page, page_size=page_size,
    )
    if category:
        kwargs["category_slug"] = category
    result = svc.search(**kwargs)
    if featured:
        result.items = [p for p in result.items if p.is_featured]
    return result


@router.get("/price-bounds")
def get_price_bounds(svc: ProductService = Depends(_svc)):
    return svc.price_bounds()


@router.get("/{slug}", response_model=ProductResponse)
def get_product(slug: str, svc: ProductService = Depends(_svc)):
    return svc.get_by_slug(slug)


@router.get("/{product_id}/related", response_model=list[ProductResponse])
def get_related(product_id: int, limit: int = Query(4, ge=1, le=12),
                svc: ProductService = Depends(_svc)):
    return svc.get_related(product_id, limit)


@router.get("/{product_id}/reviews", response_model=list[ReviewResponse])
def list_reviews(product_id: int, svc: ProductService = Depends(_svc)):
    return svc.list_reviews(product_id)


@router.post("/{product_id}/reviews", response_model=ReviewResponse, status_code=201)
def add_review(
    product_id: int,
    payload: ReviewCreate,
    current: User = Depends(get_current_user),
    svc: ProductService = Depends(_svc),
):
    return svc.add_review(product_id, current, payload)


# --- Admin ---

@router.post("", response_model=ProductResponse, status_code=201)
def create_product(
    payload: ProductCreate,
    admin: User = Depends(require_admin),
    svc: ProductService = Depends(_svc),
):
    return svc.create(payload)


@router.patch("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    admin: User = Depends(require_admin),
    svc: ProductService = Depends(_svc),
):
    return svc.update(product_id, payload)


@router.delete("/{product_id}", response_model=ProductResponse)
def deactivate_product(
    product_id: int,
    admin: User = Depends(require_admin),
    svc: ProductService = Depends(_svc),
):
    # Safe "delete": deactivate instead of hard delete.
    return svc.deactivate(product_id)
