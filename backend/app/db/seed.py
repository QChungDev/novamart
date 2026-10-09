"""Development seed: realistic Vietnamese catalog. Idempotent."""

from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

import app.db.models  # noqa: F401  (register all entities)
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.modules.categories.entities import Category
from app.modules.coupons.entities import Coupon
from app.modules.products.entities import Product
from app.modules.users.entities import User

IMG = "https://images.unsplash.com/{}?auto=format&fit=crop&w=800&q=80"

CATEGORIES = [
    ("Điện thoại", "dien-thoai", "photo-1511707171634-5f897ff02aa9", "Smartphone chính hãng mới nhất."),
    ("Laptop", "laptop", "photo-1496181133206-80ce9b88a853", "Laptop văn phòng, gaming, đồ họa."),
    ("Âm thanh", "am-thanh", "photo-1505740420928-5e560c06d30e", "Tai nghe, loa bluetooth chính hãng."),
    ("Phụ kiện", "phu-kien", "photo-1583863788434-e58a36330cf0", "Sạc, cáp, ốp lưng, balo."),
    ("Đồng hồ thông minh", "smartwatch", "photo-1523275335684-37898b6baf30", "Smartwatch theo dõi sức khỏe."),
    ("Máy tính bảng", "may-tinh-bang", "photo-1544244015-0df4b3ffc6b0", "Tablet học tập và giải trí."),
]

PRODUCTS = [
    # (name, slug, sku, category_slug, price, sale_price, stock, sold, rating, tags, featured)
    ("iPhone 15 Pro Max 256GB", "iphone-15-pro-max-256gb", "IP15PM-256", "dien-thoai",
     34990000, 32990000, 25, 312, 4.9, ["apple", "iphone", "flagship"], True),
    ("Samsung Galaxy S24 Ultra 5G", "samsung-galaxy-s24-ultra-5g", "SS-S24U-512", "dien-thoai",
     31990000, 29990000, 30, 278, 4.8, ["samsung", "android", "flagship"], True),
    ("Xiaomi Redmi Note 13 Pro", "xiaomi-redmi-note-13-pro", "MI-RN13P", "dien-thoai",
     7490000, 6990000, 80, 521, 4.6, ["xiaomi", "tầm trung"], False),
    ("OPPO Reno 11 5G", "oppo-reno-11-5g", "OP-R11", "dien-thoai",
     10990000, None, 45, 189, 4.5, ["oppo", "chụp ảnh"], False),
    ("MacBook Air M3 13 inch", "macbook-air-m3-13", "AP-MBA-M3", "laptop",
     28990000, 27490000, 18, 145, 4.9, ["apple", "macbook", "mỏng nhẹ"], True),
    ("Laptop ASUS Vivobook 15 OLED", "laptop-asus-vivobook-15-oled", "AS-VV15", "laptop",
     18990000, 17490000, 35, 233, 4.7, ["asus", "oled", "văn phòng"], False),
    ("Laptop Lenovo Legion 5 Gaming", "laptop-lenovo-legion-5-gaming", "LN-LG5", "laptop",
     27990000, None, 12, 98, 4.8, ["lenovo", "gaming", "rtx"], True),
    ("Tai nghe Sony WH-1000XM5", "tai-nghe-sony-wh-1000xm5", "SN-XM5", "am-thanh",
     8990000, 7990000, 40, 387, 4.9, ["sony", "chống ồn", "bluetooth"], True),
    ("AirPods Pro 2 USB-C", "airpods-pro-2-usb-c", "AP-APP2", "am-thanh",
     5990000, 5490000, 60, 445, 4.8, ["apple", "true wireless"], False),
    ("Loa JBL Flip 6 Bluetooth", "loa-jbl-flip-6-bluetooth", "JBL-F6", "am-thanh",
     2990000, 2590000, 75, 312, 4.7, ["jbl", "loa", "chống nước"], False),
    ("Sạc nhanh Anker 65W GaN", "sac-nhanh-anker-65w-gan", "AK-65W", "phu-kien",
     990000, 790000, 200, 892, 4.8, ["anker", "sạc nhanh", "gan"], False),
    ("Apple Watch Series 9 GPS 45mm", "apple-watch-series-9-gps-45mm", "AP-W9-45", "smartwatch",
     10990000, 9990000, 28, 176, 4.8, ["apple", "watch"], True),
    ("Samsung Galaxy Watch 6", "samsung-galaxy-watch-6", "SS-W6", "smartwatch",
     6990000, 5990000, 33, 143, 4.6, ["samsung", "watch"], False),
    ("iPad Air 5 M1 WiFi 64GB", "ipad-air-5-m1-wifi-64gb", "AP-IPA5", "may-tinh-bang",
     15990000, 14990000, 22, 134, 4.8, ["apple", "ipad"], False),
    ("Balo laptop Targus 15.6 inch", "balo-laptop-targus-15-6", "TG-BP15", "phu-kien",
     1290000, 990000, 120, 267, 4.5, ["targus", "balo"], False),
    ("Chuột Logitech MX Master 3S", "chuot-logitech-mx-master-3s", "LG-MX3S", "phu-kien",
     2490000, 2190000, 55, 198, 4.9, ["logitech", "chuột"], False),
]

COUPONS = [
    ("NOVAMART10", "Giảm 10% cho đơn từ 500K", "percent", 10, 500_000, 1000),
    ("FREESHIP", "Miễn phí vận chuyển", "fixed", 30_000, 200_000, 500),
    ("SALE500K", "Giảm 500K cho đơn từ 10 triệu", "fixed", 500_000, 10_000_000, 100),
    ("WELCOME15", "Chào mừng khách mới — giảm 15%", "percent", 15, 1_000_000, 200),
]


def seed(db: Session) -> None:
    now = datetime.now(timezone.utc)

    # Categories
    cat_map: dict[str, Category] = {}
    for name, slug, img, desc in CATEGORIES:
        cat = db.scalar(select(Category).where(Category.slug == slug))
        if not cat:
            cat = Category(name=name, slug=slug, image=IMG.format(img), description=desc)
            db.add(cat)
            db.flush()
        cat_map[slug] = cat

    # Products
    for (name, slug, sku, cat_slug, price, sale, stock, sold, rating, tags, featured) in PRODUCTS:
        if db.scalar(select(Product).where(Product.sku == sku)):
            continue
        db.add(Product(
            name=name, slug=slug, sku=sku, category_id=cat_map[cat_slug].id,
            description=f"{name} chính hãng, bảo hành 12 tháng tại NovaMart.",
            price=Decimal(price), sale_price=Decimal(sale) if sale else None,
            stock=stock, sold=sold, images=[IMG.format("photo-1511707171634-5f897ff02aa9")],
            specs=[{"label": "Bảo hành", "value": "12 tháng chính hãng"}],
            tags=tags, rating=rating, review_count=int(sold / 10),
            is_featured=featured, status="active",
        ))

    # Coupons
    for code, desc, ctype, value, min_order, limit in COUPONS:
        if db.scalar(select(Coupon).where(Coupon.code == code)):
            continue
        db.add(Coupon(
            code=code, description=desc, type=ctype, value=Decimal(value),
            min_order=Decimal(min_order), usage_limit=limit, used=0,
            start_date=now - timedelta(days=30), end_date=now + timedelta(days=335),
            is_active=True,
        ))

    # Demo customer
    if not db.scalar(select(User).where(User.email == "customer@novamart.vn")):
        db.add(User(
            email="customer@novamart.vn",
            password_hash=hash_password("123456"),
            name="Khách Hàng Demo", phone="0903123456", role="customer", is_active=True,
        ))

    db.commit()
    print("Seed completed.")


if __name__ == "__main__":
    with SessionLocal() as db:
        seed(db)
