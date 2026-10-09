"""Coupon endpoints."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies import get_current_user, require_admin
from app.modules.coupons.schemas import (
    CouponCreate,
    CouponResponse,
    CouponUpdate,
    CouponValidateRequest,
    CouponValidateResponse,
)
from app.modules.coupons.service import CouponService
from app.modules.users.entities import User

router = APIRouter(prefix="/coupons", tags=["coupons"])


def _svc(db: Session = Depends(get_db)) -> CouponService:
    return CouponService(db)


@router.post("/validate", response_model=CouponValidateResponse)
def validate_coupon(
    payload: CouponValidateRequest,
    svc: CouponService = Depends(_svc),
):
    # Public: used at checkout to preview discount. Server re-validates on order create.
    return svc.validate(payload.code, payload.subtotal)


@router.get("", response_model=dict)
def list_coupons(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: User = Depends(require_admin),
    svc: CouponService = Depends(_svc),
):
    items, total = svc.list(page=page, page_size=page_size)
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.post("", response_model=CouponResponse, status_code=201)
def create_coupon(
    payload: CouponCreate,
    admin: User = Depends(require_admin),
    svc: CouponService = Depends(_svc),
):
    return svc.create(payload)


@router.patch("/{coupon_id}", response_model=CouponResponse)
def update_coupon(
    coupon_id: int,
    payload: CouponUpdate,
    admin: User = Depends(require_admin),
    svc: CouponService = Depends(_svc),
):
    return svc.update(coupon_id, payload)


@router.delete("/{coupon_id}", status_code=204)
def delete_coupon(
    coupon_id: int,
    admin: User = Depends(require_admin),
    svc: CouponService = Depends(_svc),
):
    svc.delete(coupon_id)
    return None
