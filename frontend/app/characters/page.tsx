"use client";
import { useEffect, useState } from "react";
import { Character, charactersApi, mediaUrl, voicesApi, VoiceProfile } from "@/lib/api";
import { Btn, Card, Empty, Input, Label, Spinner, TextArea } from "@/components/ui";

const EMPTY_FORM = {
  name: "", description: "", appearance: "", colors: "",
  outfit: "", accessories: "", body_ratio: "", art_style: "",
};

export default function CharactersPage() {
  const [list, setList] = useState<Character[]>([]);
  const [voices, setVoices] = useState<VoiceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [lockPrompt, setLockPrompt] = useState<{ id: number; prompt: string } | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([charactersApi.list(), voicesApi.list()])
      .then(([c, v]) => { setList(c); setVoices(v); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const save = async () => {
    if (!form.name.trim() || files.length === 0) {
      setError("Nhập tên nhân vật và tải lên ít nhất 1 ảnh tham chiếu.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      files.forEach((f) => fd.append("images", f));
      await charactersApi.create(fd);
      setShowForm(false); setForm(EMPTY_FORM); setFiles([]);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  };

  const assignVoice = async (charId: number, voiceId: string) => {
    if (!voiceId) return;
    try {
      await voicesApi.assign(charId, parseInt(voiceId, 10));
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Gán giọng thất bại");
    }
  };

  const remove = async (c: Character) => {
    if (!confirm(`Xóa nhân vật "${c.name}"?`)) return;
    try { await charactersApi.remove(c.id); load(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Xóa thất bại"); }
  };

  const showLock = async (c: Character) => {
    try {
      const r = await charactersApi.lockPrompt(c.id);
      setLockPrompt({ id: c.id, prompt: r.prompt });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Không lấy được prompt");
    }
  };

  const set = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Character Studio</h1>
          <p className="text-sm text-[#9a9ab0]">Hồ sơ nhân vật nhất quán cho mọi cảnh và mọi tập</p>
        </div>
        <Btn onClick={() => setShowForm(!showForm)}>+ Nhân vật mới</Btn>
      </div>
      {error && <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

      {showForm && (
        <Card>
          <h2 className="mb-4 font-semibold">Tạo hồ sơ nhân vật</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div><Label>Tên nhân vật *</Label><Input value={form.name} onChange={set("name")} placeholder="Mèo Mốc" /></div>
            <div><Label>Ảnh tham chiếu * (ảnh đầu = ảnh chính)</Label>
              <input type="file" accept="image/*" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))}
                className="w-full text-sm text-[#9a9ab0] file:mr-3 file:rounded-lg file:border-0 file:bg-violet-600 file:px-3 file:py-1.5 file:text-white" />
              {files.length > 0 && <p className="mt-1 text-xs text-emerald-300">Đã chọn {files.length} ảnh</p>}
            </div>
            <div className="md:col-span-2"><Label>Mô tả tính cách</Label><TextArea rows={2} value={form.description} onChange={set("description")} placeholder="Hài hước, hơi lười, mê bánh ngọt..." /></div>
            <div className="md:col-span-2"><Label>Ngoại hình chi tiết *</Label><TextArea rows={2} value={form.appearance} onChange={set("appearance")} placeholder="Mèo mướp cam mũm mĩm, bụng màu kem, mắt lim dim..." /></div>
            <div><Label>Màu sắc</Label><Input value={form.colors} onChange={set("colors")} placeholder="Lông cam, bụng kem" /></div>
            <div><Label>Trang phục</Label><Input value={form.outfit} onChange={set("outfit")} placeholder="Yếm jean xanh" /></div>
            <div><Label>Phụ kiện</Label><Input value={form.accessories} onChange={set("accessories")} placeholder="Nơ đỏ" /></div>
            <div><Label>Tỷ lệ cơ thể</Label><Input value={form.body_ratio} onChange={set("body_ratio")} placeholder="Đầu to, thân tròn (chibi)" /></div>
            <div className="md:col-span-2"><Label>Phong cách đồ họa</Label><Input value={form.art_style} onChange={set("art_style")} placeholder="Hoạt hình 3D đáng yêu, ánh sáng điện ảnh" /></div>
          </div>
          <div className="mt-4 flex gap-2">
            <Btn onClick={save} disabled={saving}>{saving ? "Đang lưu..." : "Lưu nhân vật"}</Btn>
            <Btn variant="ghost" onClick={() => setShowForm(false)}>Hủy</Btn>
          </div>
        </Card>
      )}

      {loading ? <Spinner /> : list.length === 0 ? (
        <Empty title="Chưa có nhân vật nào" hint="Tạo hồ sơ nhân vật đầu tiên để giữ ngoại hình nhất quán giữa các cảnh." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => (
            <Card key={c.id} className="p-4">
              <div className="mb-3 flex gap-3">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-black/40">
                  {c.primary_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mediaUrl(c.primary_image_url)} alt={c.name} className="h-full w-full object-cover" />
                  ) : <div className="flex h-full items-center justify-center text-2xl">🦊</div>}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold">{c.name}</p>
                  <p className="font-mono text-xs text-cyan-300">{c.character_code}</p>
                  <p className="truncate text-xs text-[#9a9ab0]">{c.image_count} ảnh · 🎙️ {c.voice_name || "chưa gán giọng"}</p>
                </div>
              </div>
              <p className="mb-3 line-clamp-2 text-sm text-[#9a9ab0]">{c.appearance}</p>
              <div className="mb-3">
                <Label>Gán giọng nói</Label>
                <select
                  className="w-full rounded-xl border border-[#26263a] bg-[#0b0b12] px-2 py-1.5 text-sm outline-none"
                  value={c.default_voice_profile_id || ""}
                  onChange={(e) => assignVoice(c.id, e.target.value)}
                >
                  <option value="">— Chọn giọng —</option>
                  {voices.map((v) => <option key={v.id} value={v.id}>{v.name} ({v.tone || v.gender})</option>)}
                </select>
              </div>
              <div className="flex flex-wrap gap-2">
                <Btn variant="outline" className="px-3 py-1 text-xs" onClick={() => showLock(c)}>Xem Lock Prompt</Btn>
                <Btn variant="danger" className="px-3 py-1 text-xs" onClick={() => remove(c)}>Xóa</Btn>
              </div>
              {lockPrompt?.id === c.id && (
                <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-black/40 p-3 text-xs text-[#9a9ab0]">{lockPrompt.prompt}</pre>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
