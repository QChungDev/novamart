"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Character, charactersApi, mediaUrl, Scene, scriptsApi, videoApi } from "@/lib/api";
import { useProject } from "@/components/ProjectContext";
import { Btn, Card, Empty, Input, Label, Select, Spinner, StatusBadge, TextArea } from "@/components/ui";

function ScriptsInner() {
  const { project, setProjectId } = useProject();
  const searchParams = useSearchParams();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [scriptInfo, setScriptInfo] = useState<{ id: number; idea: string; story_text: string; status: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [idea, setIdea] = useState("");
  const [charIds, setCharIds] = useState<number[]>([]);
  const [style, setStyle] = useState("Hoạt hình 3D đáng yêu");
  const [audience, setAudience] = useState("Thiếu nhi và gia đình");
  const [duration, setDuration] = useState(30);
  const [generating, setGenerating] = useState(false);

  const [promptPack, setPromptPack] = useState<{ sceneId: number; data: { video_prompt: string; negative_prompt: string; reference_image_urls: string[] } } | null>(null);
  const [genBusy, setGenBusy] = useState(false);

  useEffect(() => {
    const q = searchParams.get("project");
    if (q) setProjectId(parseInt(q, 10));
    charactersApi.list().then(setCharacters).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadScenes = async (pid: number) => {
    setLoading(true);
    try {
      const r = await scriptsApi.getByProject(pid);
      setScenes(r.scenes);
      setScriptInfo(r.script);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Tải storyboard thất bại");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (project) {
      setDuration(project.target_duration_sec);
      loadScenes(project.id);
    } else {
      setScenes([]);
      setScriptInfo(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]);

  const generate = async () => {
    if (!project || !idea.trim() || charIds.length === 0) {
      setError("Nhập ý tưởng và chọn ít nhất 1 nhân vật.");
      return;
    }
    setGenerating(true);
    setError("");
    try {
      const r = await scriptsApi.generate({
        project_id: project.id, idea: idea.trim(), character_ids: charIds,
        style, audience, target_duration_sec: duration, dialogue_language: "vi",
      });
      setScenes(r.scenes);
      loadScenes(project.id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Sinh kịch bản thất bại");
    } finally {
      setGenerating(false);
    }
  };

  const requestGeneration = async (sceneIds?: number[]) => {
    if (!project) return;
    setGenBusy(true);
    try {
      await videoApi.generate(project.id, sceneIds);
      loadScenes(project.id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Gửi yêu cầu tạo video thất bại");
    } finally {
      setGenBusy(false);
    }
  };

  const uploadVideo = async (sceneId: number, file: File) => {
    try {
      await videoApi.uploadSceneVideo(sceneId, file);
      if (project) loadScenes(project.id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload thất bại");
    }
  };

  const viewPack = async (sceneId: number) => {
    try {
      const data = await videoApi.promptPack(sceneId);
      setPromptPack({ sceneId, data });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Không lấy được prompt");
    }
  };

  if (!project) {
    return (
      <div className="animate-fade-up space-y-4">
        <h1 className="text-2xl font-bold">Script & Storyboard</h1>
        <Empty title="Chưa chọn dự án" hint="Vào Dashboard chọn một dự án để viết kịch bản." />
      </div>
    );
  }

  return (
    <div className="animate-fade-up space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Script & Storyboard</h1>
        <p className="text-sm text-[#9a9ab0]">Dự án: <span className="font-semibold text-white">{project.name}</span></p>
      </div>
      {error && <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

      <Card>
        <h2 className="mb-3 font-semibold">💡 Từ ý tưởng thành kịch bản</h2>
        <div className="grid gap-3">
          <div><Label>Ý tưởng video</Label>
            <TextArea rows={2} value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="VD: Mèo Mốc ăn quá nhiều bánh và bị Robot Bíp phát hiện" />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div><Label>Nhân vật tham gia</Label>
              <div className="flex flex-wrap gap-2">
                {characters.map((c) => (
                  <button key={c.id} onClick={() => setCharIds(charIds.includes(c.id) ? charIds.filter((x) => x !== c.id) : [...charIds, c.id])}
                    className={`rounded-full border px-3 py-1 text-xs transition cursor-pointer ${charIds.includes(c.id) ? "border-violet-500 bg-violet-500/20 text-white" : "border-[#26263a] text-[#9a9ab0]"}`}>
                    {c.name}
                  </button>
                ))}
              </div>
              {characters.length === 0 && <p className="text-xs text-[#9a9ab0]">Chưa có nhân vật — tạo ở Character Studio trước.</p>}
            </div>
            <div><Label>Phong cách</Label><Input value={style} onChange={(e) => setStyle(e.target.value)} /></div>
            <div><Label>Đối tượng</Label><Input value={audience} onChange={(e) => setAudience(e.target.value)} /></div>
          </div>
          <div className="flex items-center gap-3">
            <Label>Thời lượng mục tiêu</Label>
            <Select value={duration} onChange={(e) => setDuration(parseInt(e.target.value, 10))}>
              {[15, 30, 45, 60, 90].map((d) => <option key={d} value={d}>{d} giây</option>)}
            </Select>
            <Btn onClick={generate} disabled={generating}>{generating ? "Đang viết kịch bản..." : "✨ Sinh kịch bản & chia cảnh"}</Btn>
            {scenes.length > 0 && (
              <Btn variant="outline" onClick={() => requestGeneration()} disabled={genBusy}>
                {genBusy ? "Đang gửi..." : "🎬 Tạo video tất cả cảnh"}
              </Btn>
            )}
          </div>
        </div>
      </Card>

      {scriptInfo?.story_text && (
        <Card>
          <h2 className="mb-2 font-semibold">📖 Câu chuyện</h2>
          <p className="whitespace-pre-wrap text-sm text-[#c9c9da]">{scriptInfo.story_text}</p>
        </Card>
      )}

      <div>
        <h2 className="mb-3 font-semibold">🎞️ Storyboard ({scenes.length} cảnh)</h2>
        {loading ? <Spinner /> : scenes.length === 0 ? (
          <Empty title="Chưa có cảnh nào" hint="Nhập ý tưởng ở trên và bấm “Sinh kịch bản & chia cảnh”." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {scenes.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="font-semibold">{s.scene_code}: {s.name}</p>
                  <StatusBadge status={s.status} />
                </div>
                <div className="mb-2 aspect-video overflow-hidden rounded-xl bg-black/50">
                  {s.video_url ? (
                    <video src={mediaUrl(s.video_url)} controls className="h-full w-full object-contain" preload="metadata" />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-1 text-[#5a5a72]">
                      <span className="text-3xl">🎥</span>
                      <span className="text-xs">Chưa có video · {s.target_duration_sec}s</span>
                    </div>
                  )}
                </div>
                {s.error && <p className="mb-2 rounded-lg bg-red-500/10 p-2 text-xs text-red-300">{s.error}</p>}
                <div className="mb-2 space-y-1 text-xs text-[#9a9ab0]">
                  <p><span className="text-[#c9c9da]">📍 Bối cảnh:</span> {s.location}</p>
                  <p><span className="text-[#c9c9da]">🎭 Hành động:</span> {s.action}</p>
                  <p><span className="text-[#c9c9da]">📷 Góc máy:</span> {s.camera}</p>
                  <p><span className="text-[#c9c9da]">👥 Nhân vật:</span> {s.characters.map((c) => c.name).join(", ")}</p>
                </div>
                {s.dialogue.length > 0 && (
                  <div className="mb-3 rounded-lg bg-black/30 p-2 text-xs">
                    {s.dialogue.map((d, i) => (
                      <p key={i} className="mb-1"><span className="font-semibold text-cyan-300">{d.character_name}:</span> <span className="text-[#c9c9da]">{d.text}</span></p>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Btn variant="outline" className="px-3 py-1 text-xs" onClick={() => requestGeneration([s.id])} disabled={genBusy}>🔁 Tạo video cảnh này</Btn>
                  <Btn variant="ghost" className="px-3 py-1 text-xs" onClick={() => viewPack(s.id)}>📋 Prompt</Btn>
                  <label className="cursor-pointer rounded-xl px-3 py-1 text-xs text-[#9a9ab0] hover:bg-white/5 hover:text-white">
                    ⬆️ Tải MP4 lên
                    <input type="file" accept="video/mp4,video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadVideo(s.id, f); }} />
                  </label>
                </div>
                {promptPack?.sceneId === s.id && (
                  <div className="mt-3 rounded-lg bg-black/40 p-3 text-xs">
                    <p className="mb-1 font-semibold text-violet-300">Video prompt (copy sang Muse AI ở Manual Mode):</p>
                    <pre className="whitespace-pre-wrap text-[#9a9ab0]">{promptPack.data.video_prompt}</pre>
                    {promptPack.data.negative_prompt && (
                      <><p className="mb-1 mt-2 font-semibold text-violet-300">Negative prompt:</p>
                      <pre className="whitespace-pre-wrap text-[#9a9ab0]">{promptPack.data.negative_prompt}</pre></>
                    )}
                    <p className="mt-2 text-[#5a5a72]">Ảnh tham chiếu: {promptPack.data.reference_image_urls.length} ảnh</p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ScriptsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[#9a9ab0]">Đang tải...</div>}>
      <ScriptsInner />
    </Suspense>
  );
}
