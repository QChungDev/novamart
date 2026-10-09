# NovaMart — Website Thương Mại Điện Tử (Full-stack)

NovaMart là website thương mại điện tử hoàn chỉnh gồm **storefront cho khách hàng** và **admin dashboard**, xây dựng bằng Next.js (App Router) + TypeScript + Tailwind CSS. Toàn bộ giao diện tiếng Việt, giá tiền định dạng VND, dữ liệu sản phẩm công nghệ thực tế tại Việt Nam.

> **Phase 2 — Full-stack với backend thật.** Frontend Next.js gọi **FastAPI backend** (`backend/`) qua `NEXT_PUBLIC_API_BASE_URL`. 
> Dữ liệu thật lưu trong **MySQL**: sản phẩm, danh mục, giỏ hàng, đơn hàng, tồn kho, coupons, users.
> Auth dùng **JWT** (access + refresh token), phân quyền **customer/admin** ở server.

## Tính năng

### Storefront (khách hàng)
- Trang chủ: hero, danh mục nổi bật, sản phẩm nổi bật / bán chạy / mới về, đã xem gần đây, newsletter (demo)
- Danh sách sản phẩm: tìm kiếm **không dấu**, lọc danh mục / khoảng giá / còn hàng / đang giảm giá, sắp xếp, phân trang, đồng bộ URL
- Chi tiết sản phẩm: gallery ảnh, chọn số lượng, thêm vào giỏ / mua ngay, thông số kỹ thuật, đánh giá
- Giỏ hàng: tăng/giảm số lượng, xóa (có xác nhận), áp mã giảm giá, tính phí ship
- Thanh toán: validation form tiếng Việt, chọn hình thức vận chuyển/thanh toán (demo), trang xác nhận đơn hàng kèm mã đơn
- Tài khoản: đăng nhập/đăng ký/quên mật khẩu (mô phỏng), trang tổng quan, thông tin cá nhân, sổ địa chỉ (CRUD), lịch sử & chi tiết đơn hàng

### Admin dashboard (`/admin`)
- Tổng quan: thẻ chỉ số, biểu đồ doanh thu 14 ngày, biểu đồ trạng thái đơn, đơn gần đây, bán chạy nhất, cảnh báo sắp hết hàng
- Sản phẩm: tìm kiếm/lọc/phân trang, thêm/sửa (form validation đầy đủ)/xóa (có xác nhận)
- Danh mục: thêm/sửa/xóa qua modal (có xác nhận)
- Đơn hàng: lọc theo tab trạng thái, tìm kiếm, chi tiết đơn + cập nhật trạng thái (có xác nhận)
- Kho hàng: nhập hàng, điều chỉnh tồn kho (ghi lý do), lịch sử xuất/nhập/điều chỉnh
- Khách hàng: tìm kiếm, khóa/mở khóa tài khoản (có xác nhận)
- Khuyến mãi: tạo/sửa/xóa mã giảm giá (có xác nhận)
- Cài đặt: thông tin cửa hàng, phí vận chuyển, khôi phục dữ liệu demo

## Công nghệ

| Lớp | Công nghệ |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), React 19 |
| Ngôn ngữ | TypeScript (strict) |
| Styling | Tailwind CSS 4 |
| Icons | Lucide |
| Charts | Recharts |
| Dữ liệu Phase 1 | Mock data + `localStorage` (prototype, **không phải database**) |
| Backend (Phase 2) | FastAPI + SQLAlchemy 2.x + MySQL + Alembic + Pytest |
| Auth (Phase 2) | JWT (access 30p + refresh 7 ngày), bcrypt, RBAC customer/admin |

## Chạy Full-stack (Frontend + Backend)

### 1. Backend (FastAPI + MySQL)

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # sửa DATABASE_URL, SECRET_KEY
alembic upgrade head   # chạy migrations
python -m app.db.seed  # seed dữ liệu mẫu
python -m app.db.create_admin --email admin@novamart.vn  # tạo admin
uvicorn app.main:app --reload --port 8000
```
Chi tiết: xem [backend/README.md](backend/README.md). Swagger: http://localhost:8000/docs

### 2. Frontend (Next.js)

```bash
# .env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
npm run dev
```

## Cài đặt & chạy (Frontend only)

Yêu cầu: Node.js ≥ 20.

```bash
npm install
npm run dev      # chạy dev tại http://localhost:3000
```

Các lệnh kiểm tra:

```bash
npm run lint        # ESLint
npx tsc --noEmit    # type-check
npm run build       # production build
npm run start       # chạy bản production
```

## Tài khoản demo

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Khách hàng | `customer@novamart.vn` | `123456` |

(Chế độ đăng ký mô phỏng: bất kỳ email nào + mật khẩu ≥ 6 ký tự đều đăng nhập được.)

Mã giảm giá demo: `NOVAMART10`, `FREESHIP`, `SALE500K`, `WELCOME15`.

## Cấu trúc dự án

```
src/
├── app/
│   ├── (shop)/            # Storefront: /, /products, /cart, /checkout,
│   │                      # /login, /register, /account/...
│   ├── admin/             # Admin dashboard: /, /products, /categories,
│   │                      # /orders, /inventory, /customers, /coupons, /settings
│   └── layout.tsx         # Root layout (font Be Vietnam Pro, lang="vi")
├── components/
│   ├── ui/                # Button, Input, Badge, Modal, DataTable, Pagination...
│   ├── storefront/        # Header, Footer, ProductCard, Filters...
│   └── admin/             # ProductForm, charts (Recharts)
├── lib/
│   ├── types.ts           # Domain types (Product, Order, Customer, Coupon...)
│   ├── mock-data.ts       # Dữ liệu mẫu: 8 danh mục, 16 sản phẩm, đơn hàng...
│   ├── format.ts          # formatVND, formatDate...
│   ├── services/
│   │   ├── shop.ts        # Tìm kiếm/lọc/sắp xếp/phân trang sản phẩm
│   │   ├── pricing.ts     # Validate coupon, tính phí ship
│   │   └── admin.ts       # Admin store (mock): CRUD + localStorage
│   └── store/             # cart-store, auth-store, toast-store (localStorage)
```

## Lưu ý quan trọng (Phase 1)

- **Dữ liệu mẫu**: admin store và giỏ hàng lưu ở `localStorage` (`novamart-admin-v1`, `novamart-cart-v1`, ...). Xóa cache trình duyệt = mất dữ liệu demo. Trang `/admin/settings` có nút **khôi phục dữ liệu demo**.
- **Chưa có**: backend/API thật, database, xác thực thật, thanh toán thật, gửi email thật.
- Mọi thao tác phá hủy (xóa sản phẩm/danh mục/mã giảm giá, hủy đơn, khóa tài khoản...) đều có **hộp thoại xác nhận**.

## Lộ trình Phase 2 (chờ duyệt)

Kiến trúc đã tách tầng service để dễ thay thế:

| Phase 1 (hiện tại) | Phase 2 (dự kiến) |
|---|---|
| `lib/services/shop.ts` (mock) | API routes / FastAPI: `GET /api/products` |
| `lib/services/admin.ts` (localStorage) | FastAPI + MySQL (Botkeep Cloud) |
| `lib/store/auth-store.tsx` (mô phỏng) | JWT auth thật |
| `pricing.ts` (logic thuần) | Giữ nguyên — logic không đổi, chỉ đổi nguồn dữ liệu |
| Frontend deploy | Vercel |

Thay tầng mock bằng cách: giữ nguyên chữ ký hàm trong `lib/services/*`, đổi phần thân thành `fetch()` tới API. Components không cần sửa.

## Kiến trúc dữ liệu (cập nhật)

- **Unified store** (`src/lib/data/store.ts`): 1 state duy nhất cho shop + admin,
  lưu `localStorage`, tự đồng bộ khi có thay đổi.
- **Service async**: `shopService`, `adminActions`, `pricing` đều trả về `Promise`
  — Phase 2 chỉ cần đổi ruột thành `fetch()` FastAPI.
- **useStoreQuery** (`src/lib/data/use-store-query.ts`): hook fetch lại dữ liệu
  mỗi khi store thay đổi.
