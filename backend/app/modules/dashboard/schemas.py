"""Dashboard schemas."""

from decimal import Decimal

from pydantic import BaseModel


class DailyRevenuePoint(BaseModel):
    date: str
    revenue: Decimal
    orders: int


class OrderStatusCount(BaseModel):
    status: str
    count: int


class BestSellerItem(BaseModel):
    product_id: int
    name: str
    image: str
    sold: int
    revenue: Decimal


class RecentOrderItem(BaseModel):
    id: int
    code: str
    customer_name: str
    total: Decimal
    status: str
    created_at: str


class DashboardSummary(BaseModel):
    # Revenue = sum of non-cancelled orders' totals.
    revenue: Decimal
    revenue_change_percent: float
    orders: int
    orders_change_percent: float
    products: int
    low_stock: int
    daily_revenue: list[DailyRevenuePoint]
    status_distribution: list[OrderStatusCount]
    recent_orders: list[RecentOrderItem]
    best_sellers: list[BestSellerItem]
