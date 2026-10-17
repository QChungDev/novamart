"use client";
import { useEffect, useRef, useState } from "react";
import { AudioTrack, mediaUrl, renderApi, RenderJob, SubtitleEntry } from "@/lib/api";
import { useProject } from "@/components/ProjectContext";
import { Btn, Card, Empty, Input, Label, Select, Spinner } from "@/components/ui";

export default function RenderPage() {
  const { project } = useProject();
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [subs, setSubs] = useState<SubtitleEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const [resolution, setResolution] = useState("1080x1920");
  const [fps, setFps] = useState(30);
  const [burnSubs, setBurnSubs] = useState(true);
  const [exportSrt, setExportSrt] = useState(true);
  const [job, setJob] = useState<RenderJob | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async (pid: number) => {
    setLoading(true);
    try {
      const [a, s] = await Promise.all([renderApi.audioTracks(pid), renderApi.subtitles(pid)]);
      setTracks(a.tracks);
      setSubs(s.entries);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Tải dữ liệu thất bại");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (project) load(project.id);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]);

  const act = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setError("");
    try { await fn(); } catch (e: unknown) { setError(e instanceof Error ? e.message : "Thất bại"); }
    finally { setBusy(""); }
  };

  const genDialogue = () => project && act("dialogue", async () => {
    const r = await renderApi.dialogueAudio(project.id);
    setTracks(r.tracks);
  });

  const uploadMusic = (file: File) => project && act("music", async () => {
    await renderApi.uploadMusic(project.id, file);
    const a = await renderApi.audioTracks(project.id);
    setTracks(a.tracks);
  });

  const updateTrack = async (t: AudioTrack, patch: Partial<AudioTrack>) => {
    try {
      const u = await renderApi.updateTrack(t.id, patch);
      setTracks(tracks.map((x) => (x.id === t.id ? u : x)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Cập nhật track thất bại");
    }
  };

  const deleteTrack = async (t: AudioTrack) => {
    if (!confirm(`Xóa track "${t.label}"?`)) return;
    try {
      await renderApi.deleteTrack(t.id);
      setTracks(tracks.filter((x) => x.id !== t.id));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Xóa track thất bại");
    }
  };

  const saveSubs = () => project && act("subs", async () => {
    await renderApi.saveSubtitles(project.id, subs);
  });

  const patchSub = (i: number, p: Partial<SubtitleEntry>) => {
    const n = [...subs];
    n[i] = { ...n[i], ...p };
    setSubs(n);
  };

  const startRender = () => project && act("render", async () => {
    const j = await renderApi.render(project.id, { resolution, fps, burn_subtitles: burnSubs, export_srt: exportSrt });
    setJob(j);
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const u = await renderApi.job(j.id);
        setJob(u);
        if (["succeeded", "failed", "cancelled"].includes(u.status) && pollRef.current) {
          clearInterval(pollRef.current);
        }
      } catch { /* bỏ qua lỗi poll */ }
    }, 3000);
  });

  if (!project) {
    return (
      <div className="animate-fade-up space-y-4">
        <h1 className="text-2xl font-bold">Render & Export</h1>
        <Empty title="Chưa chọn dự án" hint="Vào Dashboard chọn một dự án để render." />
      </div>
    );
  }

  const KIND_LABEL: Record<string, string> = { dialogue: "Lời thoại", music: "Nhạc nền", ambient: "Âm thanh môi trường", sfx: "Hiệu ứng" };

  return (
    <div className="animate-fade-up space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Render & Export</h1>
        <p className="text-sm text-[#9a9ab0]">Dự án: <span className="font-semibold text-white">{project.name}</span></p>
      </div>
      {error && <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

      {loading ? <Spinner /> : (
        <>
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">🔊 Âm thanh ({tracks.length} track)</h2>
              <div className="flex gap-2">
                <Btn variant="outline" className="text-xs" onClick={genDialogue} disabled={busy === "dialogue"}>
                  {busy === "dialogue" ? "Đang tạo giọng..." : "🎙️ Tạo lời thoại từ kịch bản"}
                </Btn>
                <label className="cursor-pointer rounded-xl border border-[#26263a] px-4 py-2 text-sm font-semibold hover:border-violet-500">
                  {busy === "music" ? "Đang tải..." : "🎵 Tải nhạc nền lên"}
                  <input type="file" accept="audio/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMusic(f); }} />
                </label>
              </div>
            </div>
            {tracks.length === 0 ? (
              <p className="text-sm text-[#9a9ab0]">Chưa có track nào. Bấm “Tạo lời thoại từ kịch bản” để sinh giọng đọc cho từng cảnh.</p>
            ) : (
              <div className="space-y-3">
                {tracks.map((t) => (
                  <div key={t.id} className="rounded-xl bg-black/30 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded-full bg-violet-600/20 px-2 py-0.5 text-xs text-violet-200">{KIND_LABEL[t.kind] || t.kind}</span>
                      <p className="text-sm font-medium">{t.label}</p>
                      <audio src={mediaUrl(t.url)} controls className="ml-auto h-8 w-48" preload="none" />
                      <Btn variant="danger" className="px-2 py-1 text-xs" onClick={() => deleteTrack(t)}>✕</Btn>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div><Label>Âm lượng ({Math.round(t.volume * 100)}%)</Label>
                        <input type="range" min={0} max={2} step={0.05} value={t.volume} onChange={(e) => updateTrack(t, { volume: parseFloat(e.target.value) })} className="w-full" />
                      </div>
                      <div><Label>Fade in (giây)</Label>
                        <Input type="number" min={0} step={0.5} value={t.fade_in_sec} onChange={(e) => updateTrack(t, { fade_in_sec: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div><Label>Fade out (giây)</Label>
                        <Input type="number" min={0} step={0.5} value={t.fade_out_sec} onChange={(e) => updateTrack(t, { fade_out_sec: parseFloat(e.target.value) || 0 })} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">💬 Phụ đề ({subs.length} dòng)</h2>
              <Btn variant="outline" className="text-xs" onClick={saveSubs} disabled={busy === "subs"}>
                {busy === "subs" ? "Đang lưu..." : "💾 Lưu phụ đề"}
              </Btn>
            </div>
            {subs.length === 0 ? (
              <p className="text-sm text-[#9a9ab0]">Chưa có phụ đề. Phụ đề sẽ tự sinh từ lời thoại khi bạn mở trang này lần đầu sau khi có kịch bản.</p>
            ) : (
              <div className="max-h-80 space-y-2 overflow-y-auto">
                {subs.map((s, i) => (
                  <div key={i} className="grid grid-cols-[90px_90px_1fr] items-center gap-2">
                    <Input type="number" step={0.5} value={s.start_sec} onChange={(e) => patchSub(i, { start_sec: parseFloat(e.target.value) || 0 })} className="text-xs" />
                    <Input type="number" step={0.5} value={s.end_sec} onChange={(e) => patchSub(i, { end_sec: parseFloat(e.target.value) || 0 })} className="text-xs" />
                    <Input value={s.text} onChange={(e) => patchSub(i, { text: e.target.value })} className="text-xs" />
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold">🚀 Render video cuối</h2>
            <div className="mb-4 grid gap-3 sm:grid-cols-4">
              <div><Label>Độ phân giải</Label>
                <Select value={resolution} onChange={(e) => setResolution(e.target.value)}>
                  <option value="1080x1920">1080 × 1920 (9:16)</option>
                  <option value="720x1280">720 × 1280 (9:16)</option>
                  <option value="1920x1080">1920 × 1080 (16:9)</option>
                  <option value="1080x1080">1080 × 1080 (1:1)</option>
                </Select>
              </div>
              <div><Label>FPS</Label>
                <Select value={fps} onChange={(e) => setFps(parseInt(e.target.value, 10))}>
                  <option value={30}>30</option><option value={24}>24</option>
                </Select>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={burnSubs} onChange={(e) => setBurnSubs(e.target.checked)} className="h-4 w-4 accent-violet-600" /> Chèn phụ đề vào video</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={exportSrt} onChange={(e) => setExportSrt(e.target.checked)} className="h-4 w-4 accent-violet-600" /> Xuất file SRT riêng</label>
            </div>
            <Btn onClick={startRender} disabled={busy === "render"}>
              {busy === "render" ? "Đang gửi..." : "🎬 Bắt đầu render (FFmpeg)"}
            </Btn>

            {job && (
              <div className="mt-4 rounded-xl bg-black/30 p-4">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span>Trạng thái: <b>{job.status === "succeeded" ? "Hoàn thành" : job.status === "failed" ? "Thất bại" : job.status === "processing" ? "Đang render..." : "Đang chờ..."}</b></span>
                  <span>{job.progress}%</span>
                </div>
                <div className="mb-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full bg-gradient-to-r from-violet-600 to-cyan-500 transition-all" style={{ width: `${job.progress}%` }} />
                </div>
                {job.error && <p className="mb-2 text-xs text-red-300">{job.error}</p>}
                {job.status === "succeeded" && job.output_url && (
                  <div className="space-y-3">
                    <video src={mediaUrl(job.output_url)} controls className="mx-auto max-h-96 rounded-xl" />
                    <div className="flex gap-2">
                      <a href={renderApi.downloadUrl(job.id)} download className="rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-4 py-2 text-sm font-semibold text-white">⬇️ Tải MP4</a>
                      {job.srt_url && <a href={mediaUrl(job.srt_url)} download className="rounded-xl border border-[#26263a] px-4 py-2 text-sm font-semibold hover:border-violet-500">⬇️ Tải SRT</a>}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
