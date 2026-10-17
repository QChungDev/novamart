"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { mediaUrl, Project, projectsApi } from "@/lib/api";
import { Btn, Card, Empty, Input, Spinner, StatusBadge } from "@/components/ui";

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [duration, setDuration] = useState(30);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    projectsApi
      .list()
      .then(setProjects)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const create = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const p = await projectsApi.create({ name: name.trim(), target_duration_sec: duration });
      localStorage.setItem("studio:projectId", String(p.id));
      window.location.href = `/scripts?project=${p.id}`;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Tạo dự án thất bại");
    } finally {
      setCreating(false);
    }
  };

  const totalScenes = projects.reduce((s, p) => s + p.scene_count, 0);

  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-[#9a9ab0]">Tổng quan các dự án video AI của bạn</p>
        </div>
        <Btn onClick={() => setShowNew(true)}>+ Dự án mới</Btn>
      </div>

      {error && <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Dự án", value: projects.length },
          { label: "Tổng số cảnh", value: totalScenes },
          { label: "Đang tạo video", value: projects.filter((p) => p.status === "generating").length },
          { label: "Hoàn thành", value: projects.filter((p) => p.status === "completed").length },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-3xl font-bold text-white">{s.value}</p>
            <p className="text-sm text-[#9a9ab0]">{s.label}</p>
          </Card>
        ))}
      </div>

      {showNew && (
        <Card>
          <h2 className="mb-3 font-semibold">Tạo dự án mới</h2>
          <div className="flex flex-col gap-3 md:flex-row">
            <Input placeholder="Tên dự án, vd: Mèo Mốc tập 1" value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
            <select value={duration} onChange={(e) => setDuration(parseInt(e.target.value, 10))} className="rounded-xl border border-[#26263a] bg-[#0b0b12] px-3 py-2 text-sm outline-none">
              {[15, 30, 45, 60, 90].map((d) => (
                <option key={d} value={d}>{d} giây</option>
              ))}
            </select>
            <Btn onClick={create} disabled={creating || !name.trim()}>{creating ? "Đang tạo..." : "Tạo"}</Btn>
            <Btn variant="ghost" onClick={() => setShowNew(false)}>Hủy</Btn>
          </div>
        </Card>
      )}

      <div>
        <h2 className="mb-3 font-semibold">Dự án gần đây</h2>
        {loading ? (
          <Spinner />
        ) : projects.length === 0 ? (
          <Empty title="Chưa có dự án nào" hint="Bấm “+ Dự án mới” để bắt đầu video đầu tiên của bạn." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.slice(0, 6).map((p) => (
              <Card key={p.id} className="p-4">
                <div className="mb-3 aspect-video overflow-hidden rounded-xl bg-black/40">
                  {p.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mediaUrl(p.thumbnail_url)} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-4xl">🎬</div>
                  )}
                </div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="truncate font-semibold">{p.name}</p>
                  <StatusBadge status={p.status} />
                </div>
                <p className="mb-3 text-xs text-[#9a9ab0]">
                  {p.scene_count} cảnh · {p.target_duration_sec}s · {new Date(p.updated_at).toLocaleDateString("vi-VN")}
                </p>
                <Link href={`/scripts?project=${p.id}`}>
                  <Btn variant="outline" className="w-full">Tiếp tục chỉnh sửa</Btn>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
