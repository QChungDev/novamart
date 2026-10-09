"use client";

/**
 * Unified data store — single source of truth for shop + admin (Phase 1).
 *
 * Điểm 1 (review): trước đây shop.ts đọc mock-data.ts còn admin.ts giữ một bản
 * sao riêng trong localStorage, nên sửa sản phẩm ở Admin không hiện ra shop.
 * Từ nay mọi dữ liệu đều qua store này: 1 state, 1 localStorage key.
 *
 * Điểm 2 (review): mọi thao tác dữ liệu đều là hàm async (trả về Promise).
 * Phase 1 resolve ngay từ bộ nhớ; sang Phase 2 chỉ cần đổi ruột các hàm này
 * thành fetch() tới FastAPI mà không phải sửa call sites.
 */

import { useSyncExternalStore } from "react";
import {
  categories as seedCategories,
  coupons as seedCoupons,
  customers as seedCustomers,
  dailyRevenue as seedDailyRevenue,
  defaultSettings,
  orders as seedOrders,
  products as seedProducts,
  reviews as seedReviews,
  stockMovements as seedMovements,
} from "../mock-data";
import type {
  Category,
  Coupon,
  Customer,
  DailyRevenue,
  Order,
  Product,
  Review,
  StockMovement,
  StoreSettings,
} from "../types";

export interface StoreState {
  products: Product[];
  categories: Category[];
  orders: Order[];
  coupons: Coupon[];
  customers: Customer[];
  movements: StockMovement[];
  settings: StoreSettings;
  reviews: Review[];
  dailyRevenue: DailyRevenue[];
}

const STORAGE_KEY = "novamart-store-v2";
const LEGACY_KEY = "novamart-admin-v1";

function deepCopy<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function seed(): StoreState {
  return {
    products: deepCopy(seedProducts),
    categories: deepCopy(seedCategories),
    orders: deepCopy(seedOrders),
    coupons: deepCopy(seedCoupons),
    customers: deepCopy(seedCustomers),
    movements: deepCopy(seedMovements),
    settings: deepCopy(defaultSettings),
    reviews: deepCopy(seedReviews),
    dailyRevenue: deepCopy(seedDailyRevenue),
  };
}

function valid(s: unknown): s is StoreState {
  const x = s as StoreState | null;
  return !!x && Array.isArray(x.products) && Array.isArray(x.orders);
}

function load(): StoreState {
  if (typeof window === "undefined") return seed();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoreState;
      if (valid(parsed)) return { ...seed(), ...parsed };
    }
    // Migrate dữ liệu admin cũ (v1) sang store chung.
    const legacy = window.localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy) as StoreState;
      if (valid(parsed)) {
        const merged = { ...seed(), ...parsed };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        window.localStorage.removeItem(LEGACY_KEY);
        return merged;
      }
    }
  } catch {
    /* ignore */
  }
  return seed();
}

let state: StoreState | null = null;
/** Tăng mỗi lần store thay đổi — component đăng ký để fetch lại dữ liệu. */
let version = 0;
const listeners = new Set<() => void>();

export function getStoreState(): StoreState {
  if (!state) state = load();
  return state;
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function emit() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Áp dụng thay đổi lên store (dùng cho mọi mutation).
 * Phase 2: thay bằng POST/PUT/DELETE tới FastAPI rồi refetch.
 */
export function mutate(mutator: (s: StoreState) => Partial<StoreState> | void): void {
  const s = getStoreState();
  const patch = mutator(s);
  if (patch) state = { ...s, ...patch };
  version += 1;
  if (typeof window !== "undefined") persist();
  emit();
}

/** Khôi phục dữ liệu demo. */
export function resetStore(): void {
  state = seed();
  version += 1;
  if (typeof window !== "undefined") persist();
  emit();
}

function getVersion(): number {
  return version;
}

/**
 * Hook: trả về version hiện tại của store. Dùng làm dependency để
 * fetch lại dữ liệu async mỗi khi có mutation (kể cả từ trang Admin).
 */
export function useStoreVersion(): number {
  return useSyncExternalStore(subscribe, getVersion, () => 0);
}

/** Đọc snapshot hiện tại (cho component cần render đồng bộ). */
export function useStoreState(): StoreState {
  return useSyncExternalStore(subscribe, getStoreState, seed);
}
