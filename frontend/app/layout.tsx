import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { ProjectProvider } from "@/components/ProjectContext";

export const metadata: Metadata = {
  title: "AI Shorts Studio",
  description: "Nền tảng tạo video ngắn nhiều cảnh bằng AI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <ProjectProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="min-w-0 flex-1 overflow-y-auto">
              <div className="mx-auto max-w-7xl p-6">{children}</div>
            </main>
          </div>
        </ProjectProvider>
      </body>
    </html>
  );
}
