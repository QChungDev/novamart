# NovaMart Backend — Phase 2

FastAPI + MySQL backend cho NovaMart. Kiến trúc **modular monolith** tổ chức theo feature.

## Kiến trúc

```
backend/
├── app/
│   ├── main.py              # FastAPI app, CORS, /health
│   ├── core/                # config, security (JWT/bcrypt), exceptions, logging
│   ├── db/                  # engine, session, Base, models registry, seed, create_admin
│   ├── api/router.py        # Gom tất cả routers dưới /api/v1
│   ├── dependencies.py      # get_current_user, get_optional_user, require_admin
│   └── modules/
│       ├── auth/            # register, login, refresh, me, logout
│       ├── users/           # profile, addresses, admin user management
│       ├── categories/      # CRUD danh mục (admin)
│       ├── products/        # listing, search/filter, CRUD (admin), reviews
│       ├── cart/            # giỏ hàng persisted cho customer đã đăng nhập
│       ├── orders/          # checkout transaction, order CRUD, status flow
│       ├── inventory/       # tồn kho, nhập/kiểm kê, lịch sử movements
│       ├── coupons/         # CRUD + validate mã giảm giá
│       └── dashboard/       # metrics tổng hợp bằng SQL
├── alembic/                 # migrations
├── tests/                   # pytest (26 tests)
├── requirements.txt
├── alembic.ini
└── .env.example
```

**Dependency direction:** Router → Service → Repository → Database.

## Yêu cầu

- Python 3.12+
- MySQL 8.0+ hoặc MariaDB 10.11+

## Cài đặt (Linux/macOS)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Sửa DATABASE_URL, SECRET_KEY trong .env
```

## Cài đặt (Windows PowerShell)

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
# Sửa DATABASE_URL, SECRET_KEY trong .env
```

## Database

```bash
# Tạo database (MySQL)
mysql -u root -p -e "CREATE DATABASE novamart CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Chạy migrations
alembic upgrade head

# Seed dữ liệu mẫu (16 sản phẩm, 6 danh mục, 4 coupons, 1 demo customer)
python -m app.db.seed

# Tạo admin đầu tiên (AN TOÀN — nhập password qua prompt, không hardcode)
python -m app.db.create_admin --email admin@novamart.vn
```

## Chạy server

```bash
uvicorn app.main:app --reload --port 8000
```

- API: http://localhost:8000/api/v1
- Swagger: http://localhost:8000/docs
- Health: http://localhost:8000/health

## Tests

```bash
# Tạo test database
mysql -u root -p -e "CREATE DATABASE novamart_test CHARACTER SET utf8mb4;"

# Chạy tests (dùng novamart_test, KHÔNG bao giờ chạy trên production)
python -m pytest tests/ -q
```

26 tests: auth (8), products (7), orders (7), inventory/coupons/dashboard (4).

## API Endpoints

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| POST | /api/v1/auth/register | - | Đăng ký |
| POST | /api/v1/auth/login | - | Đăng nhập |
| POST | /api/v1/auth/refresh | - | Refresh token |
| GET | /api/v1/auth/me | User | Thông tin user |
| GET | /api/v1/categories | - | Danh sách danh mục |
| POST | /api/v1/categories | Admin | Tạo danh mục |
| GET | /api/v1/products | - | Tìm kiếm/lọc/phân trang |
| GET | /api/v1/products/{slug} | - | Chi tiết sản phẩm |
| POST | /api/v1/products | Admin | Tạo sản phẩm |
| PATCH | /api/v1/products/{id} | Admin | Sửa sản phẩm |
| DELETE | /api/v1/products/{id} | Admin | Ẩn sản phẩm |
| GET | /api/v1/cart | User | Giỏ hàng |
| POST | /api/v1/cart/items | User | Thêm vào giỏ |
| POST | /api/v1/orders/checkout | Optional | Đặt hàng |
| GET | /api/v1/orders | User | Lịch sử đơn hàng |
| PATCH | /api/v1/orders/{id}/status | Admin | Cập nhật trạng thái |
| GET | /api/v1/inventory/stock | Admin | Tồn kho |
| POST | /api/v1/inventory/receive | Admin | Nhập kho |
| POST | /api/v1/coupons/validate | - | Kiểm tra mã giảm giá |
| GET | /api/v1/dashboard/summary | Admin | Metrics dashboard |

## Quy tắc nghiệp vụ quan trọng

1. **Giá tiền**: Dùng `DECIMAL(12,0)`, không bao giờ dùng float.
2. **Checkout**: Tính tổng ở backend, khóa row (`SELECT ... FOR UPDATE`) chống oversell, tạo order + items + timeline + stock movements trong 1 transaction.
3. **Order items**: Snapshot giá tại thời điểm mua — giá sản phẩm đổi không ảnh hưởng đơn cũ.
4. **Orders**: Không xóa cứng, chỉ chuyển status. Hủy đơn hoàn kho + ghi movement.
5. **Coupons**: Validate ở server cả lúc preview và lúc checkout.
6. **Auth**: JWT access (30 phút) + refresh (7 ngày). Mật khẩu hash bằng bcrypt.

## Biến môi trường

Xem `.env.example`. **KHÔNG commit file `.env` thật lên git.**

| Biến | Mô tả |
|------|-------|
| `DATABASE_URL` | Connection string MySQL |
| `SECRET_KEY` | Khóa ký JWT (tạo bằng `secrets.token_urlsafe(64)`) |
| `CORS_ORIGINS` | Origins được phép, cách nhau bằng dấu phẩy |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Mặc định 30 |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Mặc định 7 |

## Lỗi thường gặp

| Lỗi | Nguyên nhân | Cách sửa |
|-----|-------------|----------|
| `Can't connect to MySQL` | MySQL chưa chạy / sai DATABASE_URL | Kiểm tra `sudo service mysql status` |
| `Access denied` | User/password sai | Tạo lại user MySQL với quyền đúng |
| Alembic `Target database is not up to date` | Chưa chạy migration | `alembic upgrade head` |
| `SECRET_KEY` yếu | Dùng key mặc định | Tạo key mới, restart server |
