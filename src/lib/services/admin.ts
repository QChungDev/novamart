"use client";

/**
 * Admin prototype store (Phase 1).
 * In-memory state seeded from mock data and persisted to localStorage.
 * In Phase 2 every action here becomes a FastAPI call.
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
  stockMovements as seedMovements,
} from "../mock-data";
import type {
  Category,
  Coupon,
  Customer,
  DashboardSummary,
  Order,
  OrderStatus,
  Product,
  StockMovement,
  StoreSettings,
} from "../types";

export interface AdminState {
  products: Product[];
  categories: Category[];
  orders: Order[];
  coupons: Coupon[];
  customers: Customer[];
  movements: StockMovement[];
  settings: StoreSettings;
}

const STORAGE_KEY = "novamart-admin-v1";

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function deepCopy<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function seed(): AdminState {
  return {
    products: deepCopy(seedProducts),
    categories: deepCopy(seedCategories),
    orders: deepCopy(seedOrders),
    coupons: deepCopy(seedCoupons),
    customers: deepCopy(seedCustomers),
    movements: deepCopy(seedMovements),
    settings: deepCopy(defaultSettings),
  };
}

let state: AdminState | null = null;
const listeners = new Set<() => void>();

function load(): AdminState {
  if (typeof window === "undefined") return seed();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AdminState;
      if (parsed.products && parsed.orders) return parsed;
    }
  } catch {
    /* ignore */
  }
  return seed();
}

function getState(): AdminState {
  if (!state) state = load();
  return state;
}

function emit() {
  for (const l of listeners) l();
}

function setState(patch: Partial<AdminState>) {
  state = { ...getState(), ...patch };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): AdminState {
  return getState();
}

// Đọc state hiện tại (hữu ích cho test/debug). Component nên dùng useAdmin().
export function getAdminState(): AdminState {
  return getSnapshot();
}

/* --------------------------------- Actions ---------------------------------- */

export const adminActions = {
  saveProduct(p: Product) {
    const products = getState().products;
    const exists = products.some((x) => x.id === p.id);
    setState({
      products: exists
        ? products.map((x) => (x.id === p.id ? p : x))
        : [{ ...p, id: p.id || uid("p") }, ...products],
    });
  },

  deleteProduct(id: string) {
    setState({ products: getState().products.filter((p) => p.id !== id) });
  },

  saveCategory(c: Category) {
    const categories = getState().categories;
    const exists = categories.some((x) => x.id === c.id);
    setState({
      categories: exists
        ? categories.map((x) => (x.id === c.id ? c : x))
        : [{ ...c, id: c.id || uid("c") }, ...categories],
    });
  },

  deleteCategory(id: string) {
    const s = getState();
    setState({
      categories: s.categories.filter((c) => c.id !== id),
      products: s.products.map((p) =>
        p.categoryId === id ? { ...p, categoryId: "" } : p,
      ),
    });
  },

  createOrder(order: Order) {
    setState({ orders: [{ ...order, id: order.id || uid("o") }, ...getState().orders] });
  },

  updateOrderStatus(id: string, status: OrderStatus, note?: string) {
    setState({
      orders: getState().orders.map((o) =>
        o.id === id
          ? {
              ...o,
              status,
              timeline: [...o.timeline, { status, at: new Date().toISOString(), note }],
            }
          : o,
      ),
    });
  },

  saveCoupon(c: Coupon) {
    const coupons = getState().coupons;
    const exists = coupons.some((x) => x.id === c.id);
    setState({
      coupons: exists
        ? coupons.map((x) => (x.id === c.id ? c : x))
        : [{ ...c, id: c.id || uid("cp") }, ...coupons],
    });
  },

  deleteCoupon(id: string) {
    setState({ coupons: getState().coupons.filter((c) => c.id !== id) });
  },

  setCustomerStatus(id: string, status: Customer["status"]) {
    setState({
      customers: getState().customers.map((c) =>
        c.id === id ? { ...c, status } : c,
      ),
    });
  },

  /** Receive new stock (+) for a product. */
  receiveStock(productId: string, quantity: number, reason: string) {
    const s = getState();
    const movement: StockMovement = {
      id: uid("sm"),
      productId,
      type: "in",
      quantity: Math.abs(quantity),
      reason,
      createdAt: new Date().toISOString(),
      createdBy: "admin",
    };
    setState({
      movements: [movement, ...s.movements],
      products: s.products.map((p) =>
        p.id === productId ? { ...p, stock: p.stock + Math.abs(quantity) } : p,
      ),
    });
  },

  /** Adjust stock to an absolute value (records the delta). */
  adjustStock(productId: string, newStock: number, reason: string) {
    const s = getState();
    const product = s.products.find((p) => p.id === productId);
    if (!product) return;
    const delta = newStock - product.stock;
    if (delta === 0) return;
    const movement: StockMovement = {
      id: uid("sm"),
      productId,
      type: "adjust",
      quantity: delta,
      reason,
      createdAt: new Date().toISOString(),
      createdBy: "admin",
    };
    setState({
      movements: [movement, ...s.movements],
      products: s.products.map((p) =>
        p.id === productId ? { ...p, stock: newStock } : p,
      ),
    });
  },

  updateSettings(patch: Partial<StoreSettings>) {
    setState({ settings: { ...getState().settings, ...patch } });
  },

  resetDemo() {
    state = seed();
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
    emit();
  },
};

/* -------------------------------- Dashboard ---------------------------------- */

export function computeDashboard(s: AdminState): DashboardSummary {
  const revenue = s.orders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + o.total, 0);
  const lowStock = s.products.filter((p) => p.stock <= 10).length;
  const recentOrders = [...s.orders]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 6);
  const bestSellers = [...s.products].sort((a, b) => b.sold - a.sold).slice(0, 5);

  const statuses: OrderStatus[] = ["pending", "confirmed", "shipping", "delivered", "cancelled"];
  const statusDistribution = statuses.map((status) => ({
    status,
    count: s.orders.filter((o) => o.status === status).length,
  }));

  const prevRevenue = seedDailyRevenue
    .slice(0, 7)
    .reduce((sum, d) => sum + d.revenue, 0);
  const curRevenue = seedDailyRevenue
    .slice(7)
    .reduce((sum, d) => sum + d.revenue, 0);

  return {
    revenue,
    revenueChange: prevRevenue ? ((curRevenue - prevRevenue) / prevRevenue) * 100 : 0,
    orders: s.orders.length,
    ordersChange: 12.5,
    products: s.products.length,
    lowStock,
    dailyRevenue: seedDailyRevenue,
    statusDistribution,
    recentOrders,
    bestSellers,
  };
}

/* ---------------------------------- Hook ------------------------------------- */

export function useAdmin() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { state, actions: adminActions, dashboard: computeDashboard(state) };
}
