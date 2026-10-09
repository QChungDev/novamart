/**
 * Shop service (Phase 1 prototype).
 * Pure functions over typed mock data. In Phase 2 these will call the
 * FastAPI backend — the signatures are designed to stay the same.
 */

import { categories, products, reviews } from "../mock-data";
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

export const shopService = {
  getCategories(): Category[] {
    return categories;
  },

  getCategoryBySlug(slug: string): Category | undefined {
    return categories.find((c) => c.slug === slug);
  },

  getCategoryById(id: string): Category | undefined {
    return categories.find((c) => c.id === id);
  },

  getProducts(filter: ProductFilter = {}): { items: Product[]; total: number } {
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

    let items = products.filter((p) => p.status === "active");

    if (categorySlug) {
      const cat = categories.find((c) => c.slug === categorySlug);
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

  getProductBySlug(slug: string): Product | undefined {
    return products.find((p) => p.slug === slug && p.status === "active");
  },

  getProductById(id: string): Product | undefined {
    return products.find((p) => p.id === id);
  },

  getRelated(product: Product, limit = 4): Product[] {
    return products
      .filter(
        (p) =>
          p.id !== product.id &&
          p.status === "active" &&
          (p.categoryId === product.categoryId ||
            p.tags.some((t) => product.tags.includes(t))),
      )
      .slice(0, limit);
  },

  getFeatured(limit = 8): Product[] {
    return products.filter((p) => p.isFeatured && p.status === "active").slice(0, limit);
  },

  getBestSellers(limit = 8): Product[] {
    return [...products]
      .filter((p) => p.status === "active")
      .sort((a, b) => b.sold - a.sold)
      .slice(0, limit);
  },

  getNewArrivals(limit = 8): Product[] {
    return [...products]
      .filter((p) => p.status === "active")
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .slice(0, limit);
  },

  getReviews(productId: string): Review[] {
    return reviews.filter((r) => r.productId === productId);
  },

  /** Max price across catalog, used to bound the price filter UI. */
  getPriceBounds(): { min: number; max: number } {
    const prices = products.map(effectivePrice);
    return { min: Math.min(...prices), max: Math.max(...prices) };
  },
};
