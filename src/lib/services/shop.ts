/**
 * Shop service — storefront data access via FastAPI backend.
 *
 * Phase 2: tất cả đọc từ /api/v1/*, không còn đọc localStorage.
 */

import { api } from "../api/client";
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
  featured?: boolean;
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

/* ------------------------- Backend <-> Frontend mapping ------------------------ */

interface ApiProduct {
  id: number;
  name: string;
  slug: string;
  sku: string;
  category_id: number | null;
  category_name: string | null;
  description: string;
  price: string | number;
  sale_price: string | number | null;
  effective_price: string | number;
  discount_percent: number;
  stock: number;
  sold: number;
  images: string[];
  specs: { label: string; value: string }[];
  tags: string[];
  rating: number;
  review_count: number;
  is_featured: boolean;
  status: string;
  created_at: string;
}

interface ApiCategory {
  id: number;
  name: string;
  slug: string;
  image: string;
  description: string;
  product_count: number;
}

interface ApiReview {
  id: number;
  product_id: number;
  author_name: string;
  rating: number;
  title: string;
  content: string;
  verified: boolean;
  created_at: string;
}

function toProduct(p: ApiProduct): Product {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    categoryId: p.category_id,
    price: Number(p.price),
    salePrice: p.sale_price != null ? Number(p.sale_price) : undefined,
    images: p.images || [],
    rating: p.rating,
    reviewCount: p.review_count,
    stock: p.stock,
    sold: p.sold,
    description: p.description,
    specs: p.specs || [],
    tags: p.tags || [],
    isFeatured: p.is_featured,
    isBestSeller: p.sold > 200,
    isNew:
      Date.now() - new Date(p.created_at).getTime() < 30 * 24 * 3600 * 1000,
    status: p.status as Product["status"],
    createdAt: p.created_at,
  };
}

function toCategory(c: ApiCategory): Category {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    image: c.image,
    description: c.description,
  };
}

function toReview(r: ApiReview): Review {
  return {
    id: r.id,
    productId: r.product_id,
    author: r.author_name,
    rating: r.rating,
    title: r.title,
    content: r.content,
    date: r.created_at,
    verified: r.verified,
  };
}

export const shopService = {
  async getCategories(): Promise<Category[]> {
    const data = await api.get<ApiCategory[]>("/api/v1/categories", { auth: false });
    return data.map(toCategory);
  },

  async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    try {
      const data = await api.get<ApiCategory>(`/api/v1/categories/${slug}`, { auth: false });
      return toCategory(data);
    } catch {
      return undefined;
    }
  },

  async getCategoryById(id: number): Promise<Category | undefined> {
    const categories = await this.getCategories();
    return categories.find((c) => c.id === id);
  },

  async getProducts(
    filter: ProductFilter = {},
  ): Promise<{ items: Product[]; total: number }> {
    const params = new URLSearchParams();
    if (filter.q) params.set("q", filter.q);
    if (filter.categorySlug) params.set("category", filter.categorySlug);
    if (filter.minPrice !== undefined) params.set("min_price", String(filter.minPrice));
    if (filter.maxPrice !== undefined) params.set("max_price", String(filter.maxPrice));
    if (filter.inStockOnly) params.set("in_stock", "true");
    if (filter.onSaleOnly) params.set("on_sale", "true");
    if (filter.featured) params.set("featured", "true");
    if (filter.sort) params.set("sort", filter.sort);
    params.set("page", String(filter.page ?? 1));
    params.set("page_size", String(filter.pageSize ?? 12));

    const data = await api.get<{ items: ApiProduct[]; total: number }>(
      `/api/v1/products?${params.toString()}`,
      { auth: false },
    );
    return { items: data.items.map(toProduct), total: data.total };
  },

  async getProductBySlug(slug: string): Promise<Product | undefined> {
    try {
      const data = await api.get<ApiProduct>(
        `/api/v1/products/${encodeURIComponent(slug)}`,
        { auth: false },
      );
      return toProduct(data);
    } catch {
      return undefined;
    }
  },

  async getProductById(id: number): Promise<Product | undefined> {
    // Backend lookup by slug is primary; fall back to search for admin flows.
    const { items } = await this.getProducts({ pageSize: 100 });
    return items.find((p) => p.id === id);
  },

  async getRelated(product: Product, limit = 4): Promise<Product[]> {
    try {
      const data = await api.get<ApiProduct[]>(
        `/api/v1/products/${product.id}/related?limit=${limit}`,
        { auth: false },
      );
      return data.map(toProduct);
    } catch {
      return [];
    }
  },

  async getFeatured(limit = 8): Promise<Product[]> {
    const { items } = await this.getProducts({ featured: true, pageSize: limit });
    return items;
  },

  async getBestSellers(limit = 8): Promise<Product[]> {
    const { items } = await this.getProducts({ sort: "popular", pageSize: limit });
    return items;
  },

  async getNewArrivals(limit = 8): Promise<Product[]> {
    const { items } = await this.getProducts({ sort: "newest", pageSize: limit });
    return items;
  },

  async getReviews(productId: number): Promise<Review[]> {
    const data = await api.get<ApiReview[]>(
      `/api/v1/products/${productId}/reviews`,
      { auth: false },
    );
    return data.map(toReview);
  },

  async addReview(
    productId: number,
    input: { rating: number; title: string; content: string },
  ): Promise<Review> {
    const data = await api.post<ApiReview>(
      `/api/v1/products/${productId}/reviews`,
      input,
    );
    return toReview(data);
  },

  /** Max price across catalog, used to bound the price filter UI. */
  async getPriceBounds(): Promise<{ min: number; max: number }> {
    const data = await api.get<{ min: number; max: number }>(
      "/api/v1/products/price-bounds",
      { auth: false },
    );
    return data;
  },
};
