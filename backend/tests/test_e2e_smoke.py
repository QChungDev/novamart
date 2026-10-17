"""Smoke test end-to-end (khong can mang ngoai).

Chay: cd backend && .venv/bin/python -m pytest tests/test_e2e_smoke.py -x -q
Hoac truc tiep: .venv/bin/python tests/test_e2e_smoke.py
"""
import io
import os
import subprocess
import sys
import tempfile

tmp = tempfile.mkdtemp(prefix="studio_smoke_")
os.environ["DATABASE_URL"] = f"sqlite:///{tmp}/app.db"
os.environ["MEDIA_ROOT"] = f"{tmp}/media"
os.environ["SECRET_KEY"] = "smoke-test-key"
os.environ["WORKER_POLL_SECONDS"] = "3600"

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient  # noqa: E402

from app.database.base import init_db  # noqa: E402
from app.main import app  # noqa: E402

init_db()
c = TestClient(app)
FAILS: list[str] = []


def check(name, cond, extra=""):
    print(("PASS " if cond else "FAIL ") + name)
    if not cond:
        FAILS.append(name + (f" :: {extra}" if extra else ""))


def make_clip(path, color, dur=5):
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i",
         f"color=c={color}:s=640x960:d={dur}:r=30",
         "-f", "lavfi", "-i", f"sine=frequency=440:duration={dur}",
         "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac",
         "-shortest", path], check=True,
    )


def run():
    r = c.get("/health")
    check("health", r.status_code == 200)

    r = c.post("/api/projects/", json={"name": "Meo Moc tap 1", "target_duration_sec": 30})
    check("create project", r.status_code in (200, 201), r.text[:120])
    pid = r.json()["id"]

    from PIL import Image
    img = Image.new("RGB", (256, 256), color=(255, 150, 50))
    buf = io.BytesIO(); img.save(buf, format="PNG"); buf.seek(0)
    r = c.post("/api/characters/", data={
        "name": "Meo Moc", "appearance": "Meo muop cam mum mim, bung mau kem",
        "art_style": "Hoat hinh 3D dang yeu",
    }, files=[("images", ("moc.png", buf, "image/png"))])
    check("create character", r.status_code in (200, 201), r.text[:120])
    char1 = r.json()

    img2 = Image.new("RGB", (256, 256), color=(80, 120, 255))
    buf2 = io.BytesIO(); img2.save(buf2, format="PNG"); buf2.seek(0)
    r = c.post("/api/characters/", data={
        "name": "Robot Bip", "appearance": "Robot nho mau xanh, mat tron",
    }, files=[("images", ("bip.png", buf2, "image/png"))])
    char2 = r.json()
    check("create character 2", r.status_code in (200, 201))

    r = c.get(f"/api/characters/{char1['id']}/lock-prompt")
    check("lock prompt", r.status_code == 200 and "DO NOT change" in r.json()["prompt"])

    r = c.post("/api/voices/", json={
        "name": "Giong Meo Moc", "character_id": char1["id"], "gender": "male",
        "provider_voice_id": "vi-VN-NamMinhNeural", "tone": "hai huoc",
    })
    check("create voice", r.status_code in (200, 201), r.text[:100])

    r = c.post("/api/scripts/generate", json={
        "project_id": pid,
        "idea": "Meo Moc an qua nhieu banh va bi Robot Bip phat hien",
        "character_ids": [char1["id"], char2["id"]],
        "style": "Hoat hinh 3D", "audience": "Thieu nhi",
        "target_duration_sec": 30, "dialogue_language": "vi",
    })
    check("generate script", r.status_code == 200, r.text[:120])
    scenes = r.json()["scenes"]
    check("scenes>=2", len(scenes) >= 2, f"{len(scenes)}")
    check("scene<=30s (provider limit)", all(s["target_duration_sec"] <= 30 for s in scenes))
    check("dialogue present", any(len(s["dialogue"]) > 0 for s in scenes))
    check("video_prompt EN", all(len(s["video_prompt"]) > 20 for s in scenes))

    for i, s in enumerate(scenes):
        clip = f"{tmp}/clip{i}.mp4"
        make_clip(clip, "red" if i % 2 == 0 else "blue", 5)
        with open(clip, "rb") as f:
            r = c.post(f"/api/video/scenes/{s['id']}/upload",
                       files=[("video", (f"clip{i}.mp4", f, "video/mp4"))])
        check(f"upload {s['scene_code']}", r.status_code == 200 and r.json().get("scene_status") == "ready")

    r = c.put(f"/api/render/projects/{pid}/timeline", json={"clips": [
        {"scene_id": s["id"], "sort_order": i, "transition": "cut"} for i, s in enumerate(scenes)]})
    check("save timeline", r.status_code in (200, 204), r.text[:80])

    r = c.get(f"/api/render/projects/{pid}/subtitles")
    check("auto subtitles", r.status_code == 200 and len(r.json()["entries"]) > 0)

    r = c.post(f"/api/render/projects/{pid}/render", json={
        "resolution": "720x1280", "fps": 30, "burn_subtitles": False, "export_srt": True})
    check("submit render", r.status_code in (200, 201), r.text[:100])
    job_id = r.json()["id"]

    from app.core.storage import get_storage
    from app.database.base import SessionLocal
    from app.database.models import RenderJob
    from app.modules.rendering.service import process_render_job

    st = get_storage()
    db = SessionLocal()
    job = db.query(RenderJob).get(job_id)
    process_render_job(job, db, lambda p: None)
    db.refresh(job)
    check("render succeeded", job.status == "succeeded", (job.error or "")[:200])
    out = st.abs_path(job.output_path)
    check("mp4 exists", out.is_file() and out.stat().st_size > 10000)
    check("srt exported", bool(job.srt_path) and st.exists(job.srt_path), job.srt_path)
    db.close()

    print()
    if FAILS:
        print(f"THAT BAI {len(FAILS)}:")
        for f in FAILS:
            print(" -", f)
        sys.exit(1)
    print("TAT CA PASS")


if __name__ == "__main__":
    run()
