"use client";
import { useEffect, useState } from "react";
import { Provider, videoApi } from "@/lib/api";
import { Btn, Card, Empty, Input, Label, Select, Spinner } from "@/components/ui";

const ADAPTERS = [
  { id: "manual", label: "Manual Mode (không cần API)" },
  { id: "byteplus_seedance", label: "BytePlus Seedance (API chính thức)" },
  { id: "generic", label: "Provider tương thích (tùy chỉnh URL)" },
];

export default function SettingsPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [testing, setTesting] = useState<number | null>(null);
  const [testMsg, setTestMsg] = useState<{ id: number; ok: boolean; message: string } | null>(null);
  const [form, setForm] = useState({ name: "", adapter: "manual", base_url: "", api_key: "", model: "dreamina-seedance-2-5-260628" });

  const load = () => {
    setLoading(true);
    videoApi.providers().then(setProviders).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const save = async () => {
    if (!form.name.trim()) { setError("Nhập tên provider."); return; }
    try {
      await videoApi.createProvider({
        provider_type: "video", name: form.name.trim(), adapter: form.adapter,
        base_url: form.base_url.trim(), api_key: form.api_key.trim(), model: form.model.trim(),
      });
      setShowForm(false);
      setForm({ name: "", adapter: "manual", base_url: "", api_key: "", model: "dreamina-seedance-2-5-260628" });
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Lưu thất bại");
    }
  };

  const test = async (p: Provider) => {
    setTesting(p.id);
    setTestMsg(null);
    try {
      const r = await videoApi.testProvider(p.id);
      setTestMsg({ id: p.id, ok: r.ok, message: r.message });
      if (r.capabilities) load();
    } catch (e: unknown) {
      setTestMsg({ id: p.id, ok: false, message: e instanceof Error ? e.message : "Lỗi" });
    } finally {
      setTesting(null);
    }
  };

  const remove = async (p: Provider) => {
    if (!confirm(`Xóa provider "${p.name}"?`)) return;
    try { await videoApi.deleteProvider(p.id); load(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Xóa thất bại"); }
  };

  const toggle = async (p: Provider) => {
    try { await videoApi.updateProvider(p.id, { is_active: !p.is_active }); load(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Cập nhật thất bại"); }
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">API Settings</h1>
          <p className="text-sm text-[#9a9ab0]">Cấu hình dịch vụ tạo video — khóa API chỉ lưu ở backend, không hiển thị lại</p>
        </div>
        <Btn onClick={() => setShowForm(!showForm)}>+ Thêm provider</Btn>
      </div>
      {error && <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

      <Card>
        <h2 className="mb-2 font-semibold">📌 Cách hoạt động</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-[#9a9ab0]">
          <li><b className="text-white">Manual Mode</b>: luôn dùng được, không cần API key. Hệ thống xuất prompt từng cảnh — bạn tạo video trên app Muse AI rồi tải MP4 lên đúng cảnh.</li>
          <li><b className="text-white">BytePlus Seedance</b>: API chính thức của ByteDance (model Seedance — cùng công nghệ đứng sau Muse AI). Cần đăng ký tài khoản BytePlus và API key. Hỗ trợ ảnh tham chiếu giữ nhân vật nhất quán.</li>
          <li><b className="text-white">Provider tương thích</b>: dịch vụ bên thứ ba có API tương thích (tự điền URL submit/status).</li>
          <li>Giọng đọc dùng <b className="text-white">Edge TTS miễn phí</b>, không cần cấu hình thêm.</li>
        </ul>
      </Card>

      {showForm && (
        <Card>
          <h2 className="mb-4 font-semibold">Thêm video provider</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div><Label>Tên gợi nhớ *</Label><Input value={form.name} onChange={set("name")} placeholder="Seedance chính thức" /></div>
            <div><Label>Loại adapter</Label>
              <Select value={form.adapter} onChange={set("adapter")}>
                {ADAPTERS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
              </Select>
            </div>
            {form.adapter !== "manual" && (
              <>
                <div><Label>Base URL</Label><Input value={form.base_url} onChange={set("base_url")} placeholder="https://ark.ap-southeast.bytepluses.com/api/v3" /></div>
                <div><Label>Model</Label><Input value={form.model} onChange={set("model")} /></div>
                <div className="md:col-span-2"><Label>API key</Label><Input type="password" value={form.api_key} onChange={set("api_key")} placeholder="Nhập API key (được mã hóa khi lưu)" /></div>
              </>
            )}
          </div>
          <div className="mt-4 flex gap-2">
            <Btn onClick={save}>Lưu provider</Btn>
            <Btn variant="ghost" onClick={() => setShowForm(false)}>Hủy</Btn>
          </div>
        </Card>
      )}

      {loading ? <Spinner /> : providers.length === 0 ? (
        <Empty title="Chưa cấu hình provider nào" hint="Mặc định hệ thống dùng Manual Mode — bạn vẫn tạo video được bằng cách tải MP4 lên từng cảnh." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {providers.map((p) => (
            <Card key={p.id} className="p-4">
              <div className="mb-1 flex items-center justify-between">
                <p className="font-semibold">{p.name}</p>
                <span className={`rounded-full px-2 py-0.5 text-xs ${p.is_active ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-500/20 text-slate-400"}`}>
                  {p.is_active ? "Đang dùng" : "Tắt"}
                </span>
              </div>
              <p className="mb-2 text-xs text-[#9a9ab0]">Adapter: {p.adapter} · Model: {p.model || "—"} · Key: {p.api_key_set ? "đã lưu" : "chưa có"}</p>
              {p.capabilities && Object.keys(p.capabilities).length > 0 && (
                <p className="mb-2 text-xs text-cyan-300">
                  Hỗ trợ: {p.capabilities.reference_images ? "ảnh tham chiếu ✓" : ""} {p.capabilities.max_seconds ? `tối đa ${String(p.capabilities.max_seconds)}s` : ""}
                </p>
              )}
              {testMsg?.id === p.id && (
                <p className={`mb-2 text-xs ${testMsg.ok ? "text-emerald-300" : "text-red-300"}`}>{testMsg.message}</p>
              )}
              <div className="flex flex-wrap gap-2">
                <Btn variant="outline" className="px-3 py-1 text-xs" onClick={() => test(p)} disabled={testing === p.id}>
                  {testing === p.id ? "Đang kiểm tra..." : "🔌 Kiểm tra kết nối"}
                </Btn>
                <Btn variant="ghost" className="px-3 py-1 text-xs" onClick={() => toggle(p)}>{p.is_active ? "Tắt" : "Bật"}</Btn>
                <Btn variant="danger" className="px-3 py-1 text-xs" onClick={() => remove(p)}>Xóa</Btn>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
