"""Aggregate all feature routers under /api/v1."""

from fastapi import APIRouter

from app.modules.auth.router import router as auth_router
from app.modules.cart.router import router as cart_router
from app.modules.categories.router import router as categories_router
from app.modules.coupons.router import router as coupons_router
from app.modules.dashboard.router import router as dashboard_router
from app.modules.inventory.router import router as inventory_router
from app.modules.orders.router import router as orders_router
from app.modules.products.router import router as products_router
from app.modules.users.router import router as users_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(categories_router)
api_router.include_router(products_router)
api_router.include_router(cart_router)
api_router.include_router(orders_router)
api_router.include_router(inventory_router)
api_router.include_router(coupons_router)
api_router.include_router(dashboard_router)
