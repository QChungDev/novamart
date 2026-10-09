"use client";

/**
 * Admin service — async mutations/queries over the unified store.
 *
 * Điểm 1 (review): dùng chung store với shop (src/lib/data/store.ts) nên
 * mọi thay đổi ở Admin hiện ngay ra cửa hàng.
 * Điểm 2 (review): mọi thao tác đều async (Promise) — Phase 2 đổi ruột
 * thành fetch() FastAPI mà không sửa call sites.
 * Điểm 3 (review): auth hiện tại chỉ là mô phỏng phía client; Phase 2 sẽ
 * xác thực + phân quyền ở backend trên từng API.
 */

import { getStoreState, mutate, resetStore, uid, useStoreState, useStoreVersion } from "../data/store";
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
import type { StoreState as StoreStateType } from "../data/store";

/* --------------------------------- Actions ---------------------------------- */

export const adminActions = {
  async saveProduct(p: Product): Promise<void> {
    mutate((s) => {
      const exists = s.products.some((x) => x.id === p.id);
      return {
        products: exists
          ? s.products.map((x) => (x.id === p.id ? p : x))
          : [{ ...p, id: p.id || uid("p") }, ...s.products],
      };
    });
  },

  async deleteProduct(id: string): Promise<void> {
    mutate((s) => ({ products: s.products.filter((p) => p.id !== id) }));
  },

  async saveCategory(c: Category): Promise<void> {
    mutate((s) => {
      const exists = s.categories.some((x) => x.id === c.id);
      return {
        categories: exists
          ? s.categories.map((x) => (x.id === c.id ? c : x))
          : [{ ...c, id: c.id || uid("c") }, ...s.categories],
      };
    });
  },

  async deleteCategory(id: string): Promise<void> {
    mutate((s) => ({
      categories: s.categories.filter((c) => c.id !== id),
      products: s.products.map((p) =>
        p.categoryId === id ? { ...p, categoryId: "" } : p,
      ),
    }));
  },

  async createOrder(order: Order): Promise<void> {
    mutate((s) => ({
      orders: [{ ...order, id: order.id || uid("o") }, ...s.orders],
    }));
  },

  async updateOrderStatus(id: string, status: OrderStatus, note?: string): Promise<void> {
    mutate((s) => ({
      orders: s.orders.map((o) =>
        o.id === id
          ? {
              ...o,
              status,
              timeline: [...o.timeline, { status, at: new Date().toISOString(), note }],
            }
          : o,
      ),
    }));
  },

  async saveCoupon(c: Coupon): Promise<void> {
    mutate((s) => {
      const exists = s.coupons.some((x) => x.id === c.id);
      return {
        coupons: exists
          ? s.coupons.map((x) => (x.id === c.id ? c : x))
          : [{ ...c, id: c.id || uid("cp") }, ...s.coupons],
      };
    });
  },

  async deleteCoupon(id: string): Promise<void> {
    mutate((s) => ({ coupons: s.coupons.filter((c) => c.id !== id) }));
  },

  async setCustomerStatus(id: string, status: Customer["status"]): Promise<void> {
    mutate((s) => ({
      customers: s.customers.map((c) => (c.id === id ? { ...c, status } : c)),
    }));
  },

  /** Receive new stock (+) for a product. */
  async receiveStock(productId: string, quantity: number, reason: string): Promise<void> {
    mutate((s) => {
      const movement: StockMovement = {
        id: uid("sm"),
        productId,
        type: "in",
        quantity: Math.abs(quantity),
        reason,
        createdAt: new Date().toISOString(),
        createdBy: "admin",
      };
      return {
        movements: [movement, ...s.movements],
        products: s.products.map((p) =>
          p.id === productId ? { ...p, stock: p.stock + Math.abs(quantity) } : p,
        ),
      };
    });
  },

  /** Adjust stock to an absolute value (records the delta). */
  async adjustStock(productId: string, newStock: number, reason: string): Promise<void> {
    mutate((s) => {
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
      return {
        movements: [movement, ...s.movements],
        products: s.products.map((p) =>
          p.id === productId ? { ...p, stock: newStock } : p,
        ),
      };
    });
  },

  async updateSettings(patch: Partial<StoreSettings>): Promise<void> {
    mutate((s) => ({ settings: { ...s.settings, ...patch } }));
  },

  async resetDemo(): Promise<void> {
    resetStore();
  },

  /* ------------------------------- Read-only -------------------------------- */

  async getProducts(): Promise<Product[]> {
    return getStoreState().products;
  },

  async getProductById(id: string): Promise<Product | undefined> {
    return getStoreState().products.find((p) => p.id === id);
  },

  async getCategories(): Promise<Category[]> {
    return getStoreState().categories;
  },

  async getOrders(): Promise<Order[]> {
    return getStoreState().orders;
  },

  async getOrderById(id: string): Promise<Order | undefined> {
    return getStoreState().orders.find((o) => o.id === id);
  },

  async getCoupons(): Promise<Coupon[]> {
    return getStoreState().coupons;
  },

  async getCustomers(): Promise<Customer[]> {
    return getStoreState().customers;
  },

  async getMovements(): Promise<StockMovement[]> {
    return getStoreState().movements;
  },

  async getSettings(): Promise<StoreSettings> {
    return getStoreState().settings;
  },

  async getDashboard(): Promise<DashboardSummary> {
    return computeDashboard(getStoreState());
  },
};

/* -------------------------------- Dashboard ---------------------------------- */

export function computeDashboard(s: StoreStateType): DashboardSummary {
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

  const prevRevenue = s.dailyRevenue.slice(0, 7).reduce((sum, d) => sum + d.revenue, 0);
  const curRevenue = s.dailyRevenue.slice(7).reduce((sum, d) => sum + d.revenue, 0);

  return {
    revenue,
    revenueChange: prevRevenue ? ((curRevenue - prevRevenue) / prevRevenue) * 100 : 0,
    orders: s.orders.length,
    ordersChange: 12.5,
    products: s.products.length,
    lowStock,
    dailyRevenue: s.dailyRevenue,
    statusDistribution,
    recentOrders,
    bestSellers,
  };
}

/* ---------------------------------- Hook ------------------------------------- */

/** Reactive admin state — re-renders on every store mutation. */
export function useAdmin() {
  const state = useStoreState();
  return { state, actions: adminActions, dashboard: computeDashboard(state) };
}

/** Version counter — dùng để trigger fetch lại sau mutation. */
export { useStoreVersion };

/** Đọc state hiện tại (hữu ích cho test/debug). Component nên dùng useAdmin(). */
export function getAdminState(): StoreStateType {
  return getStoreState();
}
