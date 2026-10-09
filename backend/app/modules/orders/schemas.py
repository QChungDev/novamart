"""Order schemas."""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class CheckoutItem(BaseModel):
    product_id: int
    quantity: int = Field(ge=1, le=99)


class CheckoutRequest(BaseModel):
    items: list[CheckoutItem] = Field(min_length=1)
    customer_name: str = Field(min_length=2, max_length=255)
    phone: str = Field(min_length=8, max_length=32)
    email: EmailStr
    street: str = Field(min_length=5, max_length=512)
    district: str = Field(min_length=2, max_length=128)
    city: str = Field(min_length=2, max_length=128)
    note: str = Field(default="", max_length=1024)
    shipping_method: str = Field(default="standard", pattern="^(standard|express)$")
    payment_method: str = Field(default="cod", pattern="^(cod|demo_card|demo_wallet)$")
    coupon_code: str | None = Field(default=None, max_length=64)


class OrderItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    name: str
    image: str
    price: Decimal
    quantity: int


class OrderTimelineResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    status: str
    note: str
    created_at: datetime


class OrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    customer_name: str
    phone: str
    email: str
    street: str
    district: str
    city: str
    note: str
    items: list[OrderItemResponse]
    subtotal: Decimal
    shipping_fee: Decimal
    discount: Decimal
    total: Decimal
    coupon_code: str | None
    status: str
    payment_method: str
    shipping_method: str
    created_at: datetime
    timeline: list[OrderTimelineResponse]


class OrderStatusUpdate(BaseModel):
    status: str = Field(pattern="^(pending|confirmed|shipping|delivered|cancelled)$")
    note: str = Field(default="", max_length=1024)


class PaginatedOrders(BaseModel):
    items: list[OrderResponse]
    total: int
    page: int
    page_size: int
