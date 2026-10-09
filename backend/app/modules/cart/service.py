"""Cart business logic. Prices always recalculated from products."""

from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError, ValidationError
from app.modules.cart.entities import Cart
from app.modules.cart.repository import CartRepository
from app.modules.cart.schemas import CartLineResponse, CartResponse
from app.modules.products.entities import Product
from app.modules.products.repository import ProductRepository
from app.modules.products.service import to_response
from app.modules.users.entities import User


class CartService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = CartRepository(db)
        self.products = ProductRepository(db)

    def _product_or_404(self, product_id: int) -> Product:
        p = self.products.get(product_id)
        if not p or p.status != "active":
            raise NotFoundError("Sản phẩm không tồn tại hoặc đã ngừng bán.")
        return p

    def _build_response(self, cart: Cart) -> CartResponse:
        lines: list[CartLineResponse] = []
        subtotal = Decimal(0)
        count = 0
        for item in self.repo.list_items(cart.id):
            product = self.products.get(item.product_id)
            if not product or product.status != "active":
                continue
            price = product.sale_price if product.sale_price is not None else product.price
            line_total = price * item.quantity
            lines.append(CartLineResponse(
                product_id=item.product_id,
                quantity=item.quantity,
                product=to_response(product),
                line_total=line_total,
            ))
            subtotal += line_total
            count += item.quantity
        return CartResponse(
            id=cart.id, user_id=cart.user_id, lines=lines,
            count=count, subtotal=subtotal, updated_at=cart.updated_at,
        )

    def get_cart(self, user: User) -> CartResponse:
        cart = self.repo.get_or_create(user.id)
        self.db.commit()
        return self._build_response(cart)

    def add_item(self, user: User, product_id: int, quantity: int) -> CartResponse:
        product = self._product_or_404(product_id)
        if product.stock < quantity:
            raise ValidationError(f"Chỉ còn {product.stock} sản phẩm trong kho.")
        cart = self.repo.get_or_create(user.id)
        self.repo.add_or_update(cart, product_id, quantity)
        self.db.commit()
        return self._build_response(cart)

    def set_quantity(self, user: User, product_id: int, quantity: int) -> CartResponse:
        cart = self.repo.get_or_create(user.id)
        item = self.repo.get_item(cart.id, product_id)
        if not item:
            raise NotFoundError("Sản phẩm không có trong giỏ hàng.")
        if quantity > 0:
            product = self._product_or_404(product_id)
            if product.stock < quantity:
                raise ValidationError(f"Chỉ còn {product.stock} sản phẩm trong kho.")
        self.repo.set_quantity(item, quantity)
        self.db.commit()
        return self._build_response(cart)

    def remove_item(self, user: User, product_id: int) -> CartResponse:
        cart = self.repo.get_or_create(user.id)
        item = self.repo.get_item(cart.id, product_id)
        if not item:
            raise NotFoundError("Sản phẩm không có trong giỏ hàng.")
        self.repo.remove_item(item)
        self.db.commit()
        return self._build_response(cart)

    def clear(self, user: User) -> CartResponse:
        cart = self.repo.get_or_create(user.id)
        self.repo.clear(cart)
        self.db.commit()
        return self._build_response(cart)
