"""Cart persistence."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.cart.entities import Cart, CartItem


class CartRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_or_create(self, user_id: int) -> Cart:
        cart = self.db.scalar(select(Cart).where(Cart.user_id == user_id))
        if not cart:
            cart = Cart(user_id=user_id)
            self.db.add(cart)
            self.db.flush()
        return cart

    def get_item(self, cart_id: int, product_id: int) -> CartItem | None:
        return self.db.scalar(
            select(CartItem).where(
                CartItem.cart_id == cart_id, CartItem.product_id == product_id
            )
        )

    def list_items(self, cart_id: int) -> list[CartItem]:
        return list(
            self.db.scalars(
                select(CartItem).where(CartItem.cart_id == cart_id)
            ).all()
        )

    def add_or_update(self, cart: Cart, product_id: int, quantity: int) -> CartItem:
        item = self.get_item(cart.id, product_id)
        if item:
            item.quantity = min(item.quantity + quantity, 99)
        else:
            item = CartItem(cart_id=cart.id, product_id=product_id, quantity=quantity)
            self.db.add(item)
        self.db.flush()
        return item

    def set_quantity(self, item: CartItem, quantity: int) -> None:
        if quantity <= 0:
            self.db.delete(item)
        else:
            item.quantity = min(quantity, 99)
        self.db.flush()

    def remove_item(self, item: CartItem) -> None:
        self.db.delete(item)
        self.db.flush()

    def clear(self, cart: Cart) -> None:
        for item in self.list_items(cart.id):
            self.db.delete(item)
        self.db.flush()
