"""Coupon schemas."""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class CouponBase(BaseModel):
    code: str = Field(min_length=3, max_length=64, pattern=r"^[A-Z0-9]+$")
    description: str = Field(default="", max_length=1024)
    type: str = Field(pattern="^(percent|fixed)$")
    value: Decimal = Field(ge=0, max_digits=12, decimal_places=0)
    min_order: Decimal = Field(default=0, ge=0, max_digits=12, decimal_places=0)
    usage_limit: int = Field(default=0, ge=0)
    start_date: datetime
    end_date: datetime
    is_active: bool = True


class CouponCreate(CouponBase):
    pass


class CouponUpdate(BaseModel):
    description: str | None = Field(default=None, max_length=1024)
    type: str | None = Field(default=None, pattern="^(percent|fixed)$")
    value: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=0)
    min_order: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=0)
    usage_limit: int | None = Field(default=None, ge=0)
    start_date: datetime | None = None
    end_date: datetime | None = None
    is_active: bool | None = None


class CouponResponse(CouponBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    used: int
    created_at: datetime


class CouponValidateRequest(BaseModel):
    code: str = Field(min_length=1, max_length=64)
    subtotal: Decimal = Field(ge=0, max_digits=12, decimal_places=0)


class CouponValidateResponse(BaseModel):
    ok: bool
    code: str
    discount: Decimal = Decimal(0)
    error: str | None = None
