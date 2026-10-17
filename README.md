# AI Shorts Studio

Nền tảng tạo video ngắn nhiều cảnh bằng AI: từ ý tưởng → kịch bản → từng cảnh video (Muse AI / Seedance API / Manual Mode) → giọng đọc nhân vật → ghép + render MP4 9:16 bằng FFmpeg.

Giao diện tiếng Việt, dark theme.

## Kiến trúc

```
ai-shorts-studio/
├── backend/          # FastAPI + SQLAlchemy + Alembic
│   └── app/
│       ├── core/         # config, security (Fernet), storage (Local/S3), worker nền
│       ├── database/     # Base + models (PostgreSQL prod / SQLite dev)
│       └── modules/
│           ├── projects/        # CRUD dự án, nhân bản
│           ├── characters/      # Hồ sơ nhân vật + Character Lock prompt
│           ├── scripts/         # Sinh kịch bản TV từ ý tưởng, chia cảnh ≤10s
│           ├── video_generation/# Provider adapters: manual | byteplus_seedance | generic
│           ├── voices/          # VoiceProfile + Edge TTS (miễn phí, tiếng Việt)
│           ├── media/           # Upload file chung
│           └── rendering/       # Timeline, audio, phụ đề, FFmpeg render
└── frontend/         # Next.js 16 App Router + Tailwind 4 + TypeScript
```

Chi tiết hợp đồng API: xem `docs/ARCHITECTURE.md`.

## Chạy local (development)

Yêu cầu: Python 3.12+, Node 24+, FFmpeg (có sẵn `ffmpeg` trong PATH).

**Backend:**

```bash
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
cp .env.example .env   # sửa SECRET_KEY
.venv/bin/uvicorn app.main:app --reload --port 8000
```

Mặc định dùng SQLite (`./data/app.db`) — không cần cài PostgreSQL để dev.
Media lưu ở `./data/media`, truy cập qua `http://localhost:8000/media/...`.

**Frontend:**

```bash
cd frontend
npm install
npm run dev   # http://localhost:3000 (proxy /api → backend:8000)
```

Mở http://localhost:3000/dashboard.

## Luồng sử dụng MVP (không cần API key)

1. **Dashboard** → tạo dự án (chọn 15/30/45/60/90s).
2. **Character Studio** → tạo nhân vật + tải ảnh tham chiếu, gán giọng ở Voice Studio.
3. **Voice Studio** → tạo hồ sơ giọng (Edge TTS miễn phí, giọng Việt HoaiMy/NamMinh), nghe thử.
4. **Script & Storyboard** → nhập ý tưởng → "Sinh kịch bản & chia cảnh".
   Mỗi cảnh có nút **📋 Prompt** để copy prompt sang app Muse AI (Manual Mode),
   rồi **⬆️ Tải MP4 lên** đúng cảnh.
5. **Video Editor** → kéo thả sắp xếp, cắt đầu/cuối, chọn chuyển cảnh.
6. **Render & Export** → "Tạo lời thoại từ kịch bản" (TTS), tải nhạc nền,
   sửa phụ đề → "Bắt đầu render" → tải MP4 1080×1920.

## Dùng API video thật (tùy chọn)

Vào **API Settings** → thêm provider **BytePlus Seedance**:
- Đăng ký tài khoản tại https://www.byteplus.com (quốc tế), lấy API key.
- Base URL mặc định: `https://ark.ap-southeast.byteplus.com/api/v3`
- Model mặc định: `dreamina-seedance-2-5-260628` (Seedance — cùng công nghệ đứng sau Muse AI).
- Bấm "Kiểm tra kết nối" để xác nhận.

Sau đó ở Script & Storyboard bấm "Tạo video tất cả cảnh" — hệ thống gửi từng cảnh
kèm ảnh tham chiếu nhân vật, worker nền poll trạng thái và tải video về tự động.

## Triển khai production

- **Frontend**: Vercel (Root Directory: `frontend`, env `NEXT_PUBLIC_API_BASE_URL`).
- **Backend**: Railway/Render (Root Directory: `backend`, cài FFmpeg qua `nixpacks.toml`,
  `DATABASE_URL` PostgreSQL, `MEDIA_ROOT` persistent volume).
- Xem `docs/DEPLOY.md`.

## Bảo mật

- API key mã hóa Fernet trong DB, không bao giờ trả về frontend.
- File upload kiểm tra loại + dung lượng; không lưu base64 trong DB.
- `.env` không commit (xem `.env.example`).
