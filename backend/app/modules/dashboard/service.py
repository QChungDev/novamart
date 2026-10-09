"""Dashboard aggregation queries. Uses SQL aggregation, not Python loops."""

from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.dashboard.schemas import (
    BestSellerItem,
    DailyRevenuePoint,
    DashboardSummary,
    OrderStatusCount,
    RecentOrderItem,
)
from app.modules.inventory.service import LOW_STOCK_THRESHOLD
from app.modules.orders.entities import Order, OrderItem
from app.modules.products.entities import Product


class DashboardService:
    def __init__(self, db: Session):
        self.db = db

    def summary(self, days: int = 14) -> DashboardSummary:
        valid = Order.status != "cancelled"

        revenue = self.db.scalar(
            select(func.coalesce(func.sum(Order.total), 0)).where(valid)
        ) or Decimal(0)
        orders = self.db.scalar(select(func.count(Order.id))) or 0
        products = self.db.scalar(select(func.count(Product.id))) or 0
        low_stock = self.db.scalar(
            select(func.count(Product.id)).where(Product.stock <= LOW_STOCK_THRESHOLD)
        ) or 0

        # Daily revenue for the last `days` days.
        since = datetime.now(timezone.utc) - timedelta(days=days)
        rows = self.db.execute(
            select(
                func.date(Order.created_at).label("d"),
                func.coalesce(func.sum(Order.total), 0).label("revenue"),
                func.count(Order.id).label("orders"),
            )
            .where(valid, Order.created_at >= since)
            .group_by(func.date(Order.created_at))
            .order_by(func.date(Order.created_at))
        ).all()
        by_date = {str(r.d): (r.revenue, r.orders) for r in rows}
        daily = []
        for i in range(days):
            day = (datetime.now(timezone.utc) - timedelta(days=days - 1 - i)).date()
            key = str(day)
            rev, cnt = by_date.get(key, (Decimal(0), 0))
            daily.append(DailyRevenuePoint(
                date=day.strftime("%d/%m"), revenue=rev, orders=cnt,
            ))

        # Revenue change: last 7 days vs previous 7 days.
        half = [(p.revenue) for p in daily[-7:]]
        prev = [(p.revenue) for p in daily[-14:-7]] if len(daily) >= 14 else []
        cur_sum = sum(half, Decimal(0))
        prev_sum = sum(prev, Decimal(0))
        revenue_change = float((cur_sum - prev_sum) / prev_sum * 100) if prev_sum > 0 else 0.0

        # Status distribution.
        status_rows = self.db.execute(
            select(Order.status, func.count(Order.id)).group_by(Order.status)
        ).all()
        statuses = ["pending", "confirmed", "shipping", "delivered", "cancelled"]
        counts = {s: 0 for s in statuses}
        for s, c in status_rows:
            counts[s] = c
        distribution = [OrderStatusCount(status=s, count=counts[s]) for s in statuses]

        # Recent orders.
        recent = self.db.scalars(
            select(Order).order_by(Order.id.desc()).limit(6)
        ).all()
        recent_orders = [
            RecentOrderItem(
                id=o.id, code=o.code, customer_name=o.customer_name,
                total=o.total, status=o.status, created_at=o.created_at.isoformat(),
            )
            for o in recent
        ]

        # Best sellers by revenue (non-cancelled orders).
        best_rows = self.db.execute(
            select(
                Product.id, Product.name,
                func.coalesce(func.sum(OrderItem.quantity), 0).label("sold"),
                func.coalesce(func.sum(OrderItem.price * OrderItem.quantity), 0).label("revenue"),
            )
            .join(OrderItem, OrderItem.product_id == Product.id)
            .join(Order, Order.id == OrderItem.order_id)
            .where(valid)
            .group_by(Product.id, Product.name)
            .order_by(func.sum(OrderItem.price * OrderItem.quantity).desc())
            .limit(5)
        ).all()
        best_sellers = []
        for pid, name, sold, revenue in best_rows:
            product = self.db.get(Product, pid)
            best_sellers.append(BestSellerItem(
                product_id=pid, name=name,
                image=(product.images or [""])[0] if product else "",
                sold=int(sold), revenue=revenue,
            ))

        return DashboardSummary(
            revenue=revenue,
            revenue_change_percent=round(revenue_change, 1),
            orders=orders,
            orders_change_percent=0.0,
            products=products,
            low_stock=low_stock,
            daily_revenue=daily,
            status_distribution=distribution,
            recent_orders=recent_orders,
            best_sellers=best_sellers,
        )
