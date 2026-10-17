"use client";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { Project, projectsApi } from "@/lib/api";

/* Project đang làm việc: ưu tiên ?project= trên URL, fallback localStorage. */
const Ctx = createContext<{
  project: Project | null;
  setProjectId: (id: number | null) => void;
  reload: () => void;
}>({ project: null, setProjectId: () => {}, reload: () => {} });

export function useProject() {
  return useContext(Ctx);
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projectId, setProjectIdState] = useState<number | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("project");
    if (q) {
      const id = parseInt(q, 10);
      if (!isNaN(id)) {
        setProjectIdState(id);
        localStorage.setItem("studio:projectId", String(id));
        return;
      }
    }
    const saved = localStorage.getItem("studio:projectId");
    if (saved) setProjectIdState(parseInt(saved, 10));
  }, []);

  useEffect(() => {
    if (!projectId) {
      setProject(null);
      return;
    }
    projectsApi
      .get(projectId)
      .then(setProject)
      .catch(() => setProject(null));
  }, [projectId, tick]);

  const setProjectId = (id: number | null) => {
    setProjectIdState(id);
    if (id) localStorage.setItem("studio:projectId", String(id));
    else localStorage.removeItem("studio:projectId");
  };

  return <Ctx.Provider value={{ project, setProjectId, reload: () => setTick((t) => t + 1) }}>{children}</Ctx.Provider>;
}

export function ProjectPicker({ onPick }: { onPick?: () => void }) {
  const { setProjectId } = useProject();
  const [list, setList] = useState<Project[]>([]);
  useEffect(() => {
    projectsApi.list().then(setList).catch(() => {});
  }, []);
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-[#9a9ab0]">Dự án:</span>
      <select
        className="rounded-xl border border-[#26263a] bg-[#0b0b12] px-3 py-2 text-sm outline-none focus:border-violet-500"
        onChange={(e) => {
          const v = e.target.value;
          setProjectId(v ? parseInt(v, 10) : null);
          onPick?.();
        }}
        defaultValue={typeof window !== "undefined" ? localStorage.getItem("studio:projectId") || "" : ""}
      >
        <option value="">— Chọn dự án —</option>
        {list.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
}
