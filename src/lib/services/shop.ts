/**
 * Shop service — async data access for the storefront.
 *
 * Điểm 2 (review): mọi hàm đều async (Promise) để chuẩn bị cho Phase 2,
 * khi ruột các hàm này đổi thành fetch() tới FastAPI mà call sites giữ nguyên.
 * Phase 1 đọc từ unified store (đồng bộ với những gì Admin sửa).
 */

import { getStoreState } from "../data/store";
import type { Category, Product, Review } from "../types";

export type ProductSort =
  | "popular"
  | "price-asc"
  | "price-desc"
  | "newest"
  | "rating";

export interface ProductFilter {
  q?: string;
  categorySlug?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  onSaleOnly?: boolean;
  sort?: ProductSort;
  page?: number;
  pageSize?: number;
}

/** Price the customer actually pays (sale price wins). */
export function effectivePrice(p: Product): number {
  return p.salePrice ?? p.price;
}

export function discountPercent(p: Product): number {
  if (!p.salePrice) return 0;
  return Math.round((1 - p.salePrice / p.price) * 100);
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function activeProducts(): Product[] {
  return getStoreState().products.filter((p) => p.status === "active");
}

export const shopService = {
  async getCategories(): Promise<Category[]> {
    return getStoreState().categories;
  },

  async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    return getStoreState().categories.find((c) => c.slug === slug);
  },

  async getCategoryById(id: string): Promise<Category | undefined> {
    return getStoreState().categories.find((c) => c.id === id);
  },

  async getProducts(
    filter: ProductFilter = {},
  ): Promise<{ items: Product[]; total: number }> {
    const {
      q,
      categorySlug,
      minPrice,
      maxPrice,
      inStockOnly,
      onSaleOnly,
      sort = "popular",
      page = 1,
      pageSize = 12,
    } = filter;

    const s = getStoreState();
    let items = s.products.filter((p) => p.status === "active");

    if (categorySlug) {
      const cat = s.categories.find((c) => c.slug === categorySlug);
      if (cat) items = items.filter((p) => p.categoryId === cat.id);
    }
    if (q?.trim()) {
      const needle = normalize(q.trim());
      items = items.filter(
        (p) =>
          normalize(p.name).includes(needle) ||
          normalize(p.sku).includes(needle) ||
          p.tags.some((t) => normalize(t).includes(needle)),
      );
    }
    if (minPrice !== undefined) items = items.filter((p) => effectivePrice(p) >= minPrice);
    if (maxPrice !== undefined) items = items.filter((p) => effectivePrice(p) <= maxPrice);
    if (inStockOnly) items = items.filter((p) => p.stock > 0);
    if (onSaleOnly) items = items.filter((p) => p.salePrice !== undefined);

    const sorted = [...items];
    switch (sort) {
      case "price-asc":
        sorted.sort((a, b) => effectivePrice(a) - effectivePrice(b));
        break;
      case "price-desc":
        sorted.sort((a, b) => effectivePrice(b) - effectivePrice(a));
        break;
      case "newest":
        sorted.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
        break;
      case "rating":
        sorted.sort((a, b) => b.rating - a.rating);
        break;
      case "popular":
      default:
        sorted.sort((a, b) => b.sold - a.sold);
    }

    const total = sorted.length;
    const start = (page - 1) * pageSize;
    return { items: sorted.slice(start, start + pageSize), total };
  },

  async getProductBySlug(slug: string): Promise<Product | undefined> {
    return getStoreState().products.find((p) => p.slug === slug && p.status === "active");
  },

  async getProductById(id: string): Promise<Product | undefined> {
    return getStoreState().products.find((p) => p.id === id);
  },

  async getRelated(product: Product, limit = 4): Promise<Product[]> {
    return getStoreState()
      .products.filter(
        (p) =>
          p.id !== product.id &&
          p.status === "active" &&
          (p.categoryId === product.categoryId ||
            p.tags.some((t) => product.tags.includes(t))),
      )
      .slice(0, limit);
  },

  async getFeatured(limit = 8): Promise<Product[]> {
    return getStoreState()
      .products.filter((p) => p.isFeatured && p.status === "active")
      .slice(0, limit);
  },

  async getBestSellers(limit = 8): Promise<Product[]> {
    return [...getStoreState().products]
      .filter((p) => p.status === "active")
      .sort((a, b) => b.sold - a.sold)
      .slice(0, limit);
  },

  async getNewArrivals(limit = 8): Promise<Product[]> {
    return [...getStoreState().products]
      .filter((p) => p.status === "active")
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .slice(0, limit);
  },

  async getReviews(productId: string): Promise<Review[]> {
    return getStoreState().reviews.filter((r) => r.productId === productId);
  },

  /** Max price across catalog, used to bound the price filter UI. */
  async getPriceBounds(): Promise<{ min: number; max: number }> {
    const prices = activeProducts().map(effectivePrice);
    return { min: Math.min(...prices), max: Math.max(...prices) };
  },
};
