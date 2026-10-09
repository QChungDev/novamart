import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-ink-400">
        <FileQuestion className="h-8 w-8" />
      </span>
      <h1 className="mt-5 text-6xl font-extrabold text-ink-900">404</h1>
      <p className="mt-2 text-lg font-bold text-ink-900">Không tìm thấy trang</p>
      <p className="mt-1 text-sm text-ink-500">
        Trang bạn đang tìm không tồn tại hoặc đã bị di chuyển.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex h-11 items-center rounded-xl bg-brand-600 px-6 text-sm font-bold text-white hover:bg-brand-700"
      >
        Về trang chủ
      </Link>
    </div>
  );
}
