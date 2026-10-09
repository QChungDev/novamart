"""Coupon business logic."""

from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.modules.coupons.entities import Coupon
from app.modules.coupons.schemas import (
    CouponCreate,
    CouponResponse,
    CouponUpdate,
    CouponValidateResponse,
)


class CouponService:
    def __init__(self, db: Session):
        self.db = db

    def list(self, *, page: int = 1, page_size: int = 20):
        stmt = select(Coupon).order_by(Coupon.id.desc())
        total = self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
        items = list(self.db.scalars(stmt.offset((page - 1) * page_size).limit(page_size)).all())
        return [CouponResponse.model_validate(c) for c in items], total

    def create(self, data: CouponCreate) -> CouponResponse:
        code = data.code.strip().upper()
        if self.db.scalar(select(Coupon).where(Coupon.code == code)):
            raise ConflictError("Mã giảm giá đã tồn tại.")
        self._validate_dates(data.start_date, data.end_date)
        self._validate_value(data.type, data.value)
        coupon = Coupon(**{**data.model_dump(), "code": code})
        self.db.add(coupon)
        self.db.commit()
        self.db.refresh(coupon)
        return CouponResponse.model_validate(coupon)

    def update(self, coupon_id: int, data: CouponUpdate) -> CouponResponse:
        coupon = self.db.get(Coupon, coupon_id)
        if not coupon:
            raise NotFoundError("Không tìm thấy mã giảm giá.")
        patch = data.model_dump(exclude_unset=True)
        if "start_date" in patch or "end_date" in patch:
            self._validate_dates(patch.get("start_date", coupon.start_date),
                                 patch.get("end_date", coupon.end_date))
        new_type = patch.get("type", coupon.type)
        new_value = patch.get("value", coupon.value)
        self._validate_value(new_type, new_value)
        for k, v in patch.items():
            setattr(coupon, k, v)
        self.db.commit()
        self.db.refresh(coupon)
        return CouponResponse.model_validate(coupon)

    def delete(self, coupon_id: int) -> None:
        coupon = self.db.get(Coupon, coupon_id)
        if not coupon:
            raise NotFoundError("Không tìm thấy mã giảm giá.")
        self.db.delete(coupon)
        self.db.commit()

    def validate(self, code: str, subtotal: Decimal) -> CouponValidateResponse:
        normalized = code.strip().upper()
        coupon = self.db.scalar(select(Coupon).where(Coupon.code == normalized))
        if not coupon:
            return CouponValidateResponse(ok=False, code=normalized, error="Mã giảm giá không tồn tại.")
        try:
            discount = self._discount_for(coupon, subtotal)
        except ValidationError as e:
            return CouponValidateResponse(ok=False, code=normalized, error=e.message)
        return CouponValidateResponse(ok=True, code=normalized, discount=discount)

    # --- helpers ---

    @staticmethod
    def _validate_dates(start: datetime, end: datetime) -> None:
        if start >= end:
            raise ValidationError("Ngày bắt đầu phải trước ngày kết thúc.")

    @staticmethod
    def _validate_value(coupon_type: str, value: Decimal) -> None:
        if coupon_type == "percent" and value > 100:
            raise ValidationError("Giảm theo % không được vượt quá 100.")

    @staticmethod
    def _discount_for(coupon: Coupon, subtotal: Decimal) -> Decimal:
        if not coupon.is_active:
            raise ValidationError("Mã giảm giá đã hết hiệu lực.")
        now = datetime.now(timezone.utc)
        start = coupon.start_date if coupon.start_date.tzinfo else coupon.start_date.replace(tzinfo=timezone.utc)
        end = coupon.end_date if coupon.end_date.tzinfo else coupon.end_date.replace(tzinfo=timezone.utc)
        if not (start <= now <= end):
            raise ValidationError("Mã giảm giá đã hết hạn sử dụng.")
        if subtotal < coupon.min_order:
            raise ValidationError(f"Đơn hàng phải từ {int(coupon.min_order):,} ₫ mới dùng được mã này.")
        if coupon.usage_limit > 0 and coupon.used >= coupon.usage_limit:
            raise ValidationError("Mã giảm giá đã hết lượt sử dụng.")
        if coupon.type == "percent":
            return round(subtotal * coupon.value / 100)
        return min(coupon.value, subtotal)
