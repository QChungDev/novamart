"use client";

/** Recently viewed products (prototype, localStorage). */

const KEY = "novamart-recent-v1";
const MAX = 8;

export function pushRecentView(productId: number): void {
  try {
    const raw = window.localStorage.getItem(KEY);
    const list: number[] = raw ? JSON.parse(raw) : [];
    const next = [productId, ...list.filter((id) => id !== productId)].slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function getRecentViews(excludeId?: number): number[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const list: number[] = raw ? JSON.parse(raw) : [];
    return excludeId ? list.filter((id) => id !== excludeId) : list;
  } catch {
    return [];
  }
}
