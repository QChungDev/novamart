"use client";
import { useEffect, useState } from "react";
import { Character, charactersApi, mediaUrl, voicesApi, VoiceProfile } from "@/lib/api";
import { Btn, Card, Empty, Input, Label, Select, Spinner } from "@/components/ui";

export default function VoicesPage() {
  const [profiles, setProfiles] = useState<VoiceProfile[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [ttsVoices, setTtsVoices] = useState<{ voice_id: string; name: string; gender: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [previewing, setPreviewing] = useState<number | null>(null);

  const [form, setForm] = useState({
    name: "", character_id: "", gender: "female", accent: "Bắc",
    tone: "vui vẻ", provider_voice_id: "", rate: 1.0, pitch: 1.0,
  });

  const load = () => {
    setLoading(true);
    Promise.all([voicesApi.list(), charactersApi.list(), voicesApi.ttsVoices().catch(() => [])])
      .then(([p, c, t]) => { setProfiles(p); setCharacters(c); setTtsVoices(t); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const save = async () => {
    if (!form.name.trim() || !form.provider_voice_id) {
      setError("Nhập tên hồ sơ và chọn giọng TTS.");
      return;
    }
    try {
      await voicesApi.create({
        name: form.name.trim(),
        character_id: form.character_id ? parseInt(form.character_id, 10) : null,
        gender: form.gender, language: "vi-VN", accent: form.accent, tone: form.tone,
        provider: "edge_tts", provider_voice_id: form.provider_voice_id,
        rate: form.rate, pitch: form.pitch,
      });
      setShowForm(false);
      setForm({ name: "", character_id: "", gender: "female", accent: "Bắc", tone: "vui vẻ", provider_voice_id: "", rate: 1.0, pitch: 1.0 });
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Lưu thất bại");
    }
  };

  const preview = async (p: VoiceProfile) => {
    setPreviewing(p.id);
    try {
      const r = await voicesApi.preview({
        provider_voice_id: p.provider_voice_id,
        text: "Xin chào! Tôi là giọng đọc thử cho nhân vật của bạn.",
      });
      new Audio(mediaUrl(r.audio_url)).play().catch(() => {});
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Nghe thử thất bại");
    } finally {
      setPreviewing(null);
    }
  };

  const remove = async (p: VoiceProfile) => {
    if (!confirm(`Xóa hồ sơ giọng "${p.name}"?`)) return;
    try { await voicesApi.remove(p.id); load(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Xóa thất bại"); }
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Voice Studio</h1>
          <p className="text-sm text-[#9a9ab0]">Giọng nói nhất quán cho từng nhân vật (miễn phí qua Edge TTS)</p>
        </div>
        <Btn onClick={() => setShowForm(!showForm)}>+ Hồ sơ giọng mới</Btn>
      </div>
      {error && <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

      {showForm && (
        <Card>
          <h2 className="mb-4 font-semibold">Tạo hồ sơ giọng nói</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div><Label>Tên hồ sơ *</Label><Input value={form.name} onChange={set("name")} placeholder="Giọng Mèo Mốc" /></div>
            <div><Label>Nhân vật</Label>
              <Select value={form.character_id} onChange={set("character_id")}>
                <option value="">— Chưa gán —</option>
                {characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
            <div><Label>Giọng TTS *</Label>
              <Select value={form.provider_voice_id} onChange={set("provider_voice_id")}>
                <option value="">— Chọn giọng —</option>
                {ttsVoices.map((v) => <option key={v.voice_id} value={v.voice_id}>{v.name} ({v.gender})</option>)}
              </Select>
              {ttsVoices.length === 0 && <p className="mt-1 text-xs text-[#9a9ab0]">Không tải được danh sách — vẫn có thể nhập Voice ID thủ công ở API Settings.</p>}
            </div>
            <div><Label>Giới tính</Label>
              <Select value={form.gender} onChange={set("gender")}>
                <option value="female">Nữ</option><option value="male">Nam</option><option value="other">Khác</option>
              </Select>
            </div>
            <div><Label>Giọng vùng miền</Label>
              <Select value={form.accent} onChange={set("accent")}>
                <option>Bắc</option><option>Nam</option><option>Trung</option>
              </Select>
            </div>
            <div><Label>Sắc thái</Label>
              <Select value={form.tone} onChange={set("tone")}>
                {["vui vẻ", "hài hước", "buồn", "nghiêm túc", "tức giận", "dễ thương", "bình tĩnh"].map((t) => <option key={t}>{t}</option>)}
              </Select>
            </div>
            <div><Label>Tốc độ ({form.rate.toFixed(2)}x)</Label>
              <input type="range" min={0.7} max={1.4} step={0.05} value={form.rate} onChange={(e) => setForm({ ...form, rate: parseFloat(e.target.value) })} className="w-full" />
            </div>
            <div><Label>Cao độ ({form.pitch.toFixed(2)}x)</Label>
              <input type="range" min={0.7} max={1.3} step={0.05} value={form.pitch} onChange={(e) => setForm({ ...form, pitch: parseFloat(e.target.value) })} className="w-full" />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Btn onClick={save}>Lưu hồ sơ giọng</Btn>
            <Btn variant="ghost" onClick={() => setShowForm(false)}>Hủy</Btn>
          </div>
        </Card>
      )}

      {loading ? <Spinner /> : profiles.length === 0 ? (
        <Empty title="Chưa có hồ sơ giọng nào" hint="Tạo hồ sơ giọng đầu tiên, gán cho nhân vật để dùng chung mọi cảnh." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {profiles.map((p) => (
            <Card key={p.id} className="p-4">
              <p className="font-semibold">🎙️ {p.name}</p>
              <p className="mb-2 text-xs text-[#9a9ab0]">
                {p.character_name || "Chưa gán nhân vật"} · {p.gender === "male" ? "Nam" : p.gender === "female" ? "Nữ" : "Khác"} · Giọng {p.accent} · {p.tone}
              </p>
              <p className="mb-3 font-mono text-xs text-cyan-300">{p.provider_voice_id}</p>
              <div className="flex gap-2">
                <Btn variant="outline" className="px-3 py-1 text-xs" onClick={() => preview(p)} disabled={previewing === p.id}>
                  {previewing === p.id ? "Đang tạo..." : "▶ Nghe thử"}
                </Btn>
                <Btn variant="danger" className="px-3 py-1 text-xs" onClick={() => remove(p)}>Xóa</Btn>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
