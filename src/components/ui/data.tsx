"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/* --------------------------------- Pagination -------------------------------- */

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  return (
    <nav className="flex items-center justify-center gap-1.5" aria-label="Phân trang">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-ink-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Trang trước"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={cn(
            "h-9 min-w-9 cursor-pointer rounded-lg px-2 text-sm font-semibold transition-colors",
            p === page
              ? "bg-brand-600 text-white"
              : "border border-slate-200 text-ink-700 hover:bg-slate-50",
          )}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-ink-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Trang sau"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}

/* ----------------------------------- Tabs ------------------------------------ */

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="nice-scroll flex gap-1 overflow-x-auto border-b border-slate-200">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            "relative cursor-pointer whitespace-nowrap px-4 py-3 text-sm font-semibold transition-colors",
            value === t.value ? "text-brand-700" : "text-ink-500 hover:text-ink-900",
          )}
        >
          {t.label}
          {t.count !== undefined && (
            <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs">
              {t.count}
            </span>
          )}
          {value === t.value && (
            <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600" />
          )}
        </button>
      ))}
    </div>
  );
}

/* -------------------------------- Breadcrumbs -------------------------------- */

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-ink-400">/</span>}
          {item.href ? (
            <Link href={item.href} className="text-ink-500 hover:text-brand-700">
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-ink-900">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

/* --------------------------------- DataTable --------------------------------- */

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  emptyTitle = "Không có dữ liệu",
  emptyDescription,
}: {
  columns: Column<T>[];
  data: T[];
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
        <p className="font-semibold text-ink-900">{emptyTitle}</p>
        {emptyDescription && <p className="mt-1 text-sm text-ink-500">{emptyDescription}</p>}
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/70">
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn("px-4 py-3 text-xs font-bold uppercase tracking-wide text-ink-500", c.className)}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
              {columns.map((c) => (
                <td key={c.key} className={cn("px-4 py-3 align-middle", c.className)}>
                  {c.render ? c.render(row) : (row as Record<string, React.ReactNode>)[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------- QuantitySelector ----------------------------- */

export function QuantitySelector({
  value,
  onChange,
  min = 1,
  max = 99,
  small = false,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  small?: boolean;
}) {
  const btn = small ? "h-8 w-8" : "h-11 w-11";
  return (
    <div className="inline-flex items-center rounded-xl border border-slate-200">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className={cn(
          "flex cursor-pointer items-center justify-center rounded-l-xl text-ink-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40",
          btn,
        )}
        aria-label="Giảm số lượng"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className={cn("text-center text-sm font-bold tabular-nums", small ? "w-8" : "w-12")}>
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className={cn(
          "flex cursor-pointer items-center justify-center rounded-r-xl text-ink-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40",
          btn,
        )}
        aria-label="Tăng số lượng"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
