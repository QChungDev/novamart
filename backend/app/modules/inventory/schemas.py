"""Inventory schemas."""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class StockMovementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    product_name: str = ""
    type: str
    quantity: int
    reason: str
    order_id: int | None
    created_by: str
    created_at: datetime


class ProductStockResponse(BaseModel):
    product_id: int
    sku: str
    name: str
    image: str
    stock: int
    sold: int
    low_stock: bool


class StockReceiveRequest(BaseModel):
    product_id: int
    quantity: int = Field(gt=0, le=100000)
    reason: str = Field(min_length=2, max_length=1024)


class StockAdjustRequest(BaseModel):
    product_id: int
    new_stock: int = Field(ge=0, le=1000000)
    reason: str = Field(min_length=2, max_length=1024)


class PaginatedMovements(BaseModel):
    items: list[StockMovementResponse]
    total: int
    page: int
    page_size: int
