"""User profile, addresses, and admin user management."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies import get_current_user, require_admin
from app.modules.users.entities import User
from app.modules.users.schemas import (
    AddressCreate,
    AddressResponse,
    AddressUpdate,
    UserAdminUpdate,
    UserListItem,
    UserResponse,
    UserUpdate,
)
from app.modules.users.service import UserService

router = APIRouter(tags=["users"])


def _svc(db: Session = Depends(get_db)) -> UserService:
    return UserService(db)


@router.get("/users/me", response_model=UserResponse)
def get_profile(current: User = Depends(get_current_user)):
    return current


@router.patch("/users/me", response_model=UserResponse)
def update_profile(
    payload: UserUpdate,
    current: User = Depends(get_current_user),
    svc: UserService = Depends(_svc),
):
    return svc.update_profile(current, payload)


# --- Addresses ---

@router.get("/users/me/addresses", response_model=list[AddressResponse])
def list_addresses(current: User = Depends(get_current_user), svc: UserService = Depends(_svc)):
    return svc.list_addresses(current)


@router.post("/users/me/addresses", response_model=AddressResponse, status_code=201)
def create_address(
    payload: AddressCreate,
    current: User = Depends(get_current_user),
    svc: UserService = Depends(_svc),
):
    return svc.create_address(current, payload)


@router.patch("/users/me/addresses/{address_id}", response_model=AddressResponse)
def update_address(
    address_id: int,
    payload: AddressUpdate,
    current: User = Depends(get_current_user),
    svc: UserService = Depends(_svc),
):
    return svc.update_address(current, address_id, payload)


@router.delete("/users/me/addresses/{address_id}", status_code=204)
def delete_address(
    address_id: int,
    current: User = Depends(get_current_user),
    svc: UserService = Depends(_svc),
):
    svc.delete_address(current, address_id)
    return None


# --- Admin ---

@router.get("/users", response_model=dict)
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    q: str | None = None,
    admin: User = Depends(require_admin),
    svc: UserService = Depends(_svc),
):
    items, total = svc.list_users(page, page_size, q)
    data = []
    for u in items:
        orders, spent = svc.users.order_stats(u.id)
        item = UserListItem.model_validate(u)
        item.total_orders = orders
        item.total_spent = spent
        data.append(item)
    return {"items": data, "total": total, "page": page, "page_size": page_size}


@router.patch("/users/{user_id}", response_model=UserResponse)
def admin_update_user(
    user_id: int,
    payload: UserAdminUpdate,
    admin: User = Depends(require_admin),
    svc: UserService = Depends(_svc),
):
    return svc.admin_update(user_id, payload)
