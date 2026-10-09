"use client";

/**
 * Admin service — mutations/queries via FastAPI backend (admin endpoints).
 *
 * Phase 2: tất cả qua /api/v1/* với JWT admin. Không còn localStorage.
 */

import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import type {
  Address,
  Category,
  Coupon,
  Customer,
  DashboardSummary,
  Order,
  OrderStatus,
  Product,
  StockMovement,
} from "../types";

/* ------------------------------- Mappers ------------------------------------ */

function toProduct(p: Record<string, unknown>): Product {
  return {
    id: p.id as number,
    name: p.name as string,
    slug: p.slug as string,
    sku: p.sku as string,
    categoryId: (p.category_id as number | null) ?? null,
    price: Number(p.price),
    salePrice: p.sale_price != null ? Number(p.sale_price) : undefined,
    images: (p.images as string[]) || [],
    rating: p.rating as number,
    reviewCount: p.review_count as number,
    stock: p.stock as number,
    sold: p.sold as number,
    description: p.description as string,
    specs: (p.specs as { label: string; value: string }[]) || [],
    tags: (p.tags as string[]) || [],
    isFeatured: p.is_featured as boolean,
    status: p.status as Product["status"],
    createdAt: p.created_at as string,
  };
}

function toCategory(c: Record<string, unknown>): Category {
  return {
    id: c.id as number,
    name: c.name as string,
    slug: c.slug as string,
    image: c.image as string,
    description: c.description as string,
  };
}

function toOrder(o: Record<string, unknown>): Order {
  const items = (o.items as Record<string, unknown>[]).map((i) => ({
    productId: i.product_id as number,
    name: i.name as string,
    image: i.image as string,
    price: Number(i.price),
    quantity: i.quantity as number,
  }));
  const timeline = (o.timeline as Record<string, unknown>[]).map((t) => ({
    status: t.status as OrderStatus,
    at: t.created_at as string,
    note: t.note as string | undefined,
  }));
  return {
    id: o.id as number,
    code: o.code as string,
    customerId: (o as { user_id?: number }).user_id,
    customerName: o.customer_name as string,
    phone: o.phone as string,
    email: o.email as string,
    street: o.street as string,
    district: o.district as string,
    city: o.city as string,
    note: o.note as string,
    items,
    subtotal: Number(o.subtotal),
    shippingFee: Number(o.shipping_fee),
    discount: Number(o.discount),
    total: Number(o.total),
    couponCode: (o.coupon_code as string) || undefined,
    status: o.status as OrderStatus,
    paymentMethod: o.payment_method as Order["paymentMethod"],
    shippingMethod: o.shipping_method as Order["shippingMethod"],
    createdAt: o.created_at as string,
    timeline,
  };
}

function toCoupon(c: Record<string, unknown>): Coupon {
  const status = (c.is_active as boolean) ? "active" : "inactive";
  return {
    id: c.id as number,
    code: c.code as string,
    description: c.description as string,
    type: c.type as Coupon["type"],
    value: Number(c.value),
    minOrder: Number(c.min_order),
    usageLimit: c.usage_limit as number,
    used: c.used as number,
    startDate: c.start_date as string,
    endDate: c.end_date as string,
    status: status as Coupon["status"],
  };
}

function toCustomer(u: Record<string, unknown>): Customer {
  return {
    id: u.id as number,
    name: u.name as string,
    email: u.email as string,
    phone: (u.phone as string) || "",
    city: "",
    totalOrders: (u.total_orders as number) || 0,
    totalSpent: (u.total_spent as number) || 0,
    joinedAt: u.created_at as string,
    status: (u.is_active as boolean) ? "active" : "blocked",
  };
}

function toMovement(m: Record<string, unknown>): StockMovement {
  return {
    id: m.id as number,
    productId: m.product_id as number,
    type: m.type as StockMovement["type"],
    quantity: m.quantity as number,
    reason: m.reason as string,
    createdAt: m.created_at as string,
    createdBy: m.created_by as string,
  };
}

/* --------------------------------- Actions ---------------------------------- */

function productPayload(p: Product): Record<string, unknown> {
  return {
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    category_id: p.categoryId,
    description: p.description,
    price: p.price,
    sale_price: p.salePrice ?? null,
    stock: p.stock,
    images: p.images,
    specs: p.specs,
    tags: p.tags,
    is_featured: p.isFeatured,
    status: p.status,
  };
}

export const adminActions = {
  async saveProduct(p: Product): Promise<Product> {
    if (p.id) {
      const data = await api.patch<Record<string, unknown>>(
        `/api/v1/products/${p.id}`,
        productPayload(p),
      );
      return toProduct(data);
    }
    const data = await api.post<Record<string, unknown>>(
      "/api/v1/products",
      productPayload(p),
    );
    return toProduct(data);
  },

  async deleteProduct(id: number): Promise<void> {
    await api.delete(`/api/v1/products/${id}`);
  },

  async saveCategory(c: Category): Promise<Category> {
    const payload = {
      name: c.name,
      slug: c.slug,
      image: c.image,
      description: c.description,
    };
    if (c.id) {
      const data = await api.patch<Record<string, unknown>>(
        `/api/v1/categories/${c.id}`,
        payload,
      );
      return toCategory(data);
    }
    const data = await api.post<Record<string, unknown>>("/api/v1/categories", payload);
    return toCategory(data);
  },

  async deleteCategory(id: number): Promise<void> {
    await api.delete(`/api/v1/categories/${id}`);
  },

  async updateOrderStatus(id: number, status: OrderStatus, note?: string): Promise<Order> {
    const data = await api.patch<Record<string, unknown>>(
      `/api/v1/orders/${id}/status`,
      { status, note: note || "" },
    );
    return toOrder(data);
  },

  async saveCoupon(c: Coupon): Promise<Coupon> {
    const payload = {
      code: c.code.toUpperCase(),
      description: c.description,
      type: c.type,
      value: c.value,
      min_order: c.minOrder,
      usage_limit: c.usageLimit,
      start_date: c.startDate,
      end_date: c.endDate,
      is_active: c.status === "active",
    };
    if (c.id) {
      const data = await api.patch<Record<string, unknown>>(
        `/api/v1/coupons/${c.id}`,
        payload,
      );
      return toCoupon(data);
    }
    const data = await api.post<Record<string, unknown>>("/api/v1/coupons", payload);
    return toCoupon(data);
  },

  async deleteCoupon(id: number): Promise<void> {
    await api.delete(`/api/v1/coupons/${id}`);
  },

  async setCustomerStatus(id: number, status: Customer["status"]): Promise<void> {
    await api.patch(`/api/v1/users/${id}`, { is_active: status === "active" });
  },

  async receiveStock(productId: number, quantity: number, reason: string): Promise<void> {
    await api.post("/api/v1/inventory/receive", {
      product_id: productId,
      quantity: Math.abs(quantity),
      reason,
    });
  },

  async adjustStock(productId: number, newStock: number, reason: string): Promise<void> {
    await api.post("/api/v1/inventory/adjust", {
      product_id: productId,
      new_stock: newStock,
      reason,
    });
  },

  /* ------------------------------- Read-only -------------------------------- */

  async getProducts(): Promise<Product[]> {
    const data = await api.get<{ items: Record<string, unknown>[] }>(
      "/api/v1/products?page_size=100&sort=newest",
    );
    return data.items.map(toProduct);
  },

  async getProductById(id: number): Promise<Product | undefined> {
    const products = await this.getProducts();
    return products.find((p) => p.id === id);
  },

  async getCategories(): Promise<Category[]> {
    const data = await api.get<Record<string, unknown>[]>("/api/v1/categories");
    return data.map(toCategory);
  },

  async getOrders(params?: {
    status?: string;
    q?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: Order[]; total: number }> {
    const sp = new URLSearchParams();
    if (params?.status) sp.set("status", params.status);
    if (params?.q) sp.set("q", params.q);
    sp.set("page", String(params?.page ?? 1));
    sp.set("page_size", String(params?.pageSize ?? 50));
    const data = await api.get<{ items: Record<string, unknown>[]; total: number }>(
      `/api/v1/orders?${sp.toString()}`,
    );
    return { items: data.items.map(toOrder), total: data.total };
  },

  async getOrderByCode(code: string): Promise<Order> {
    const data = await api.get<Record<string, unknown>>(
      `/api/v1/orders/${encodeURIComponent(code)}`,
    );
    return toOrder(data);
  },

  async getCoupons(): Promise<Coupon[]> {
    const data = await api.get<{ items: Record<string, unknown>[] }>(
      "/api/v1/coupons?page_size=100",
    );
    return data.items.map(toCoupon);
  },

  async getCustomers(params?: { q?: string; page?: number }): Promise<{ items: Customer[]; total: number }> {
    const sp = new URLSearchParams();
    if (params?.q) sp.set("q", params.q);
    sp.set("page", String(params?.page ?? 1));
    sp.set("page_size", "50");
    const data = await api.get<{ items: Record<string, unknown>[]; total: number }>(
      `/api/v1/users?${sp.toString()}`,
    );
    return { items: data.items.map(toCustomer), total: data.total };
  },

  async getMovements(productId?: number): Promise<StockMovement[]> {
    const sp = new URLSearchParams();
    if (productId) sp.set("product_id", String(productId));
    sp.set("page_size", "100");
    const data = await api.get<{ items: Record<string, unknown>[] }>(
      `/api/v1/inventory/movements?${sp.toString()}`,
    );
    return data.items.map(toMovement);
  },

  async getStockLevels(params?: {
    lowOnly?: boolean;
    q?: string;
  }): Promise<{ productId: number; stock: number }[]> {
    const sp = new URLSearchParams();
    if (params?.lowOnly) sp.set("low_only", "true");
    if (params?.q) sp.set("q", params.q);
    sp.set("page_size", "100");
    const data = await api.get<{ items: { product_id: number; stock: number }[] }>(
      `/api/v1/inventory/stock?${sp.toString()}`,
    );
    return data.items.map((i) => ({ productId: i.product_id, stock: i.stock }));
  },

  async getDashboard(): Promise<DashboardSummary> {
    const data = await api.get<Record<string, unknown>>("/api/v1/dashboard/summary");
    const items = (k: string) => (data[k] as Record<string, unknown>[]) || [];
    return {
      revenue: Number(data.revenue),
      revenueChange: Number(data.revenue_change_percent),
      orders: data.orders as number,
      ordersChange: Number(data.orders_change_percent),
      products: data.products as number,
      lowStock: data.low_stock as number,
      dailyRevenue: items("daily_revenue").map((d) => ({
        date: d.date as string,
        revenue: Number(d.revenue),
        orders: d.orders as number,
      })),
      statusDistribution: items("status_distribution").map((s) => ({
        status: s.status as OrderStatus,
        count: s.count as number,
      })),
      recentOrders: items("recent_orders").map((o) => toOrder({
        ...o,
        items: [],
        timeline: [],
        subtotal: 0,
        shipping_fee: 0,
        discount: 0,
        customer_name: o.customer_name,
        phone: "",
        email: "",
        street: "",
        district: "",
        city: "",
        note: "",
        payment_method: "cod",
        shipping_method: "standard",
        created_at: o.created_at,
      })),
      bestSellers: [],
    };
  },

  async validateCoupon(code: string, subtotal: number): Promise<{ ok: boolean; discount: number; error?: string }> {
    const data = await api.post<{ ok: boolean; discount: string | number; error?: string }>(
      "/api/v1/coupons/validate",
      { code, subtotal },
      { auth: false },
    );
    return { ok: data.ok, discount: Number(data.discount), error: data.error };
  },

  /* ------------------------------- Addresses -------------------------------- */

  async getAddresses(): Promise<Address[]> {
    const data = await api.get<Record<string, unknown>[]>("/api/v1/users/me/addresses");
    return data.map((a) => ({
      id: a.id as number,
      label: a.label as string,
      receiver: a.receiver as string,
      phone: a.phone as string,
      street: a.street as string,
      district: a.district as string,
      city: a.city as string,
      isDefault: a.is_default as boolean,
    }));
  },

  async saveAddress(a: Partial<Address> & { id?: number }): Promise<Address> {
    const payload = {
      label: a.label,
      receiver: a.receiver,
      phone: a.phone,
      street: a.street,
      district: a.district,
      city: a.city,
      is_default: a.isDefault,
    };
    if (a.id) {
      const data = await api.patch<Record<string, unknown>>(
        `/api/v1/users/me/addresses/${a.id}`,
        payload,
      );
      return {
        id: data.id as number,
        label: data.label as string,
        receiver: data.receiver as string,
        phone: data.phone as string,
        street: data.street as string,
        district: data.district as string,
        city: data.city as string,
        isDefault: data.is_default as boolean,
      };
    }
    const data = await api.post<Record<string, unknown>>("/api/v1/users/me/addresses", payload);
    return {
      id: data.id as number,
      label: data.label as string,
      receiver: data.receiver as string,
      phone: data.phone as string,
      street: data.street as string,
      district: data.district as string,
      city: data.city as string,
      isDefault: data.is_default as boolean,
    };
  },

  async deleteAddress(id: number): Promise<void> {
    await api.delete(`/api/v1/users/me/addresses/${id}`);
  },
};

/* ---------------------------------- Hook ------------------------------------- */

/** Reactive admin data — refetch on demand. */
export function useAdminData<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
): { data: T | null; loading: boolean; error: string | null; reload: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    fetcher()
      .then((d) => {
        if (alive) {
          setData(d);
          setLoading(false);
        }
      })
      .catch((e: Error) => {
        if (alive) {
          setError(e.message || "Tải dữ liệu thất bại.");
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce, ...deps]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, loading, error, reload };
}
