# AI Shorts Studio — Kiến trúc

Monorepo: `backend/` (FastAPI) + `frontend/` (Next.js App Router).

## Backend modules (`backend/app/modules/`)

| Module | Trách nhiệm | Router prefix |
|---|---|---|
| projects | CRUD dự án, nhân bản | `/api/projects` |
| characters | Hồ sơ nhân vật, ảnh tham chiếu, Character Lock | `/api/characters` |
| scripts | Sinh kịch bản từ ý tưởng, quản lý scenes | `/api/scripts` |
| scenes | (dùng chung service với scripts) Scene CRUD, reorder | `/api/scripts` |
| video_generation | Provider adapters, GenerationJob queue, Manual Mode | `/api/video` |
| voices | VoiceProfile, TTS (edge-tts), preview | `/api/voices` |
| media | Upload file chung | `/api/media` |
| rendering | Timeline, audio tracks, subtitles, FFmpeg render | `/api/render` |
| audio | (trong rendering) dialogue TTS, audio tracks | `/api/render` |

Mỗi module: `router.py`, `service.py`, `schemas.py`. Models tập trung tại
`app/database/models.py` (single source of truth). `repository.py` là optional.

## Quy ước API

- JSON thuần, không envelope. Lỗi: `{"detail": "..."}` + HTTP status chuẩn.
- Upload: `multipart/form-data`. File lưu qua StorageProvider → trả `url`
  (`/media/...`) và `file_path` (relative).
- Không bao giờ trả API key về frontend (chỉ trả `api_key_set: true/false`).
- ID: int autoincrement. Thời gian: ISO datetime.
- Trạng thái Project: `draft | generating | ready_to_edit | rendering | completed`
- Trạng thái Scene: `draft | queued | generating | ready | failed`
- Trạng thái Job: `queued | processing | succeeded | failed | cancelled`

## Endpoints (hợp đồng)

### Projects — `/api/projects`
- `GET /` → `[{id,name,status,scene_count,target_duration_sec,thumbnail_url,created_at,updated_at}]`
- `POST /` `{name, description?, target_duration_sec=30, aspect_ratio="9:16", resolution="1080x1920", fps=30}` → Project
- `GET /{id}` → Project chi tiết
- `PATCH /{id}` → cập nhật trường
- `DELETE /{id}`
- `POST /{id}/duplicate` `{new_name?}` → Project mới (copy script+scenes+timeline, không copy file video đã render)

### Characters — `/api/characters`
- `GET /` → list (kèm `primary_image_url`, `image_count`, `voice_name`)
- `POST /` multipart: fields `name, character_code?, description, appearance, colors, outfit, accessories, body_ratio, art_style, lock_rules(JSON string), default_voice_profile_id?` + files `images[]` (ảnh đầu = primary)
- `GET /{id}` → chi tiết + images[]
- `PATCH /{id}` (JSON)
- `DELETE /{id}`
- `POST /{id}/images` (multipart `images[]`)
- `DELETE /images/{image_id}`
- `GET /{id}/lock-prompt` → `{prompt}` (Character Lock prompt dùng khi gen video)

### Scripts & Scenes — `/api/scripts`
- `POST /generate` `{project_id, idea, character_ids[], style?, audience?, target_duration_sec, dialogue_language="vi"}` → `{script, scenes[]}` (tạo Script + Scene, không cắt ngang câu thoại, mỗi scene ≤ provider limit mặc định 10s)
- `GET /project/{project_id}` → `{script, scenes[]}` (mỗi scene kèm `characters[]`, `video_url?`)
- `PATCH /{script_id}` `{story_text?}`
- `PATCH /scenes/{scene_id}` (JSON: mọi trường scene cho phép sửa)
- `POST /project/{project_id}/scenes/reorder` `{ordered_ids:[...]}`
- `DELETE /scenes/{scene_id}`

### Video generation — `/api/video`
- `GET /providers` → `[{id, provider_type, name, adapter, base_url?, model?, api_key_set, capabilities{}, is_active}]`
- `POST /providers` `{provider_type="video", name, adapter, base_url?, api_key?, model?, options?}` (api_key mã hoá Fernet)
- `PATCH /providers/{id}`, `DELETE /providers/{id}`
- `POST /providers/{id}/test` → `{ok, message, capabilities?}`
- `POST /projects/{project_id}/generate` `{scene_ids?}` → `{jobs:[...]}` (tạo GenerationJob queued; worker xử lý nền)
- `GET /jobs?project_id=` → list jobs
- `GET /jobs/{job_id}`
- `POST /jobs/{job_id}/cancel`, `POST /jobs/{job_id}/retry`
- `GET /scenes/{scene_id}/prompt-pack` → `{video_prompt, negative_prompt, reference_image_urls[], scene_info}` (Manual Mode)
- `POST /scenes/{scene_id}/upload` (multipart `video`) → scene.status=ready

Adapters (`modules/video_generation/providers/`):
- `base.py`: `VideoProvider` ABC — `check_connection()`, `capabilities()`, `submit_scene(scene, character_images, prompt_pack) -> task_id`, `poll_task(task_id) -> {status, video_url?, error?}`, `cancel_task(task_id)`, `download_result(video_url, dest)`.
- `byteplus_seedance.py`: `BytePlusSeedanceAdapter` — API chính thức BytePlus ModelArk (Seedance), async task pattern. Endpoint theo tài liệu BytePlus hiện hành, cấu hình được qua `base_url`/`model`.
- `generic_compatible.py`: `GenericCompatibleAdapter` — provider bên thứ ba tương thích, endpoint cấu hình trong `options` (`submit_url`, `status_url_template`, `video_url_field`, `auth_header`).
- `manual.py`: `ManualImportProvider` — không gọi API; `submit_scene` tạo prompt-pack, trạng thái chờ upload thủ công.

### Voices — `/api/voices`
- `GET /` → `[{id,name,character_id,character_name,gender,language,accent,tone,provider,provider_voice_id,is_default}]`
- `POST /` `{name, character_id?, gender, language="vi-VN", accent?, pitch?=1.0, rate?=1.0, tone?, provider="edge_tts", provider_voice_id, is_default?=false}`
- `POST /preview` `{provider_voice_id, text, rate?, pitch?}` → `{audio_url}`
- `PATCH /{id}`, `DELETE /{id}`
- `POST /assign` `{character_id, voice_profile_id}`
- `GET /tts/voices?language=vi-VN` → danh sách giọng edge-tts

### Media — `/api/media`
- `POST /upload` multipart `file`, `kind` (image|video|audio), `project_id?` → `{id, url, file_path, mime, size_bytes, width?, height?, duration_sec?}`

### Rendering — `/api/render`
- `GET /projects/{project_id}/timeline` → `{clips:[{id, scene_id, scene_name, sort_order, trim_start_sec, trim_end_sec, transition, video_url, duration_sec}]}`
- `PUT /projects/{project_id}/timeline` `{clips:[{scene_id, sort_order, trim_start_sec?, trim_end_sec?, transition?}]}` (upsert)
- `POST /projects/{project_id}/dialogue-audio` → `{tracks:[...]}` (TTS lời thoại từng scene theo voice đã gán)
- `GET /projects/{project_id}/audio` → `{tracks:[...]}`
- `PATCH /audio/{track_id}` `{volume?, fade_in_sec?, fade_out_sec?, start_offset_sec?}`
- `POST /projects/{project_id}/music` multipart `file` → track nhạc nền
- `GET /projects/{project_id}/subtitles` → `{entries:[{id,start_sec,end_sec,text}], srt_url?}`
- `PUT /projects/{project_id}/subtitles` `{entries:[{start_sec,end_sec,text}]}`
- `POST /projects/{project_id}/render` `{resolution?="1080x1920", fps?=30, burn_subtitles?=true, export_srt?=true}` → RenderJob (worker nền)
- `GET /jobs/{job_id}` → `{..., progress, output_url?, srt_url?, error?}`
- `GET /jobs/{job_id}/download` → file MP4

## Service hooks (worker gọi)

```python
# modules/video_generation/service.py
def process_generation_job(job: GenerationJob, db: Session) -> None: ...

# modules/rendering/service.py
def process_render_job(job: RenderJob, db: Session, progress_cb) -> None: ...

# modules/scripts/service.py
def generate_script(db: Session, project_id: int, idea: str, character_ids: list[int],
                    style: str | None, audience: str | None,
                    target_duration_sec: int, dialogue_language: str = "vi") -> Script: ...

# modules/voices/service.py
def synthesize_speech(text: str, voice_id: str, rate: float, pitch: float, dest_path: str) -> str: ...
def list_edge_tts_voices(language: str = "vi-VN") -> list[dict]: ...

# modules/characters/service.py
def build_lock_prompt(character: Character, extra_refs: bool = True) -> str: ...
```

## Worker nền

`app/core/worker.py`: 1 thread, poll mỗi `WORKER_POLL_SECONDS`:
lấy 1 GenerationJob `queued` (cũ nhất) → `process_generation_job`;
lấy 1 RenderJob `queued` → `process_render_job`. Mỗi job tự commit trạng thái.

## Storage

`app/core/storage.py`: `StorageProvider` ABC (`save_upload`, `abs_path`, `url_for`, `delete`).
`LocalStorageProvider` lưu dưới `MEDIA_ROOT`, serve qua `/media` (StaticFiles).
`S3StorageProvider`: khung sẵn, cần `boto3` + cấu hình mới hoạt động.

## Frontend

Next.js App Router, TypeScript, Tailwind, dark theme mặc định, tiếng Việt.
`lib/api.ts`: client gọi đúng contract trên, base URL từ `NEXT_PUBLIC_API_BASE_URL`.
Sidebar: Dashboard, My Projects, Character Studio, Script & Storyboard,
Voice Studio, Video Editor, Render & Export, API Settings.
