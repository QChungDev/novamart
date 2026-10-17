/* Client gọi backend FastAPI. Base URL: NEXT_PUBLIC_API_BASE_URL (production) hoặc proxy /api (dev). */

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) {
    let msg = `Lỗi ${res.status}`;
    try {
      const j = await res.json();
      if (j?.detail) msg = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail);
    } catch {
      /* giữ msg mặc định */
    }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return (await res.json()) as T;
  return undefined as T;
}

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

/* ---------- Types ---------- */
export interface Project {
  id: number; name: string; description: string; status: string;
  target_duration_sec: number; aspect_ratio: string; resolution: string; fps: number;
  thumbnail_url: string; scene_count: number; created_at: string; updated_at: string;
}
export interface Character {
  id: number; name: string; character_code: string; description: string;
  appearance: string; colors: string; outfit: string; accessories: string;
  body_ratio: string; art_style: string; lock_rules: Record<string, unknown>;
  default_voice_profile_id: number | null; primary_image_url: string;
  image_count: number; voice_name: string;
  images?: { id: number; url: string; is_primary: boolean }[];
}
export interface DialogueLine { character_id: number; character_name: string; text: string; voice_profile_id: number | null; }
export interface Scene {
  id: number; project_id: number; scene_code: string; name: string; sort_order: number;
  target_duration_sec: number; location: string; action: string; expression: string;
  camera: string; dialogue: DialogueLine[]; ambient_audio: string;
  video_prompt: string; negative_prompt: string; status: string;
  video_url: string; error: string;
  characters: { id: number; name: string; character_code: string }[];
}
export interface GenJob {
  id: number; scene_id: number; status: string; attempts: number;
  progress: number; error: string; provider_task_id: string;
}
export interface VoiceProfile {
  id: number; name: string; character_id: number | null; character_name: string;
  gender: string; language: string; accent: string; tone: string;
  provider: string; provider_voice_id: string; is_default: boolean;
  rate: number; pitch: number;
}
export interface Provider {
  id: number; provider_type: string; name: string; adapter: string;
  base_url: string; model: string; api_key_set: boolean;
  capabilities: Record<string, unknown>; is_active: boolean;
}
export interface TimelineClip {
  id: number; scene_id: number; scene_name: string; sort_order: number;
  trim_start_sec: number; trim_end_sec: number; transition: string;
  video_url: string; duration_sec: number;
}
export interface AudioTrack {
  id: number; kind: string; scene_id: number | null; label: string;
  url: string; volume: number; fade_in_sec: number; fade_out_sec: number; start_offset_sec: number;
}
export interface SubtitleEntry { id?: number; start_sec: number; end_sec: number; text: string; }
export interface RenderJob {
  id: number; project_id: number; status: string; progress: number;
  output_url: string; srt_url: string; error: string;
}

/* ---------- Projects ---------- */
export const projectsApi = {
  list: () => req<Project[]>("/api/projects/"),
  create: (b: { name: string; description?: string; target_duration_sec?: number }) =>
    req<Project>("/api/projects/", json(b)),
  get: (id: number) => req<Project>(`/api/projects/${id}`),
  update: (id: number, b: Partial<Project>) =>
    req<Project>(`/api/projects/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }),
  remove: (id: number) => req<void>(`/api/projects/${id}`, { method: "DELETE" }),
  duplicate: (id: number, new_name?: string) =>
    req<Project>(`/api/projects/${id}/duplicate`, json({ new_name })),
};

/* ---------- Characters ---------- */
export const charactersApi = {
  list: () => req<Character[]>("/api/characters/"),
  get: (id: number) => req<Character>(`/api/characters/${id}`),
  create: (form: FormData) => req<Character>("/api/characters/", { method: "POST", body: form }),
  update: (id: number, b: Partial<Character>) =>
    req<Character>(`/api/characters/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }),
  remove: (id: number) => req<void>(`/api/characters/${id}`, { method: "DELETE" }),
  addImages: (id: number, form: FormData) => req<Character>(`/api/characters/${id}/images`, { method: "POST", body: form }),
  deleteImage: (imageId: number) => req<void>(`/api/characters/images/${imageId}`, { method: "DELETE" }),
  lockPrompt: (id: number) => req<{ prompt: string }>(`/api/characters/${id}/lock-prompt`),
};

/* ---------- Scripts & Scenes ---------- */
export const scriptsApi = {
  generate: (b: { project_id: number; idea: string; character_ids: number[]; style?: string; audience?: string; target_duration_sec: number; dialogue_language?: string }) =>
    req<{ script: unknown; scenes: Scene[] }>("/api/scripts/generate", json(b)),
  getByProject: (projectId: number) =>
    req<{ script: { id: number; idea: string; story_text: string; status: string } | null; scenes: Scene[] }>(`/api/scripts/project/${projectId}`),
  updateScene: (sceneId: number, b: Partial<Scene>) =>
    req<Scene>(`/api/scripts/scenes/${sceneId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }),
  reorder: (projectId: number, ordered_ids: number[]) =>
    req<void>(`/api/scripts/project/${projectId}/scenes/reorder`, json({ ordered_ids })),
  deleteScene: (sceneId: number) => req<void>(`/api/scripts/scenes/${sceneId}`, { method: "DELETE" }),
};

/* ---------- Video generation ---------- */
export const videoApi = {
  providers: () => req<Provider[]>("/api/video/providers"),
  createProvider: (b: { provider_type?: string; name: string; adapter: string; base_url?: string; api_key?: string; model?: string; options?: Record<string, unknown> }) =>
    req<Provider>("/api/video/providers", json(b)),
  updateProvider: (id: number, b: Partial<Provider> & { api_key?: string }) =>
    req<Provider>(`/api/video/providers/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }),
  deleteProvider: (id: number) => req<void>(`/api/video/providers/${id}`, { method: "DELETE" }),
  testProvider: (id: number) => req<{ ok: boolean; message: string; capabilities?: Record<string, unknown> }>(`/api/video/providers/${id}/test`, json({})),
  generate: (projectId: number, scene_ids?: number[]) =>
    req<{ jobs: GenJob[] }>(`/api/video/projects/${projectId}/generate`, json({ scene_ids })),
  jobs: (projectId: number) => req<GenJob[]>(`/api/video/jobs?project_id=${projectId}`),
  cancelJob: (jobId: number) => req<GenJob>(`/api/video/jobs/${jobId}/cancel`, json({})),
  retryJob: (jobId: number) => req<GenJob>(`/api/video/jobs/${jobId}/retry`, json({})),
  promptPack: (sceneId: number) =>
    req<{ video_prompt: string; negative_prompt: string; reference_image_urls: string[]; scene_info: Record<string, unknown> }>(`/api/video/scenes/${sceneId}/prompt-pack`),
  uploadSceneVideo: (sceneId: number, file: File) => {
    const f = new FormData(); f.append("video", file);
    return req<Scene>(`/api/video/scenes/${sceneId}/upload`, { method: "POST", body: f });
  },
};

/* ---------- Voices ---------- */
export const voicesApi = {
  list: () => req<VoiceProfile[]>("/api/voices/"),
  create: (b: Partial<VoiceProfile>) => req<VoiceProfile>("/api/voices/", json(b)),
  update: (id: number, b: Partial<VoiceProfile>) =>
    req<VoiceProfile>(`/api/voices/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }),
  remove: (id: number) => req<void>(`/api/voices/${id}`, { method: "DELETE" }),
  preview: (b: { provider_voice_id: string; text: string; rate?: number; pitch?: number }) =>
    req<{ audio_url: string }>("/api/voices/preview", json(b)),
  assign: (character_id: number, voice_profile_id: number) =>
    req<void>("/api/voices/assign", json({ character_id, voice_profile_id })),
  ttsVoices: (language = "vi-VN") =>
    req<{ voice_id: string; name: string; gender: string; locale: string }[]>(`/api/voices/tts/voices?language=${language}`),
};

/* ---------- Render ---------- */
export const renderApi = {
  timeline: (projectId: number) => req<{ clips: TimelineClip[] }>(`/api/render/projects/${projectId}/timeline`),
  saveTimeline: (projectId: number, clips: { scene_id: number; sort_order: number; trim_start_sec?: number; trim_end_sec?: number; transition?: string }[]) =>
    req<void>(`/api/render/projects/${projectId}/timeline`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clips }) }),
  dialogueAudio: (projectId: number) =>
    req<{ tracks: AudioTrack[] }>(`/api/render/projects/${projectId}/dialogue-audio`, json({})),
  audioTracks: (projectId: number) => req<{ tracks: AudioTrack[] }>(`/api/render/projects/${projectId}/audio`),
  updateTrack: (trackId: number, b: Partial<AudioTrack>) =>
    req<AudioTrack>(`/api/render/audio/${trackId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }),
  deleteTrack: (trackId: number) => req<void>(`/api/render/audio/${trackId}`, { method: "DELETE" }),
  uploadMusic: (projectId: number, file: File) => {
    const f = new FormData(); f.append("file", file);
    return req<AudioTrack>(`/api/render/projects/${projectId}/music`, { method: "POST", body: f });
  },
  subtitles: (projectId: number) => req<{ entries: SubtitleEntry[]; srt_url: string }>(`/api/render/projects/${projectId}/subtitles`),
  saveSubtitles: (projectId: number, entries: SubtitleEntry[]) =>
    req<void>(`/api/render/projects/${projectId}/subtitles`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entries }) }),
  render: (projectId: number, b: { resolution?: string; fps?: number; burn_subtitles?: boolean; export_srt?: boolean }) =>
    req<RenderJob>(`/api/render/projects/${projectId}/render`, json(b)),
  job: (jobId: number) => req<RenderJob>(`/api/render/jobs/${jobId}`),
  downloadUrl: (jobId: number) => `${BASE}/api/render/jobs/${jobId}/download`,
};

export const mediaUrl = (url: string) => (url?.startsWith("/") && BASE ? `${BASE}${url}` : url || "");
