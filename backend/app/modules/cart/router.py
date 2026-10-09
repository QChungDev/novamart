"""Cart endpoints (authenticated customers)."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies import get_current_user
from app.modules.cart.schemas import CartItemAdd, CartItemUpdate, CartResponse
from app.modules.cart.service import CartService
from app.modules.users.entities import User

router = APIRouter(prefix="/cart", tags=["cart"])


def _svc(db: Session = Depends(get_db)) -> CartService:
    return CartService(db)


@router.get("", response_model=CartResponse)
def get_cart(current: User = Depends(get_current_user), svc: CartService = Depends(_svc)):
    return svc.get_cart(current)


@router.post("/items", response_model=CartResponse)
def add_item(payload: CartItemAdd, current: User = Depends(get_current_user),
             svc: CartService = Depends(_svc)):
    return svc.add_item(current, payload.product_id, payload.quantity)


@router.patch("/items/{product_id}", response_model=CartResponse)
def set_quantity(product_id: int, payload: CartItemUpdate,
                 current: User = Depends(get_current_user),
                 svc: CartService = Depends(_svc)):
    return svc.set_quantity(current, product_id, payload.quantity)


@router.delete("/items/{product_id}", response_model=CartResponse)
def remove_item(product_id: int, current: User = Depends(get_current_user),
                svc: CartService = Depends(_svc)):
    return svc.remove_item(current, product_id)


@router.delete("", response_model=CartResponse)
def clear_cart(current: User = Depends(get_current_user), svc: CartService = Depends(_svc)):
    return svc.clear(current)
