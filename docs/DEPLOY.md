# Triển khai AI Shorts Studio

## Tổng quan

| Thành phần | Nền tảng | Ghi chú |
|---|---|---|
| Frontend (Next.js) | Vercel | Root Directory: `frontend` |
| Backend (FastAPI) | Railway / Render | Root Directory: `backend`, cần FFmpeg |
| Database | PostgreSQL | Railway Postgres / Supabase / Render Postgres |

## 1. Database (PostgreSQL)

Tạo PostgreSQL ở bất kỳ đâu (Supabase miễn phí là đủ cho MVP).
Lấy connection string dạng:

```
postgresql+psycopg://user:password@host:5432/dbname
```

> Lưu ý: driver là `psycopg` (v3), đã có trong requirements (`psycopg[binary]`).
> Alembic: `alembic upgrade head` — hoặc để app tự `create_all` khi khởi động
> (hiện tại `init_db()` tự tạo bảng, đủ cho MVP).

## 2. Backend

Biến môi trường bắt buộc:

```
DATABASE_URL=postgresql+psycopg://...
SECRET_KEY=<Fernet key, tạo bằng: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())">
MEDIA_ROOT=/data/media        # mount volume persistent ở đây
CORS_ORIGINS=https://<frontend-domain>
APP_ENV=production
```

**Railway:**
- Tạo service mới từ repo, Root Directory = `backend`.
- File `nixpacks.toml` đã cài sẵn FFmpeg.
- Add volume mount vào `/data/media`, set `MEDIA_ROOT=/data/media`.
- Add PostgreSQL plugin hoặc dùng Supabase, set `DATABASE_URL`.

**Render:**
- Web Service, Root Directory `backend`, Build: `pip install -r requirements.txt`,
  Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
- Cần Docker để có FFmpeg: dùng `render.yaml` (Blueprint) hoặc Dockerfile tự viết
  `FROM python:3.12-slim + apt install ffmpeg`.

## 3. Frontend (Vercel)

- Import repo vào Vercel, **Root Directory = `frontend`**, framework Next.js.
- Env: `NEXT_PUBLIC_API_BASE_URL=https://<backend-domain>` (không có trailing slash).
- Deploy — mọi push lên `main` tự build lại.

## 4. Kiểm tra sau deploy

1. Mở `https://<backend>/health` → `{"status":"ok"}`.
2. Mở frontend → Dashboard → tạo dự án → tạo nhân vật → sinh kịch bản.
3. Render thử với 2 cảnh (dùng Manual Mode: tải 2 file MP4 mẫu lên).

## Lưu ý giới hạn

- Worker nền chạy trong cùng process backend (1 thread). Đủ cho MVP 1 user;
  khi nhiều user, tách sang Celery/Redis.
- File media trên Railway/Render free có thể mất khi redeploy nếu không mount volume —
  production thật nên chuyển sang S3 (khung `S3StorageProvider` đã có sẵn).
- Render free ngủ sau 15 phút không dùng (cold start ~30-60s).
