"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Project, projectsApi } from "@/lib/api";
import { Btn, Card, Empty, Spinner, StatusBadge } from "@/components/ui";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    projectsApi.list().then(setProjects).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const duplicate = async (p: Project) => {
    try {
      await projectsApi.duplicate(p.id, `${p.name} (bản sao)`);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Nhân bản thất bại");
    }
  };

  const remove = async (p: Project) => {
    if (!confirm(`Xóa dự án "${p.name}"? Mọi cảnh, video và timeline sẽ bị xóa.`)) return;
    try {
      await projectsApi.remove(p.id);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Xóa thất bại");
    }
  };

  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Projects</h1>
          <p className="text-sm text-[#9a9ab0]">Quản lý toàn bộ dự án video</p>
        </div>
        <Link href="/dashboard"><Btn>+ Dự án mới</Btn></Link>
      </div>
      {error && <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
      {loading ? (
        <Spinner />
      ) : projects.length === 0 ? (
        <Empty title="Chưa có dự án nào" />
      ) : (
        <Card className="overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#26263a] text-left text-[#9a9ab0]">
                <th className="p-3">Tên</th>
                <th className="p-3">Trạng thái</th>
                <th className="p-3">Cảnh</th>
                <th className="p-3">Thời lượng</th>
                <th className="p-3">Cập nhật</th>
                <th className="p-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="border-b border-[#1c1c2a] last:border-0 hover:bg-white/[0.02]">
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3"><StatusBadge status={p.status} /></td>
                  <td className="p-3">{p.scene_count}</td>
                  <td className="p-3">{p.target_duration_sec}s</td>
                  <td className="p-3 text-[#9a9ab0]">{new Date(p.updated_at).toLocaleString("vi-VN")}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <Link href={`/scripts?project=${p.id}`}><Btn variant="outline" className="px-3 py-1">Mở</Btn></Link>
                      <Btn variant="ghost" className="px-3 py-1" onClick={() => duplicate(p)}>Nhân bản</Btn>
                      <Btn variant="danger" className="px-3 py-1" onClick={() => remove(p)}>Xóa</Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
