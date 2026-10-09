/** Format a number as Vietnamese đồng, e.g. 7490000 -> "7.490.000 ₫". */
export function formatVND(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(Math.round(value)) + " ₫";
}

/** Format a compact number, e.g. 12500 -> "12,5K". */
export function formatCompact(value: number): string {
  return new Intl.NumberFormat("vi-VN", { notation: "compact" }).format(value);
}

/** Format an ISO date string as dd/mm/yyyy. */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

/** Format an ISO date string with time, e.g. "12:30 09/10/2026". */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const date = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
  const time = new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return `${time} ${date}`;
}

/** Clamp a number between min and max. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Generate a mock order code, e.g. "NM-20261009-4F8K2". */
export function generateOrderCode(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `NM-${y}${m}${d}-${rand}`;
}
