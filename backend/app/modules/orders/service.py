"""Order business logic — transactional checkout with oversell protection.

Critical rules:
- Totals are ALWAYS calculated on the backend; client prices are ignored.
- Stock is validated and decremented atomically (row-level locks).
- Order + items + timeline + stock movements commit in ONE transaction.
- Historical prices are snapshotted on order items.
"""

import secrets
from datetime import datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import (
    ConflictError,
    ForbiddenError,
    InsufficientStockError,
    NotFoundError,
    ValidationError,
)
from app.modules.cart.repository import CartRepository
from app.modules.coupons.entities import Coupon
from app.modules.inventory.entities import StockMovement
from app.modules.orders.entities import Order
from app.modules.orders.repository import OrderRepository
from app.modules.orders.schemas import (
    CheckoutRequest,
    OrderResponse,
    PaginatedOrders,
)
from app.modules.products.entities import Product
from app.modules.users.entities import User

FREE_SHIPPING_THRESHOLD = Decimal(500_000)
STANDARD_SHIPPING_FEE = Decimal(30_000)
EXPRESS_SHIPPING_FEE = Decimal(50_000)


def generate_order_code() -> str:
    date = datetime.now().strftime("%Y%m%d")
    rand = secrets.token_hex(2).upper()
    return f"NM-{date}-{rand}"


class OrderService:
    def __init__(self, db: Session):
        self.db = db
        self.orders = OrderRepository(db)
        self.carts = CartRepository(db)

    # ------------------------------- Checkout -------------------------------

    def checkout(self, user: User | None, payload: CheckoutRequest) -> OrderResponse:
        """Create an order atomically. Raises on validation/stock failure."""
        # Lock product rows to prevent concurrent oversell.
        product_ids = sorted({i.product_id for i in payload.items})
        products = {
            p.id: p
            for p in self.db.scalars(
                select(Product).where(Product.id.in_(product_ids)).with_for_update()
            ).all()
        }

        lines: list[tuple[Product, int, Decimal]] = []
        subtotal = Decimal(0)
        for item in payload.items:
            product = products.get(item.product_id)
            if not product or product.status != "active":
                raise NotFoundError(f"Sản phẩm #{item.product_id} không tồn tại.")
            if product.stock < item.quantity:
                raise InsufficientStockError(
                    f"Sản phẩm '{product.name}' chỉ còn {product.stock} trong kho."
                )
            unit_price = product.sale_price if product.sale_price is not None else product.price
            lines.append((product, item.quantity, unit_price))
            subtotal += unit_price * item.quantity

        # Coupon (server-side validation).
        discount = Decimal(0)
        coupon_code = (payload.coupon_code or "").strip().upper() or None
        coupon: Coupon | None = None
        if coupon_code:
            coupon = self.db.scalar(select(Coupon).where(Coupon.code == coupon_code).with_for_update())
            discount = self._validate_coupon(coupon, coupon_code, subtotal)

        shipping_fee = self._shipping_fee(payload.shipping_method, subtotal - discount)
        total = subtotal - discount + shipping_fee
        if total < 0:
            raise ValidationError("Tổng đơn hàng không hợp lệ.")

        try:
            order = self.orders.create(
                code=generate_order_code(),
                user_id=user.id if user else None,
                customer_name=payload.customer_name.strip(),
                phone=payload.phone.strip(),
                email=str(payload.email),
                street=payload.street.strip(),
                district=payload.district.strip(),
                city=payload.city.strip(),
                note=payload.note.strip(),
                subtotal=subtotal,
                shipping_fee=shipping_fee,
                discount=discount,
                total=total,
                coupon_code=coupon_code,
                status="pending",
                payment_method=payload.payment_method,
                shipping_method=payload.shipping_method,
                items=[
                    {
                        "product_id": p.id,
                        "name": p.name,
                        "image": (p.images or [""])[0],
                        "price": unit_price,
                        "quantity": qty,
                    }
                    for p, qty, unit_price in lines
                ],
            )
            self.orders.add_timeline(order, "pending", "Khách hàng đặt đơn")

            # Decrement stock + record movements + bump sold count.
            for product, qty, _ in lines:
                product.stock -= qty
                product.sold += qty
                self.db.add(StockMovement(
                    product_id=product.id,
                    type="out",
                    quantity=-qty,
                    reason=f"Bán hàng — đơn {order.code}",
                    order_id=order.id,
                    created_by=f"user:{user.id}" if user else "guest",
                ))

            if coupon:
                coupon.used += 1

            # Clear the customer's cart after successful checkout.
            if user:
                from app.modules.cart.entities import Cart as CartEntity
                cart = self.db.scalar(
                    select(CartEntity).where(CartEntity.user_id == user.id)
                )
                if cart:
                    self.carts.clear(cart)

            self.db.commit()
        except Exception:
            self.db.rollback()
            raise

        self.db.refresh(order)
        return OrderResponse.model_validate(self.orders.get(order.id))

    # --------------------------------- Reads ---------------------------------

    def list_orders(self, *, user: User | None, is_admin: bool,
                    status: str | None, q: str | None, page: int, page_size: int) -> PaginatedOrders:
        items, total = self.orders.list(
            user_id=None if is_admin else (user.id if user else -1),
            status=status, q=q, page=page, page_size=page_size,
        )
        return PaginatedOrders(
            items=[OrderResponse.model_validate(o) for o in items],
            total=total, page=page, page_size=page_size,
        )

    def get_by_code(self, code: str, *, user: User | None, is_admin: bool) -> OrderResponse:
        order = self.orders.get_by_code(code)
        if not order:
            raise NotFoundError("Không tìm thấy đơn hàng.")
        if not is_admin and (not user or order.user_id != user.id):
            raise ForbiddenError("Bạn không có quyền xem đơn hàng này.")
        return OrderResponse.model_validate(order)

    # --------------------------------- Mutations ------------------------------

    def update_status(self, order_id: int, status: str, note: str = "",
                      actor: str = "admin") -> OrderResponse:
        order = self.orders.get(order_id)
        if not order:
            raise NotFoundError("Không tìm thấy đơn hàng.")
        if not self.orders.can_transition(order.status, status):
            raise ConflictError(
                f"Không thể chuyển đơn từ '{order.status}' sang '{status}'."
            )
        try:
            # Restore stock on cancellation.
            if status == "cancelled" and order.status != "cancelled":
                for item in order.items:
                    product = self.db.scalar(
                        select(Product).where(Product.id == item.product_id).with_for_update()
                    )
                    if product:
                        product.stock += item.quantity
                        self.db.add(StockMovement(
                            product_id=product.id,
                            type="in",
                            quantity=item.quantity,
                            reason=f"Hủy đơn {order.code} — hoàn kho",
                            order_id=order.id,
                            created_by=actor,
                        ))
            order.status = status
            self.orders.add_timeline(order, status, note)
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
        self.db.refresh(order)
        return OrderResponse.model_validate(self.orders.get(order.id))

    def cancel_by_customer(self, code: str, user: User) -> OrderResponse:
        order = self.orders.get_by_code(code)
        if not order or order.user_id != user.id:
            raise NotFoundError("Không tìm thấy đơn hàng.")
        if order.status not in ("pending", "confirmed"):
            raise ConflictError("Đơn hàng không thể hủy ở trạng thái hiện tại.")
        return self.update_status(order.id, "cancelled", "Khách hàng yêu cầu hủy",
                                  actor=f"user:{user.id}")

    # --------------------------------- Helpers --------------------------------

    @staticmethod
    def _shipping_fee(method: str, subtotal_after_discount: Decimal) -> Decimal:
        if subtotal_after_discount >= FREE_SHIPPING_THRESHOLD:
            return Decimal(0)
        return EXPRESS_SHIPPING_FEE if method == "express" else STANDARD_SHIPPING_FEE

    @staticmethod
    def _validate_coupon(coupon: Coupon | None, code: str, subtotal: Decimal) -> Decimal:
        from datetime import datetime, timezone
        if not coupon:
            raise ValidationError("Mã giảm giá không tồn tại.")
        if not coupon.is_active:
            raise ValidationError("Mã giảm giá đã hết hiệu lực.")
        now = datetime.now(timezone.utc)
        start = coupon.start_date.replace(tzinfo=timezone.utc) if coupon.start_date.tzinfo is None else coupon.start_date
        end = coupon.end_date.replace(tzinfo=timezone.utc) if coupon.end_date.tzinfo is None else coupon.end_date
        if not (start <= now <= end):
            raise ValidationError("Mã giảm giá đã hết hạn sử dụng.")
        if subtotal < coupon.min_order:
            raise ValidationError(
                f"Đơn hàng phải từ {int(coupon.min_order):,} ₫ mới dùng được mã này."
            )
        if coupon.usage_limit > 0 and coupon.used >= coupon.usage_limit:
            raise ValidationError("Mã giảm giá đã hết lượt sử dụng.")
        if coupon.type == "percent":
            return round(subtotal * coupon.value / 100)
        return min(coupon.value, subtotal)
