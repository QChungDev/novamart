"use client";

/** Recently viewed products (prototype, localStorage). */

const KEY = "novamart-recent-v1";
const MAX = 8;

export function pushRecentView(productId: string): void {
  try {
    const raw = window.localStorage.getItem(KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    const next = [productId, ...list.filter((id) => id !== productId)].slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function getRecentViews(excludeId?: string): string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    return excludeId ? list.filter((id) => id !== excludeId) : list;
  } catch {
    return [];
  }
}
