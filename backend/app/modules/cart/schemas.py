"""Cart schemas."""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.modules.products.schemas import ProductResponse


class CartItemAdd(BaseModel):
    product_id: int
    quantity: int = Field(default=1, ge=1, le=99)


class CartItemUpdate(BaseModel):
    quantity: int = Field(ge=0, le=99)


class CartLineResponse(BaseModel):
    product_id: int
    quantity: int
    product: ProductResponse
    line_total: Decimal


class CartResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    lines: list[CartLineResponse] = []
    count: int = 0
    subtotal: Decimal = Decimal(0)
    updated_at: datetime
