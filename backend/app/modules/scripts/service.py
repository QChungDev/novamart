"""Sinh kich ban tieng Viet bang thuat toan rule-based (offline, khong can LLM key).

Toc do thoai: 13 ky tu/giay (lay tron an toan cho tieng Viet).
Cau truc 3 hoi: Mo dau / Dien bien / Ket thuc.
Chia canh: moi canh toi da max_scene_sec (mac dinh 20s — theo gioi han
Seedance 2.5 la 30s/clip, chia 15-30s de giam so lan goi, nhan vat nhat quan
hon, chi phi thap hon), TUYET DOI khong cat ngang mot luot thoai giua cau.
"""
from __future__ import annotations

import math
import re

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.storage import get_storage
from app.database.models import Character, GenerationJob, Project, Scene, SceneCharacter, Script

CHARS_PER_SEC = 13.0
ACTION_SEC_PER_SCENE = 2.0
NEGATIVE_PROMPT = (
    "blurry, distorted faces, deformed hands, extra limbs, watermark, text overlay, "
    "subtitles, low quality, inconsistent character design, scary, horror"
)

VI_STOPWORDS = {
    "và", "với", "của", "là", "một", "cái", "những", "các", "cho", "để", "trong",
    "ngoài", "trên", "dưới", "khi", "thì", "mà", "nhưng", "vì", "bị", "được",
    "quá", "rất", "lắm", "ăn", "uống", "có", "không", "này", "kia", "đó", "đây",
    "tớ", "cậu", "mình", "bạn", "anh", "em", "chị", "tôi", "nó", "họ", "chúng",
    "sẽ", "đã", "đang", "hãy", "đi", "lại", "cũng", "thật", "như", "vậy", "thế",
    "gì", "sao", "nào", "ai", "đâu", "mấy", "mỗi", "từng", "rất", "hơi", "cực",
}

# ---------- Template hoi thoai (speaker: c0/c1/... hoac "narr") ----------

_ACT1 = [
    ("c0", "Hôm nay trời đẹp quá! Chắc chắn sẽ có chuyện vui!"),
    ("c1", "Ngày nào cậu cũng nói thế... Mà kệ, đi chơi thôi!"),
    ("c0", "Nghe nói có vụ {k} đó! Tò mò quá đi!"),
    ("c1", "Lại nữa hả? Thôi được, nhưng đừng gây rắc rối nhé!"),
]

_ACT2 = [
    ("c1", "Khoan! Mùi {k} này là sao hả {a}?!"),
    ("c0", "À... tớ chỉ nếm thử một miếng xíu xiu thôi!"),
    ("c1", "Một miếng? Nhìn cái đĩa trống trơn kia kìa!"),
    ("c0", "Tại ngon quá, tớ không dừng lại được..."),
    ("c1", "Không tha đâu! Phải dạy cậu một bài học!"),
    ("c0", "Đừng mà! Tớ hứa từ mai sẽ ăn kiêng!"),
    ("c1", "Hứa suông! Lần nào cậu cũng nói vậy!"),
    ("c0", "Nhìn mặt tớ đáng yêu thế này, nỡ giận sao?"),
    ("c1", "Hừm... cũng hơi khó giận thật đấy!"),
    ("c0", "He he! Bạn thân là phải tha thứ chứ!"),
]

_ACT3 = [
    ("c1", "Tha lần này! Nhưng phải đền bù cho tớ!"),
    ("c0", "Yên tâm! Tớ làm mẻ {k} mới đãi cậu!"),
    ("narr", "Cả hai lại vui vẻ. Nhớ nhé: đồ ngon phải chia sẻ!"),
]

_BANTER = [
    ("c1", "Này {a}, cậu nghe thấy gì lạ không?"),
    ("c0", "Đâu? Chỉ nghe bụng tớ réo thôi!"),
    ("c1", "Lúc nào cũng nghĩ đến ăn!"),
    ("c0", "Ăn là niềm vui lớn nhất đời mà!"),
    ("c1", "Tập trung vào chuyện chính đi!"),
    ("c0", "Rõ rồi! Tớ nghiêm túc đây!"),
]

_ACT_LABEL = {"mo_dau": "Mở đầu", "dien_bien": "Diễn biến", "ket_thuc": "Kết thúc"}

_LOCATIONS = {
    "mo_dau": ["Công viên buổi sáng trong lành", "Con đường làng rợp bóng cây"],
    "dien_bien": ["Căn bếp ấm cúng", "Sân nhà đầy nắng"],
    "ket_thuc": ["Sân vườn lúc hoàng hôn", "Hiên nhà mát mẻ buổi chiều"],
}

_CAMERAS_VI = [
    "Góc máy ngang tầm mắt, lia máy chậm từ trái sang phải.",
    "Cận cảnh khuôn mặt nhân vật, máy hơi đẩy tới.",
    "Toàn cảnh rộng, máy quay tĩnh rồi từ từ zoom vào.",
    "Góc máy thấp hất lên, tạo cảm giác hài hước.",
    "Máy quay vòng quanh nhân vật, chuyển động mượt mà.",
]
_CAMERAS_EN = [
    "Eye-level shot, slow pan from left to right",
    "Close-up on the character's face, slight push-in",
    "Wide establishing shot, static then slow zoom in",
    "Low-angle shot looking up, comedic feel",
    "Smooth orbit around the character",
]

_EXPRESSIONS = [
    "hào hứng", "ngạc nhiên", "xấu hổ gãi đầu", "nũng nịu",
    "tức giận đáng yêu", "cười tít mắt", "tò mò", "hối lỗi",
]

_AMBIENT = {
    "mo_dau": "Tiếng chim hót buổi sáng, gió nhẹ xào xạc",
    "dien_bien": "Tiếng bát đĩa lách cách, nhạc nền vui nhộn",
    "ket_thuc": "Nhạc nền ấm áp, tiếng cười vui vẻ",
}

_ACTIONS_VI = [
    "{a} bước tới gần {b}, mắt sáng lên đầy tò mò.",
    "{b} khoanh tay, nhíu mày nhìn {a} đầy nghi ngờ.",
    "{a} gãi đầu cười trừ, vẻ mặt xấu hổ.",
    "{b} chỉ tay về phía {a}, giọng nghiêm nghị nhưng đáng yêu.",
    "{a} chắp tay nài nỉ, mắt long lanh.",
    "Cả hai cùng bật cười, không khí vui vẻ trở lại.",
]
_ACTIONS_EN = [
    "{a} walks up to {b}, eyes sparkling with curiosity.",
    "{b} crosses arms, frowning at {a} with suspicion.",
    "{a} scratches head and grins sheepishly.",
    "{b} points at {a}, speaking sternly but adorably.",
    "{a} clasps hands together pleadingly, eyes shining.",
    "Both burst into laughter, the mood turns cheerful again.",
]


def _extract_keywords(idea: str, limit: int = 3) -> list[str]:
    tokens = re.findall(r"[A-Za-zÀ-ỹ0-9]+", idea)
    seen: list[str] = []
    for tok in tokens:
        low = tok.lower()
        if len(tok) >= 3 and low not in VI_STOPWORDS and low not in seen:
            seen.append(tok)
        if len(seen) >= limit:
            break
    return seen


def _fill(template: str, names: list[str], keyword: str) -> str:
    a = names[0] if names else "bạn ấy"
    b = names[1] if len(names) > 1 else a
    return template.replace("{a}", a).replace("{b}", b).replace("{k}", keyword)


def _build_turns(names: list[str], keyword: str, target_duration_sec: int) -> list[dict]:
    """Sinh danh sach luot thoai theo dung thu tu cau chuyen, vua voi ngan sach
    ky tu cua target_duration_sec. Bao dam luon co mo dau va ket thuc."""
    n_chars = len(names)

    def expand(pool: list[tuple[str, str]], act: str) -> list[dict]:
        out = []
        for spk, tpl in pool:
            if spk == "narr":
                out.append({"speaker": "narr", "text": _fill(tpl, names, keyword), "act": act})
            else:
                idx = int(spk[1:]) % max(n_chars, 1)
                out.append({"speaker": f"c{idx}", "text": _fill(tpl, names, keyword), "act": act})
        return out

    act1 = expand(_ACT1, "mo_dau")
    act2 = expand(_ACT2, "dien_bien")
    act3 = expand(_ACT3, "ket_thuc")
    ending = act3[-1]  # luot dan chuyen ket thuc
    middle = act1 + act2 + act3[:-1]

    n_scenes_est = max(1, round(target_duration_sec / 20))
    # Tru overhead: 2s hanh dong + ~0.5s lam tron moi canh
    overhead = n_scenes_est * (ACTION_SEC_PER_SCENE + 0.5)
    budget = max(3 * 40, (target_duration_sec - overhead) * CHARS_PER_SEC)

    turns: list[dict] = []
    used = 0
    for t in middle:
        if used + len(t["text"]) > budget and len(turns) >= 3:
            break
        turns.append(t)
        used += len(t["text"])
    # Dam bao luon co ket thuc
    if not any(t["speaker"] == "narr" for t in turns):
        turns.append(ending)
        used += len(ending["text"])
    # Them thoai phu neu qua ngan (chen truoc luot ket thuc)
    banter_i = 0
    guard = 0
    while used < budget * 0.9 and guard < 30:
        spk, tpl = _BANTER[banter_i % len(_BANTER)]
        idx = int(spk[1:]) % max(n_chars, 1)
        t = {"speaker": f"c{idx}", "text": _fill(tpl, names, keyword), "act": "dien_bien"}
        insert_at = next((i for i, x in enumerate(turns) if x["speaker"] == "narr"), len(turns))
        turns.insert(insert_at, t)
        used += len(t["text"])
        banter_i += 1
        guard += 1
    return turns


def _pack_into_scenes(turns: list[dict], max_scene_sec: float) -> list[list[dict]]:
    """Gom luot thoai thanh canh, khong bao gio cat ngang mot luot thoai."""
    scenes: list[list[dict]] = []
    cur: list[dict] = []
    cur_chars = 0
    for t in turns:
        t_chars = len(t["text"])
        if cur and (cur_chars + t_chars) / CHARS_PER_SEC + ACTION_SEC_PER_SCENE > max_scene_sec:
            scenes.append(cur)
            cur = []
            cur_chars = 0
        cur.append(t)
        cur_chars += t_chars
    if cur:
        scenes.append(cur)
    return scenes


def _primary_image_path(char: Character) -> str:
    if not char.images:
        return ""
    for img in char.images:
        if img.is_primary:
            return img.file_path or ""
    return char.images[0].file_path or ""


def _build_video_prompt(characters: list[Character], location: str, action_en: str,
                        camera_en: str, names: list[str]) -> str:
    art = characters[0].art_style.strip() if characters and characters[0].art_style else "Cute 3D cartoon animation style"
    char_bits = []
    for c in characters:
        desc = c.appearance.strip() or c.description.strip()
        char_bits.append(f"{c.name} ({desc})" if desc else c.name)
    lock_bits = ["Do not change fur color, face shape, body proportions, or eye color"]
    for c in characters:
        if isinstance(c.lock_rules, dict):
            for k, v in c.lock_rules.items():
                if v:
                    lock_bits.append(f"{k}: {v}")
    parts = [
        art,
        "Characters: " + "; ".join(char_bits) if char_bits else "",
        f"Scene: {location} - {action_en}",
        f"Camera: {camera_en}",
        "Cinematic lighting, vibrant colors, smooth motion, vertical 9:16 composition",
        "Strict character consistency. " + ". ".join(lock_bits),
    ]
    return ". ".join(p for p in parts if p) + "."


def serialize_scene(scene: Scene) -> dict:
    storage = get_storage()
    chars = []
    for sc in scene.characters:
        c = sc.character
        if c:
            chars.append({"id": c.id, "name": c.name, "character_code": c.character_code})
    video_url = storage.url_for(scene.output_video_path) if scene.output_video_path else None
    return {
        "id": scene.id,
        "project_id": scene.project_id,
        "script_id": scene.script_id,
        "scene_code": scene.scene_code,
        "name": scene.name,
        "sort_order": scene.sort_order,
        "target_duration_sec": scene.target_duration_sec,
        "location": scene.location,
        "action": scene.action,
        "expression": scene.expression,
        "camera": scene.camera,
        "dialogue": scene.dialogue or [],
        "ambient_audio": scene.ambient_audio,
        "video_prompt": scene.video_prompt,
        "negative_prompt": scene.negative_prompt,
        "reference_image_paths": scene.reference_image_paths or [],
        "status": scene.status,
        "output_video_path": scene.output_video_path,
        "video_url": video_url,
        "error": scene.error,
        "characters": chars,
        "created_at": scene.created_at,
    }


def generate_script(db: Session, project_id: int, idea: str, character_ids: list[int],
                    style: str | None, audience: str | None,
                    target_duration_sec: int, dialogue_language: str = "vi",
                    max_scene_sec: float | None = None) -> Script:
    idea = (idea or "").strip()
    if len(idea) < 10:
        raise ValueError("Ý tưởng quá ngắn, vui lòng mô tả chi tiết hơn (tối thiểu 10 ký tự).")
    if not character_ids:
        raise ValueError("Vui lòng chọn ít nhất một nhân vật cho kịch bản.")
    if target_duration_sec < 5 or target_duration_sec > 600:
        raise ValueError("Thời lượng mục tiêu phải từ 5 đến 600 giây.")

    project = db.get(Project, project_id)
    if not project:
        raise ValueError(f"Không tìm thấy dự án (id={project_id}).")

    characters: list[Character] = (
        db.query(Character).filter(Character.id.in_(character_ids)).all()
    )
    if len(characters) != len(set(character_ids)):
        raise ValueError("Có nhân vật không tồn tại trong danh sách đã chọn.")
    # giu dung thu tu character_ids nguoi dung chon
    order = {cid: i for i, cid in enumerate(character_ids)}
    characters.sort(key=lambda c: order[c.id])
    names = [c.name for c in characters]

    if max_scene_sec is None:
        # Gioi han theo provider video dang dung (Seedance 2.5: toi da 30s/clip),
        # mac dinh an toan 20s neu khong xac dinh duoc.
        max_scene_sec = float(min(30, settings.DEFAULT_SCENE_SECONDS or 20))

    keywords = _extract_keywords(idea)
    keyword = keywords[0] if keywords else "chuyện này"

    turns = _build_turns(names, keyword, target_duration_sec)
    packed = _pack_into_scenes(turns, max_scene_sec)
    if not packed:
        raise ValueError("Không thể chia cảnh từ ý tưởng này, vui lòng thử ý tưởng khác.")

    # Dieu chinh so canh cho khop target: dem them thoi gian hanh dong neu tong qua ngan
    total_sec = sum(sum(len(t["text"]) for t in sc) / CHARS_PER_SEC + ACTION_SEC_PER_SCENE for sc in packed)
    extra_per_scene = 0
    if total_sec < target_duration_sec * 0.85 and packed:
        extra_per_scene = min(3, int((target_duration_sec * 0.9 - total_sec) / len(packed)))

    # Xoa kich ban cu (tinh nang tao lai). Bulk delete khong cascade ORM
    # nen xoa SceneCharacter / GenerationJob lien quan truoc.
    old_scene_ids = [r[0] for r in db.query(Scene.id).filter(Scene.project_id == project_id).all()]
    if old_scene_ids:
        db.query(SceneCharacter).filter(SceneCharacter.scene_id.in_(old_scene_ids)).delete(synchronize_session=False)
        db.query(GenerationJob).filter(GenerationJob.scene_id.in_(old_scene_ids)).delete(synchronize_session=False)
        db.query(Scene).filter(Scene.id.in_(old_scene_ids)).delete(synchronize_session=False)
    db.query(Script).filter(Script.project_id == project_id).delete(synchronize_session=False)
    db.flush()

    story_lines = [f"Ý tưởng: {idea}", ""]
    for act_key in ("mo_dau", "dien_bien", "ket_thuc"):
        story_lines.append(f"{_ACT_LABEL[act_key]}:")
        for t in turns:
            if t["act"] == act_key:
                who = names[int(t["speaker"][1:])] if t["speaker"] != "narr" else "Người dẫn chuyện"
                story_lines.append(f"- {who}: {t['text']}")
        story_lines.append("")

    script = Script(
        project_id=project_id,
        idea=idea,
        story_text="\n".join(story_lines).strip(),
        style=style or "",
        audience=audience or "",
        target_duration_sec=target_duration_sec,
        dialogue_language=dialogue_language,
        status="draft",
    )
    db.add(script)
    db.flush()

    act_counters = {"mo_dau": 0, "dien_bien": 0, "ket_thuc": 0}
    scene_objs: list[Scene] = []
    for idx, group in enumerate(packed, start=1):
        act = group[0]["act"]
        act_counters[act] += 1
        loc_pool = _LOCATIONS[act]
        location = loc_pool[(act_counters[act] - 1) % len(loc_pool)]
        cam_i = (idx - 1) % len(_CAMERAS_VI)
        act_i = (idx - 1) % len(_ACTIONS_VI)
        action_vi = _fill(_ACTIONS_VI[act_i], names, keyword)
        action_en = _fill(_ACTIONS_EN[act_i], names, keyword).replace("'", "")
        expression = _EXPRESSIONS[(idx - 1) % len(_EXPRESSIONS)]

        dialogue = []
        for t in group:
            if t["speaker"] == "narr":
                dialogue.append({
                    "character_id": None,
                    "character_name": "Người dẫn chuyện",
                    "text": t["text"],
                    "voice_profile_id": None,
                })
            else:
                c = characters[int(t["speaker"][1:]) % len(characters)]
                dialogue.append({
                    "character_id": c.id,
                    "character_name": c.name,
                    "text": t["text"],
                    "voice_profile_id": c.default_voice_profile_id,
                })

        present_ids = {d["character_id"] for d in dialogue if d["character_id"]}
        ref_chars = [c for c in characters if c.id in present_ids] or characters
        ref_paths = [p for p in (_primary_image_path(c) for c in ref_chars) if p]

        dlg_sec = sum(len(t["text"]) for t in group) / CHARS_PER_SEC
        dur = int(math.ceil(dlg_sec + ACTION_SEC_PER_SCENE + extra_per_scene))

        scene = Scene(
            project_id=project_id,
            script_id=script.id,
            scene_code=f"SCENE_{idx:02d}",
            name=f"{_ACT_LABEL[act]} {act_counters[act]}",
            sort_order=idx - 1,
            target_duration_sec=dur,
            location=location,
            action=action_vi,
            expression=expression,
            camera=_CAMERAS_VI[cam_i],
            dialogue=dialogue,
            ambient_audio=_AMBIENT[act],
            video_prompt=_build_video_prompt(
                ref_chars,
                location, action_en, _CAMERAS_EN[cam_i], names,
            ),
            negative_prompt=NEGATIVE_PROMPT,
            reference_image_paths=ref_paths,
            status="draft",
        )
        db.add(scene)
        db.flush()
        for cid in present_ids:
            db.add(SceneCharacter(scene_id=scene.id, character_id=cid))
        scene_objs.append(scene)

    project.status = "ready_to_edit"
    project.target_duration_sec = target_duration_sec
    db.commit()
    db.refresh(script)
    for s in scene_objs:
        db.refresh(s)
    return script


def get_project_script(db: Session, project_id: int) -> tuple[Script | None, list[Scene]]:
    project = db.get(Project, project_id)
    if not project:
        raise ValueError(f"Không tìm thấy dự án (id={project_id}).")
    script = db.query(Script).filter(Script.project_id == project_id).first()
    scenes = (
        db.query(Scene).filter(Scene.project_id == project_id)
        .order_by(Scene.sort_order).all()
    )
    return script, scenes


def reorder_scenes(db: Session, project_id: int, ordered_ids: list[int]) -> list[Scene]:
    scenes = db.query(Scene).filter(Scene.project_id == project_id).all()
    by_id = {s.id: s for s in scenes}
    if set(ordered_ids) != set(by_id.keys()):
        raise ValueError("Danh sách ID không khớp với các cảnh của dự án.")
    for i, sid in enumerate(ordered_ids):
        by_id[sid].sort_order = i
    db.commit()
    return db.query(Scene).filter(Scene.project_id == project_id).order_by(Scene.sort_order).all()


def delete_scene(db: Session, scene_id: int) -> None:
    scene = db.get(Scene, scene_id)
    if not scene:
        raise ValueError(f"Không tìm thấy cảnh (id={scene_id}).")
    db.delete(scene)
    db.commit()
