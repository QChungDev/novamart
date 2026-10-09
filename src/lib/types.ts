/**
 * NovaMart domain types (Phase 1).
 * These interfaces mirror the future FastAPI/MySQL schema so the mock
 * service layer can be swapped for real API calls in Phase 2.
 */

/* ---------------------------------- Catalog --------------------------------- */

export interface Category {
  id: string;
  name: string;
  slug: string;
  image: string;
  description: string;
}

export type ProductStatus = "active" | "inactive";

export interface ProductSpec {
  label: string;
  value: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  categoryId: string;
  price: number; // VND
  salePrice?: number; // VND, when on sale
  images: string[];
  rating: number; // 0 - 5
  reviewCount: number;
  stock: number;
  sold: number;
  description: string;
  specs: ProductSpec[];
  tags: string[];
  isNew?: boolean;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  status: ProductStatus;
  createdAt: string; // ISO date
}

export interface Review {
  id: string;
  productId: string;
  author: string;
  rating: number;
  title: string;
  content: string;
  date: string; // ISO date
  verified: boolean;
}

/* ----------------------------------- Cart ----------------------------------- */

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface CartLine extends CartItem {
  product: Product;
  lineTotal: number;
}

/* ---------------------------------- Customer --------------------------------- */

export interface Address {
  id: string;
  label: string; // e.g. "Nhà riêng", "Công ty"
  receiver: string;
  phone: string;
  street: string;
  district: string;
  city: string;
  isDefault: boolean;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  totalOrders: number;
  totalSpent: number; // VND
  joinedAt: string; // ISO date
  status: "active" | "blocked";
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string;
}

/* ----------------------------------- Order ----------------------------------- */

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "shipping"
  | "delivered"
  | "cancelled";

export type PaymentMethod = "cod" | "demo_card" | "demo_wallet";
export type ShippingMethod = "standard" | "express";

export interface OrderItem {
  productId: string;
  name: string;
  image: string;
  price: number; // VND unit price at purchase time
  quantity: number;
}

export interface OrderTimelineStep {
  status: OrderStatus;
  at: string; // ISO date
  note?: string;
}

export interface Order {
  id: string;
  code: string; // e.g. NM-20261009-4F8K2
  customerId?: string;
  customerName: string;
  phone: string;
  email: string;
  street: string;
  district: string;
  city: string;
  note?: string;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  couponCode?: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  shippingMethod: ShippingMethod;
  createdAt: string; // ISO date
  timeline: OrderTimelineStep[];
}

/* ------------------------------- Promotions ---------------------------------- */

export type CouponType = "percent" | "fixed";

export interface Coupon {
  id: string;
  code: string;
  description: string;
  type: CouponType;
  value: number; // percent (0-100) or VND
  minOrder: number; // VND
  usageLimit: number;
  used: number;
  startDate: string; // ISO date
  endDate: string; // ISO date
  status: "active" | "inactive";
}

/* --------------------------------- Inventory --------------------------------- */

export type StockMovementType = "in" | "out" | "adjust";

export interface StockMovement {
  id: string;
  productId: string;
  type: StockMovementType;
  quantity: number; // signed: +in, -out
  reason: string;
  createdAt: string; // ISO date
  createdBy: string;
}

/* --------------------------------- Dashboard --------------------------------- */

export interface DailyRevenue {
  date: string; // dd/mm label
  revenue: number; // VND
  orders: number;
}

export interface OrderStatusCount {
  status: OrderStatus;
  count: number;
}

export interface DashboardSummary {
  revenue: number;
  revenueChange: number; // percent vs previous period
  orders: number;
  ordersChange: number;
  products: number;
  lowStock: number;
  dailyRevenue: DailyRevenue[];
  statusDistribution: OrderStatusCount[];
  recentOrders: Order[];
  bestSellers: Product[];
}

/* ---------------------------------- Settings --------------------------------- */

export interface StoreSettings {
  storeName: string;
  hotline: string;
  email: string;
  address: string;
  freeShippingThreshold: number; // VND
  standardShippingFee: number; // VND
  expressShippingFee: number; // VND
  announcement: string;
}
