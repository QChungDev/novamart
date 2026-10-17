"""Render & Export: ghep timeline + audio + phu de thanh MP4 bang FFmpeg.

process_render_job duoc worker goi (sync). Moi buoc nang deu chay tren backend,
khong khoa UI. Loi raise Exception -> worker danh dau job failed.
"""
from __future__ import annotations

import shutil
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.storage import get_storage
from app.database.models import (
    AudioTrack,
    Project,
    RenderJob,
    Scene,
    SubtitleEntry,
    TimelineClip,
)
from app.modules.rendering.ffmpeg import probe, run


def _parse_resolution(value: str) -> tuple[int, int]:
    try:
        w, h = value.lower().replace(" ", "").split("x")
        wi, hi = int(w), int(h)
        if wi <= 0 or hi <= 0 or wi > 4096 or hi > 4096:
            raise ValueError
        return wi, hi
    except (ValueError, AttributeError):
        raise ValueError(
            f"Resolution không hợp lệ: '{value}'. Dùng dạng '1080x1920'."
        ) from None


def _srt_time(sec: float) -> str:
    sec = max(0.0, float(sec))
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = int(sec % 60)
    ms = int(round((sec - int(sec)) * 1000))
    if ms == 1000:
        s += 1
        ms = 0
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def build_srt(entries: list[SubtitleEntry]) -> str:
    lines: list[str] = []
    for i, e in enumerate(entries, start=1):
        if e.end_sec <= e.start_sec or not (e.text or "").strip():
            continue
        lines.append(str(i))
        lines.append(f"{_srt_time(e.start_sec)} --> {_srt_time(e.end_sec)}")
        lines.append((e.text or "").strip())
        lines.append("")
    return "\n".join(lines).strip() + ("\n" if lines else "")


def _escape_sub_path(path: str) -> str:
    # Escape cho filter subtitles='...'
    return path.replace("\\", "/").replace("'", r"\'").replace(":", r"\:")


def _clip_duration_sec(clip: TimelineClip, scene: Scene) -> float:
    """Duration thuc te cua clip sau trim (dung de tinh offset am thanh)."""
    storage = get_storage()
    try:
        info = probe(storage.abs_path(scene.output_video_path))
        src_dur = info.get("duration") or 0
    except Exception:  # noqa: BLE001
        src_dur = 0
    if not src_dur:
        src_dur = float(scene.target_duration_sec or 10)
    start = max(0.0, clip.trim_start_sec or 0.0)
    end = clip.trim_end_sec or 0.0
    if end > start:
        return max(0.1, min(end, src_dur) - start)
    return max(0.1, src_dur - start)


def timeline_clip_durations(project_id: int, db: Session) -> list[tuple[TimelineClip, float]]:
    """Tra [(clip, duration)] theo sort_order. Dung chung cho dialogue-audio va subtitles."""
    clips = (
        db.query(TimelineClip)
        .filter(TimelineClip.project_id == project_id)
        .order_by(TimelineClip.sort_order.asc(), TimelineClip.id.asc())
        .all()
    )
    out: list[tuple[TimelineClip, float]] = []
    for clip in clips:
        scene = db.get(Scene, clip.scene_id)
        if scene is None:
            continue
        out.append((clip, _clip_duration_sec(clip, scene)))
    return out


def process_render_job(job: RenderJob, db: Session, progress_cb) -> None:
    """Render timeline thanh MP4 hoan chinh."""
    job = db.get(RenderJob, job.id)
    if job is None:
        raise RuntimeError("RenderJob không tồn tại")
    project = db.get(Project, job.project_id)
    if project is None:
        raise RuntimeError("Project của job không tồn tại")

    settings = job.settings or {}
    try:
        width, height = _parse_resolution(
            str(settings.get("resolution") or project.resolution or "1080x1920")
        )
    except ValueError as e:
        raise RuntimeError(str(e)) from e
    fps = int(settings.get("fps") or project.fps or 30)
    burn_subtitles = bool(settings.get("burn_subtitles", True))
    export_srt = bool(settings.get("export_srt", True))

    storage = get_storage()
    clips = (
        db.query(TimelineClip)
        .filter(TimelineClip.project_id == project.id)
        .order_by(TimelineClip.sort_order.asc(), TimelineClip.id.asc())
        .all()
    )
    if not clips:
        raise RuntimeError("Timeline chưa có clip nào. Hãy thêm scene vào timeline trước khi render.")

    # --- Kiem tra video dau vao ---
    missing: list[str] = []
    clip_scenes: list[tuple[TimelineClip, Scene]] = []
    for clip in clips:
        scene = db.get(Scene, clip.scene_id)
        if scene is None:
            missing.append(f"scene_id={clip.scene_id} (không tồn tại)")
            continue
        if not scene.output_video_path or not storage.exists(scene.output_video_path):
            missing.append(scene.scene_code or scene.name or f"scene {scene.id}")
            continue
        clip_scenes.append((clip, scene))
    if missing:
        raise RuntimeError(
            "Các cảnh sau chưa có video, không thể render: " + ", ".join(missing)
        )
    progress_cb(10)

    workdir = storage.abs_path(f"tmp/render_{job.id}")
    workdir.mkdir(parents=True, exist_ok=True)

    try:
        # --- 1. Chuan hoa tung clip: trim, scale+pad, fps, codec ---
        norm_files: list[Path] = []
        clip_durations: list[float] = []
        for i, (clip, scene) in enumerate(clip_scenes):
            src = storage.abs_path(scene.output_video_path)
            src_dur = probe(src)["duration"] or float(scene.target_duration_sec or 10)
            start = max(0.0, clip.trim_start_sec or 0.0)
            end = clip.trim_end_sec or 0.0
            dur = (min(end, src_dur) - start) if end > start else (src_dur - start)
            if dur <= 0:
                raise RuntimeError(
                    f"Clip '{scene.name or scene.scene_code}' có thời lượng cắt không hợp lệ "
                    f"(trim {start}s → {end or src_dur}s, video gốc {src_dur:.1f}s)."
                )
            vf = (
                f"scale={width}:{height}:force_original_aspect_ratio=decrease,"
                f"scale=trunc(iw/2)*2:trunc(ih/2)*2,"
                f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:color=black,"
                f"fps={fps}"
            )
            if (clip.transition or "cut") == "fade":
                vf += ",fade=t=in:st=0:d=0.5"
                if i < len(clip_scenes) - 1:
                    vf += f",fade=t=out:st={max(0.0, dur - 0.5):.2f}:d=0.5"
            out = workdir / f"clip_{i:03d}.mp4"
            run([
                "ffmpeg", "-y",
                "-i", str(src),
                "-ss", f"{start:.3f}", "-t", f"{dur:.3f}",
                "-vf", vf,
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
                "-pix_fmt", "yuv420p",
                "-c:a", "aac", "-b:a", "128k", "-ar", "44100", "-ac", "2",
                str(out),
            ])
            try:
                dur = probe(out)["duration"] or dur
            except Exception:  # noqa: BLE001
                pass
            norm_files.append(out)
            clip_durations.append(dur)
        total_dur = sum(clip_durations)
        if total_dur <= 0:
            raise RuntimeError("Tổng thời lượng timeline bằng 0, không thể render.")
        progress_cb(30)

        # --- 2. Noi cac clip bang concat demuxer (cung thong so) ---
        lst = workdir / "list.txt"
        lst.write_text(
            "".join(f"file '{str(p).replace(chr(39), chr(39) + chr(92) + chr(39) + chr(39))}'\n"
                    for p in norm_files),
            encoding="utf-8",
        )
        joined = workdir / "joined.mp4"
        run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(lst),
             "-c", "copy", str(joined)])
        progress_cb(50)

        # --- 3. Am thanh: tron cac track theo offset ---
        tracks = (
            db.query(AudioTrack)
            .filter(AudioTrack.project_id == project.id)
            .order_by(AudioTrack.id.asc())
            .all()
        )
        mixed = workdir / "mixed.mp4"
        if tracks:
            for t in tracks:
                if not storage.exists(t.file_path):
                    raise RuntimeError(
                        f"File âm thanh của track '{t.label or t.kind}' không tồn tại: {t.file_path}"
                    )
            inputs: list[str] = ["-i", str(joined)]
            filt: list[str] = []
            labels: list[str] = []
            for j, t in enumerate(tracks):
                tp = str(storage.abs_path(t.file_path))
                if t.kind == "music":
                    inputs += ["-stream_loop", "-1", "-i", tp]
                else:
                    inputs += ["-i", tp]
                try:
                    t_dur = probe(tp)["duration"] or 0
                except Exception:  # noqa: BLE001
                    t_dur = 0
                start = max(0.0, t.start_offset_sec or 0.0)
                vol = max(0.0, min(3.0, t.volume if t.volume is not None else 1.0))
                fi = max(0.0, t.fade_in_sec or 0.0)
                fo = max(0.0, t.fade_out_sec or 0.0)
                chain = f"[{j + 1}:a]aresample=44100,aformat=channel_layouts=stereo,volume={vol}"
                if fi > 0:
                    chain += f",afade=t=in:st=0:d={fi:.2f}"
                if fo > 0:
                    seg = t_dur if (t.kind != "music" and t_dur > 0) else max(0.0, total_dur - start)
                    out_st = max(0.0, min(seg, max(0.0, total_dur - start)) - fo)
                    chain += f",afade=t=out:st={out_st:.2f}:d={fo:.2f}"
                ms = int(start * 1000)
                chain += (
                    f",adelay={ms}|{ms},atrim=0:{total_dur:.3f},"
                    f"apad=whole_dur={total_dur:.3f}[a{j}]"
                )
                filt.append(chain)
                labels.append(f"[a{j}]")
            filt.append(
                f"{''.join(labels)}amix=inputs={len(labels)}:normalize=0,dynaudnorm[mix]"
            )
            run([
                "ffmpeg", "-y", *inputs,
                "-filter_complex", ";".join(filt),
                "-map", "0:v", "-map", "[mix]",
                "-c:v", "copy",
                "-c:a", "aac", "-b:a", "128k", "-ar", "44100", "-ac", "2",
                "-movflags", "+faststart",
                str(mixed),
            ])
        else:
            # Khong co track nao: giu audio goc cua clip noi
            shutil.copyfile(joined, mixed)
        progress_cb(70)

        # --- 4. Phu de ---
        entries = (
            db.query(SubtitleEntry)
            .filter(SubtitleEntry.project_id == project.id)
            .order_by(SubtitleEntry.sort_order.asc(), SubtitleEntry.id.asc())
            .all()
        )
        srt_rel = ""
        if entries and export_srt:
            srt_text = build_srt(entries)
            if srt_text.strip():
                srt_rel = storage.save_bytes(
                    srt_text.encode("utf-8"), f"exports/project_{project.id}",
                    f"render_{job.id}.srt",
                )

        out_rel = f"exports/project_{project.id}/render_{job.id}.mp4"
        out_abs = storage.abs_path(out_rel)
        out_abs.parent.mkdir(parents=True, exist_ok=True)

        warning = ""
        if entries and burn_subtitles and srt_rel:
            srt_abs = storage.abs_path(srt_rel)
            try:
                run([
                    "ffmpeg", "-y", "-i", str(mixed),
                    "-vf", f"subtitles='{_escape_sub_path(str(srt_abs))}'",
                    "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
                    "-pix_fmt", "yuv420p",
                    "-c:a", "copy",
                    "-movflags", "+faststart",
                    str(out_abs),
                ])
            except RuntimeError as e:
                # Thuong do thieu libass: fallback chi xuat SRT roi, khong fail job
                if "subtitles" in str(e).lower() or "libass" in str(e).lower():
                    warning = (
                        "Cảnh báo: không nhúng được phụ đề vào video (thiếu libass). "
                        "Phụ đề đã xuất file SRT rời."
                    )
                    shutil.copyfile(mixed, out_abs)
                else:
                    raise
        else:
            shutil.copyfile(mixed, out_abs)
        progress_cb(90)

        # --- 5. Validate + thumbnail + finalize ---
        if not out_abs.is_file() or out_abs.stat().st_size == 0:
            raise RuntimeError("Render thất bại: không tạo được file MP4 đầu ra")
        out_info = probe(out_abs)
        if out_info.get("duration", 0) <= 0:
            raise RuntimeError("Render thất bại: file MP4 đầu ra không có duration hợp lệ")

        thumb_rel = f"exports/project_{project.id}/render_{job.id}_thumb.jpg"
        thumb_abs = storage.abs_path(thumb_rel)
        try:
            run([
                "ffmpeg", "-y",
                "-ss", f"{max(0.0, out_info['duration'] / 2):.2f}",
                "-i", str(out_abs),
                "-frames:v", "1", "-q:v", "4",
                str(thumb_abs),
            ])
            project.thumbnail_path = thumb_rel
        except RuntimeError:
            pass  # thumbnail la optional

        job.output_path = out_rel
        job.srt_path = srt_rel
        job.status = "succeeded"
        job.progress = 100
        job.error = warning
        project.status = "completed"
        db.commit()
        progress_cb(100)
    finally:
        # Don file tam sau khi render xong
        shutil.rmtree(workdir, ignore_errors=True)
