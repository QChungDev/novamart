"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/projects", label: "My Projects", icon: "🎬" },
  { href: "/characters", label: "Character Studio", icon: "🦊" },
  { href: "/scripts", label: "Script & Storyboard", icon: "📝" },
  { href: "/voices", label: "Voice Studio", icon: "🎙️" },
  { href: "/editor", label: "Video Editor", icon: "✂️" },
  { href: "/render", label: "Render & Export", icon: "🚀" },
  { href: "/settings", label: "API Settings", icon: "🔑" },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-[#26263a] bg-[#12121c]">
      <div className="flex items-center gap-2 px-5 pb-6 pt-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 text-xl">
          🎥
        </div>
        <div>
          <p className="font-bold leading-tight">AI Shorts Studio</p>
          <p className="text-xs text-[#9a9ab0]">Multi-clip video AI</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {NAV.map((n) => {
          const active = pathname === n.href || pathname.startsWith(n.href + "/");
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                active
                  ? "bg-gradient-to-r from-violet-600/25 to-cyan-500/15 font-semibold text-white"
                  : "text-[#9a9ab0] hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className="text-lg">{n.icon}</span>
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 text-xs text-[#5a5a72]">MVP · FFmpeg + Edge TTS · Manual/API mode</div>
    </aside>
  );
}
