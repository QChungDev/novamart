"""Import all entities so Alembic sees every model. Import this in env.py."""

from app.db.base import Base  # noqa: F401

from app.modules.users.entities import Address, User  # noqa: F401
from app.modules.categories.entities import Category  # noqa: F401
from app.modules.products.entities import Product, Review  # noqa: F401
from app.modules.cart.entities import Cart, CartItem  # noqa: F401
from app.modules.orders.entities import Order, OrderItem, OrderTimeline  # noqa: F401
from app.modules.inventory.entities import StockMovement  # noqa: F401
from app.modules.coupons.entities import Coupon  # noqa: F401
