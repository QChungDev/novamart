"""Inventory endpoints (admin only)."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies import require_admin
from app.modules.inventory.schemas import (
    PaginatedMovements,
    ProductStockResponse,
    StockAdjustRequest,
    StockReceiveRequest,
)
from app.modules.inventory.service import InventoryService
from app.modules.users.entities import User

router = APIRouter(prefix="/inventory", tags=["inventory"])


def _svc(db: Session = Depends(get_db)) -> InventoryService:
    return InventoryService(db)


@router.get("/stock")
def stock_levels(
    low_only: bool = False,
    q: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: User = Depends(require_admin),
    svc: InventoryService = Depends(_svc),
):
    items, total = svc.stock_levels(low_only=low_only, q=q, page=page, page_size=page_size)
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/movements", response_model=PaginatedMovements)
def list_movements(
    product_id: int | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: User = Depends(require_admin),
    svc: InventoryService = Depends(_svc),
):
    return svc.movements(product_id=product_id, page=page, page_size=page_size)


@router.post("/receive", response_model=ProductStockResponse)
def receive_stock(
    payload: StockReceiveRequest,
    admin: User = Depends(require_admin),
    svc: InventoryService = Depends(_svc),
):
    return svc.receive(payload.product_id, payload.quantity, payload.reason,
                       actor=f"admin:{admin.id}")


@router.post("/adjust", response_model=ProductStockResponse)
def adjust_stock(
    payload: StockAdjustRequest,
    admin: User = Depends(require_admin),
    svc: InventoryService = Depends(_svc),
):
    return svc.adjust(payload.product_id, payload.new_stock, payload.reason,
                      actor=f"admin:{admin.id}")
