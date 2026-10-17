"use client";
import { useEffect, useState } from "react";
import { mediaUrl, renderApi, Scene, scriptsApi, TimelineClip, videoApi } from "@/lib/api";
import { useProject } from "@/components/ProjectContext";
import { Btn, Card, Empty, Input, Label, Select, Spinner } from "@/components/ui";

export default function EditorPage() {
  const { project } = useProject();
  const [clips, setClips] = useState<TimelineClip[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const load = async (pid: number) => {
    setLoading(true);
    try {
      const [t, s] = await Promise.all([renderApi.timeline(pid), scriptsApi.getByProject(pid)]);
      if (t.clips.length > 0) {
        setClips(t.clips);
      } else {
        // Chưa có timeline: dựng từ scenes có video
        setClips(s.scenes.filter((x) => x.video_url).map((x, i) => ({
          id: 0, scene_id: x.id, scene_name: x.name, sort_order: i,
          trim_start_sec: 0, trim_end_sec: 0, transition: "cut",
          video_url: x.video_url, duration_sec: x.target_duration_sec,
        })));
      }
      setScenes(s.scenes);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Tải timeline thất bại");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (project) load(project.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]);

  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= clips.length) return;
    const next = [...clips];
    [next[idx], next[j]] = [next[j], next[idx]];
    next.forEach((c, i) => (c.sort_order = i));
    setClips(next);
  };

  const drop = (idx: number) => {
    if (dragIdx === null || dragIdx === idx) return;
    const next = [...clips];
    const [item] = next.splice(dragIdx, 1);
    next.splice(idx, 0, item);
    next.forEach((c, i) => (c.sort_order = i));
    setClips(next);
    setDragIdx(null);
  };

  const patch = (idx: number, p: Partial<TimelineClip>) => {
    const next = [...clips];
    next[idx] = { ...next[idx], ...p };
    setClips(next);
  };

  const removeClip = (idx: number) => {
    const next = clips.filter((_, i) => i !== idx);
    next.forEach((c, i) => (c.sort_order = i));
    setClips(next);
  };

  const addScene = (sceneId: number) => {
    const s = scenes.find((x) => x.id === sceneId);
    if (!s || !s.video_url) return;
    setClips([...clips, {
      id: 0, scene_id: s.id, scene_name: s.name, sort_order: clips.length,
      trim_start_sec: 0, trim_end_sec: 0, transition: "cut",
      video_url: s.video_url, duration_sec: s.target_duration_sec,
    }]);
  };

  const save = async () => {
    if (!project) return;
    setSaving(true);
    try {
      await renderApi.saveTimeline(project.id, clips.map((c) => ({
        scene_id: c.scene_id, sort_order: c.sort_order,
        trim_start_sec: c.trim_start_sec, trim_end_sec: c.trim_end_sec, transition: c.transition,
      })));
      setError("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Lưu timeline thất bại");
    } finally {
      setSaving(false);
    }
  };

  const regenerate = async (sceneId: number) => {
    if (!project) return;
    try {
      await videoApi.generate(project.id, [sceneId]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Tạo lại thất bại");
    }
  };

  if (!project) {
    return (
      <div className="animate-fade-up space-y-4">
        <h1 className="text-2xl font-bold">Video Editor</h1>
        <Empty title="Chưa chọn dự án" hint="Vào Dashboard chọn một dự án để biên tập." />
      </div>
    );
  }

  const totalSec = clips.reduce((s, c) => {
    const d = c.duration_sec || 10;
    const end = c.trim_end_sec > 0 ? Math.min(c.trim_end_sec, d) : d;
    return s + Math.max(0, end - c.trim_start_sec);
  }, 0);

  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Video Editor</h1>
          <p className="text-sm text-[#9a9ab0]">Dự án: <span className="font-semibold text-white">{project.name}</span> · {clips.length} clip · ~{Math.round(totalSec)}s</p>
        </div>
        <div className="flex gap-2">
          <Select onChange={(e) => { if (e.target.value) addScene(parseInt(e.target.value, 10)); e.target.value = ""; }} defaultValue="">
            <option value="">+ Thêm cảnh vào timeline</option>
            {scenes.filter((s) => s.video_url && !clips.some((c) => c.scene_id === s.id)).map((s) => (
              <option key={s.id} value={s.id}>{s.scene_code}: {s.name}</option>
            ))}
          </Select>
          <Btn onClick={save} disabled={saving}>{saving ? "Đang lưu..." : "💾 Lưu timeline"}</Btn>
        </div>
      </div>
      {error && <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

      {loading ? <Spinner /> : clips.length === 0 ? (
        <Empty title="Timeline trống" hint="Tạo video cho các cảnh ở Script & Storyboard trước, hoặc thêm cảnh đã có video vào đây." />
      ) : (
        <div className="space-y-3">
          {clips.map((c, i) => (
            <Card
              key={`${c.scene_id}-${i}`}
              className={`p-4 ${dragIdx === i ? "opacity-40" : ""}`}
            >
              <div
                draggable
                onDragStart={() => setDragIdx(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => drop(i)}
                className="cursor-grab"
                title="Kéo để đổi thứ tự"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600/30 font-mono text-sm font-bold text-violet-200">{i + 1}</span>
                  <p className="font-semibold">{c.scene_name}</p>
                  <span className="text-xs text-[#5a5a72]">⇅ kéo thả để sắp xếp</span>
                  <div className="ml-auto flex gap-1">
                    <Btn variant="ghost" className="px-2 py-1 text-xs" onClick={() => move(i, -1)}>↑</Btn>
                    <Btn variant="ghost" className="px-2 py-1 text-xs" onClick={() => move(i, 1)}>↓</Btn>
                    <Btn variant="danger" className="px-2 py-1 text-xs" onClick={() => removeClip(i)}>✕</Btn>
                  </div>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-[220px_1fr]">
                <div className="aspect-video overflow-hidden rounded-xl bg-black/50">
                  {c.video_url ? (
                    <video src={mediaUrl(c.video_url)} controls className="h-full w-full object-contain" preload="metadata" />
                  ) : <div className="flex h-full items-center justify-center text-[#5a5a72]">Không có video</div>}
                </div>
                <div className="grid content-start gap-3 sm:grid-cols-3">
                  <div><Label>Cắt đầu (giây)</Label>
                    <Input type="number" min={0} step={0.5} value={c.trim_start_sec} onChange={(e) => patch(i, { trim_start_sec: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div><Label>Cắt cuối (giây, 0 = giữ nguyên)</Label>
                    <Input type="number" min={0} step={0.5} value={c.trim_end_sec} onChange={(e) => patch(i, { trim_end_sec: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div><Label>Chuyển cảnh</Label>
                    <Select value={c.transition} onChange={(e) => patch(i, { transition: e.target.value })}>
                      <option value="cut">Cut (cắt thẳng)</option>
                      <option value="fade">Fade (mờ dần)</option>
                    </Select>
                  </div>
                  <div className="sm:col-span-3">
                    <Btn variant="outline" className="px-3 py-1 text-xs" onClick={() => regenerate(c.scene_id)}>🔁 Tạo lại video cảnh này</Btn>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
