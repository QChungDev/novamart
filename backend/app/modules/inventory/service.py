"""Inventory business logic."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError, ValidationError
from app.modules.inventory.entities import StockMovement
from app.modules.inventory.schemas import (
    PaginatedMovements,
    ProductStockResponse,
    StockMovementResponse,
)
from app.modules.products.entities import Product

LOW_STOCK_THRESHOLD = 10


class InventoryService:
    def __init__(self, db: Session):
        self.db = db

    def _product_or_404(self, product_id: int) -> Product:
        product = self.db.scalar(
            select(Product).where(Product.id == product_id).with_for_update()
        )
        if not product:
            raise NotFoundError("Không tìm thấy sản phẩm.")
        return product

    def stock_levels(self, *, low_only: bool = False, q: str | None = None,
                     page: int = 1, page_size: int = 20):
        stmt = select(Product).order_by(Product.stock.asc(), Product.id.desc())
        if low_only:
            stmt = stmt.where(Product.stock <= LOW_STOCK_THRESHOLD)
        if q:
            like = f"%{q}%"
            stmt = stmt.where(Product.name.ilike(like) | Product.sku.ilike(like))
        total = self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
        items = list(self.db.scalars(stmt.offset((page - 1) * page_size).limit(page_size)).all())
        return (
            [
                ProductStockResponse(
                    product_id=p.id, sku=p.sku, name=p.name,
                    image=(p.images or [""])[0], stock=p.stock, sold=p.sold,
                    low_stock=p.stock <= LOW_STOCK_THRESHOLD,
                )
                for p in items
            ],
            total,
        )

    def movements(self, *, product_id: int | None = None, page: int = 1,
                  page_size: int = 20) -> PaginatedMovements:
        stmt = select(StockMovement).order_by(StockMovement.id.desc())
        if product_id:
            stmt = stmt.where(StockMovement.product_id == product_id)
        total = self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
        rows = list(self.db.scalars(stmt.offset((page - 1) * page_size).limit(page_size)).all())
        items = []
        for m in rows:
            r = StockMovementResponse.model_validate(m)
            product = self.db.get(Product, m.product_id)
            r.product_name = product.name if product else ""
            items.append(r)
        return PaginatedMovements(items=items, total=total, page=page, page_size=page_size)

    def receive(self, product_id: int, quantity: int, reason: str, actor: str) -> ProductStockResponse:
        try:
            product = self._product_or_404(product_id)
            product.stock += quantity
            self.db.add(StockMovement(
                product_id=product.id, type="in", quantity=quantity,
                reason=reason, created_by=actor,
            ))
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
        self.db.refresh(product)
        return ProductStockResponse(
            product_id=product.id, sku=product.sku, name=product.name,
            image=(product.images or [""])[0], stock=product.stock, sold=product.sold,
            low_stock=product.stock <= LOW_STOCK_THRESHOLD,
        )

    def adjust(self, product_id: int, new_stock: int, reason: str, actor: str) -> ProductStockResponse:
        try:
            product = self._product_or_404(product_id)
            delta = new_stock - product.stock
            if delta == 0:
                raise ValidationError("Tồn kho mới trùng với tồn kho hiện tại.")
            product.stock = new_stock
            self.db.add(StockMovement(
                product_id=product.id, type="adjust", quantity=delta,
                reason=reason, created_by=actor,
            ))
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
        self.db.refresh(product)
        return ProductStockResponse(
            product_id=product.id, sku=product.sku, name=product.name,
            image=(product.images or [""])[0], stock=product.stock, sold=product.sold,
            low_stock=product.stock <= LOW_STOCK_THRESHOLD,
        )
