# Xác minh API Seedance / Muse AI — 17/10/2026 (kiểm tra độc lập qua web)

Mục đích: đối chiếu với yêu cầu của Ngô "xác minh API thực tế, tài liệu, phương thức
xác thực và các giới hạn của nhà cung cấp. Không tự tạo ra endpoint giả định."

## Phát hiện quan trọng (sửa sai báo cáo tiến độ 09:36 UTC)

- Báo cáo tiến độ nói "tối đa ~15s/clip". **Thực tế Seedance 2.5 trên ModelArk hỗ trợ
  duration `[4,30]` giây (hoặc `-1` cho multi-round extension)** — tức tối đa **30s/clip**
  một lần gọi. Ví dụ 40s → chỉ cần **2 clip ~20s**, không phải 4 clip 10s.
  (llm-stats.com; aiseedance25.app)
- Hệ quả thiết kế Script Studio: ưu tiên chia cảnh theo 15–30s/clip để giảm số lần gọi,
  nhân vật nhất quán hơn, chi phí thấp hơn.

## Contract API đã xác minh (3 nguồn độc lập)

- Base URL (quốc tế): `https://ark.ap-southeast.bytepluses.com/api/v3`
- Tạo task: `POST /contents/generations/tasks`
- Tra cứu task: `GET /contents/generations/tasks/{id}`
- Kết quả thành công: đọc `content.video_url` từ task
- Model ID quốc tế: `dreamina-seedance-2-5-260628`
  (tuyệt đối không dùng `doubao-seedance-2-5-260628` — đó là namespace Volcengine Trung Quốc,
  không dùng lẫn được)
- Auth: API key tạo trong ModelArk console, đúng resource project
- Region: mặc định ap-southeast (Singapore). **Task tạo ở region nào chỉ nhìn thấy ở
  region đó** — không đổi region giữa chừng.
- (blog.laozhang.ai, aiseedance25.app, llm-stats.com)

## Rào cản kích hoạt (gate) — Ngô cần biết trước khi test

Seedance 2.5 **không bật mặc định**. Cần một trong ba:
1. Số dư tài khoản > USD 30, hoặc
2. AI Savings Plan bậc USD 30 trở lên, hoặc
3. Seedance resource pack còn quota.
Kích hoạt tại: ModelArk → Model activation → Computer Vision.
Nếu chưa kích hoạt: tạo task thất bại với lỗi authorization **dù API key hợp lệ**.
(glama.ai — byteplus-seedance-mcp README)

## Giá (rate card công khai)

- Tính theo token: **$10.70 / 1M token** (không có video input); $6.40 / 1M (có video input).
- Ví dụ 16:9, 5s: **$0.514 (480p)**, **$1.156 (720p)**.
- Chỉ có **480p / 720p** trên API — không 1080p/4K.
- Chỉ tính phí **video tạo thành công**; tạo lỗi không mất phí (chính sách BytePlus).
- Ước tính video 40s: ~$4.1 (480p) / ~$9.2 (720p) — con số suy từ ví dụ 5s, không tuyến tính
  tuyệt đối; ảnh tham chiếu làm tăng token.
- Công thức token (provider mô tả): (input_video_seconds + output_seconds) × w × h × fps / 1024.
- **Ghi log `usage.completion_tokens` trên mọi response thành công** để build cost model thực tế.
- (aireiter.com, llm-stats.com, aiseedance25.app)

## Hỗ trợ Character Studio

- Một lần gọi nhận tối đa **30 ảnh / 10 video / 10 audio tham chiếu**
  (tổng video tham chiếu ≤30s, audio ≤30s) — đủ mạnh cho character lock bằng ảnh.
- Seedance 2.5 có native joint audio-video và timestamp-level editing.
- API **không khả dụng tại Mỹ** — không ảnh hưởng Ngô (Việt Nam, region ap-southeast).
- (llm-stats.com)

## Voice Studio — TTS tiếng Việt miễn phí (đã xác minh)

**edge-tts** (PyPI, open source, `pip install edge-tts`) — dùng dịch vụ TTS online của
Microsoft Edge, không cần API key:
- Giọng Việt: `vi-VN-HoaiMyNeural` (nữ), `vi-VN-NamMinhNeural` (nam) — 2 giọng chính,
  được nhiều trang TTS liệt kê; `edge-tts --list-voices` để xem đầy đủ.
- Có module Python (hợp FastAPI backend), CLI; hỗ trợ `--rate/--volume`, và
  `--write-subtitles` tạo file phụ đề VTT/SRT — tái dùng cho track phụ đề ở Render & Export.
- Miễn phí, **không giới hạn số ký tự/ngày, chỉ giới hạn tốc độ gọi (rate limit)**
  (digitalmarket.world).
- Lưu ý: dựa trên dịch vụ online của Microsoft, không phải API chính thức có SLA;
  dùng làm provider mặc định miễn phí, giữ thiết kế adapter cho provider trả phí sau.
- (pypi.org/project/edge-tts; speechactors.com; luvvoice.com)

Các lựa chọn thương mại có free tier (không ưu tiên): Listen2It (free 2,500 words một lần,
chỉ dùng cá nhân/đánh giá), FreeReadText (10,000 ký tự/tháng).
