"use client";
import { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-[#26263a] bg-[#171724] p-5 shadow-lg shadow-black/30 ${className}`}>
      {children}
    </div>
  );
}

export function Btn({ children, className = "", variant = "primary", ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" | "outline" }) {
  const base = "rounded-xl px-4 py-2 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer";
  const styles = {
    primary: "bg-gradient-to-r from-violet-600 to-cyan-500 text-white hover:from-violet-500 hover:to-cyan-400",
    ghost: "text-[#9a9ab0] hover:text-white hover:bg-white/5",
    danger: "bg-red-600/90 text-white hover:bg-red-500",
    outline: "border border-[#26263a] text-[#e8e8f0] hover:border-violet-500",
  } as const;
  return (
    <button className={`${base} ${styles[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function Input({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-xl border border-[#26263a] bg-[#0b0b12] px-3 py-2 text-sm text-[#e8e8f0] placeholder-[#5a5a72] outline-none focus:border-violet-500 ${className}`}
      {...rest}
    />
  );
}

export function TextArea({ className = "", ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full rounded-xl border border-[#26263a] bg-[#0b0b12] px-3 py-2 text-sm text-[#e8e8f0] placeholder-[#5a5a72] outline-none focus:border-violet-500 ${className}`}
      {...rest}
    />
  );
}

export function Select({ children, className = "", ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`rounded-xl border border-[#26263a] bg-[#0b0b12] px-3 py-2 text-sm text-[#e8e8f0] outline-none focus:border-violet-500 ${className}`}
      {...rest}
    >
      {children}
    </select>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#9a9ab0]">{children}</label>;
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Nháp",
  generating: "Đang tạo",
  ready_to_edit: "Sẵn sàng sửa",
  rendering: "Đang render",
  completed: "Hoàn thành",
  queued: "Chờ",
  processing: "Đang xử lý",
  ready: "Sẵn sàng",
  failed: "Lỗi",
  succeeded: "Xong",
  cancelled: "Đã hủy",
};
const STATUS_COLOR: Record<string, string> = {
  draft: "bg-slate-500/20 text-slate-300",
  generating: "bg-amber-500/20 text-amber-300 animate-pulse-soft",
  ready_to_edit: "bg-cyan-500/20 text-cyan-300",
  rendering: "bg-violet-500/20 text-violet-300 animate-pulse-soft",
  completed: "bg-emerald-500/20 text-emerald-300",
  queued: "bg-slate-500/20 text-slate-300",
  processing: "bg-amber-500/20 text-amber-300 animate-pulse-soft",
  ready: "bg-emerald-500/20 text-emerald-300",
  failed: "bg-red-500/20 text-red-300",
  succeeded: "bg-emerald-500/20 text-emerald-300",
  cancelled: "bg-slate-500/20 text-slate-400",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[status] || STATUS_COLOR.draft}`}>
      {STATUS_LABEL[status] || status}
    </span>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#26263a] p-10 text-center">
      <p className="font-medium text-[#e8e8f0]">{title}</p>
      {hint && <p className="mt-1 text-sm text-[#9a9ab0]">{hint}</p>}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
    </div>
  );
}
