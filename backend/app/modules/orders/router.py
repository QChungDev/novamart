"""Order endpoints."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies import get_current_user, get_optional_user, require_admin
from app.modules.orders.schemas import (
    CheckoutRequest,
    OrderResponse,
    OrderStatusUpdate,
    PaginatedOrders,
)
from app.modules.orders.service import OrderService
from app.modules.users.entities import User

router = APIRouter(prefix="/orders", tags=["orders"])


def _svc(db: Session = Depends(get_db)) -> OrderService:
    return OrderService(db)


@router.post("/checkout", response_model=OrderResponse, status_code=201)
def checkout(
    payload: CheckoutRequest,
    user: User | None = Depends(get_optional_user),
    svc: OrderService = Depends(_svc),
):
    return svc.checkout(user, payload)


@router.get("", response_model=PaginatedOrders)
def list_orders(
    status: str | None = None,
    q: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current: User = Depends(get_current_user),
    svc: OrderService = Depends(_svc),
):
    is_admin = current.role == "admin"
    return svc.list_orders(user=current, is_admin=is_admin,
                           status=status, q=q, page=page, page_size=page_size)


@router.get("/{code}", response_model=OrderResponse)
def get_order(
    code: str,
    current: User = Depends(get_current_user),
    svc: OrderService = Depends(_svc),
):
    return svc.get_by_code(code, user=current, is_admin=current.role == "admin")


@router.post("/{code}/cancel", response_model=OrderResponse)
def cancel_order(
    code: str,
    current: User = Depends(get_current_user),
    svc: OrderService = Depends(_svc),
):
    return svc.cancel_by_customer(code, current)


@router.patch("/{order_id}/status", response_model=OrderResponse)
def update_order_status(
    order_id: int,
    payload: OrderStatusUpdate,
    admin: User = Depends(require_admin),
    svc: OrderService = Depends(_svc),
):
    return svc.update_status(order_id, payload.status, payload.note, actor=f"admin:{admin.id}")
