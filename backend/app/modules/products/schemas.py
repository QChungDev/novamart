"""Product + Review schemas."""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ProductSpecItem(BaseModel):
    label: str
    value: str


class ProductBase(BaseModel):
    name: str = Field(min_length=2, max_length=512)
    slug: str = Field(min_length=2, max_length=512, pattern=r"^[a-z0-9-]+$")
    sku: str = Field(min_length=2, max_length=64)
    category_id: int | None = None
    description: str = Field(default="", max_length=8192)
    price: Decimal = Field(ge=0, max_digits=12, decimal_places=0)
    sale_price: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=0)
    stock: int = Field(default=0, ge=0)
    images: list[str] = Field(default_factory=list)
    specs: list[ProductSpecItem] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    is_featured: bool = False
    status: str = Field(default="active", pattern="^(active|inactive)$")


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=512)
    slug: str | None = Field(default=None, min_length=2, max_length=512, pattern=r"^[a-z0-9-]+$")
    sku: str | None = Field(default=None, min_length=2, max_length=64)
    category_id: int | None = None
    description: str | None = Field(default=None, max_length=8192)
    price: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=0)
    sale_price: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=0)
    stock: int | None = Field(default=None, ge=0)
    images: list[str] | None = None
    specs: list[ProductSpecItem] | None = None
    tags: list[str] | None = None
    is_featured: bool | None = None
    status: str | None = Field(default=None, pattern="^(active|inactive)$")


class ProductResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    sku: str
    category_id: int | None
    category_name: str | None = None
    description: str
    price: Decimal
    sale_price: Decimal | None
    effective_price: Decimal
    discount_percent: int
    stock: int
    sold: int
    images: list[str]
    specs: list[ProductSpecItem]
    tags: list[str]
    rating: float
    review_count: int
    is_featured: bool
    status: str
    created_at: datetime


class ReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    title: str = Field(default="", max_length=512)
    content: str = Field(default="", max_length=4096)


class ReviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    author_name: str
    rating: int
    title: str
    content: str
    verified: bool
    created_at: datetime


class PaginatedProducts(BaseModel):
    items: list[ProductResponse]
    total: int
    page: int
    page_size: int
