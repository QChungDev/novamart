"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Package, ShoppingCart, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useAdmin } from "@/lib/services/admin";
import { formatVND, formatDate } from "@/lib/format";
import { OrderStatusBadge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/feedback";
import { cn } from "@/lib/utils";

const SalesChart = dynamic(
  () => import("@/components/admin/charts").then((m) => m.SalesChart),
  { ssr: false, loading: () => <Skeleton className="h-72 w-full" /> },
);
const OrderStatusChart = dynamic(
  () => import("@/components/admin/charts").then((m) => m.OrderStatusChart),
  { ssr: false, loading: () => <Skeleton className="h-52 w-full" /> },
);

export default function AdminDashboardPage() {
  const { state, dashboard } = useAdmin();

  const stats = [
    {
      icon: Wallet,
      label: "Tổng doanh thu",
      value: formatVND(dashboard.revenue),
      change: dashboard.revenueChange,
      hint: "so với 7 ngày trước",
    },
    {
      icon: ShoppingCart,
      label: "Tổng đơn hàng",
      value: String(dashboard.orders),
      change: dashboard.ordersChange,
      hint: "so với kỳ trước",
    },
    {
      icon: Package,
      label: "Tổng sản phẩm",
      value: String(dashboard.products),
      change: null,
      hint: "đang kinh doanh",
    },
    {
      icon: AlertTriangle,
      label: "Sắp hết hàng",
      value: String(dashboard.lowStock),
      change: null,
      hint: "tồn kho ≤ 10",
      alert: dashboard.lowStock > 0,
    },
  ];

  const lowStockProducts = state.products
    .filter((p) => p.stock <= 10)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">Tổng quan</h1>
        <p className="mt-1 text-sm text-ink-500">
          Số liệu mẫu của cửa hàng trong 14 ngày gần nhất.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl",
                  s.alert ? "bg-amber-50 text-amber-600" : "bg-brand-50 text-brand-700",
                )}
              >
                <s.icon className="h-5 w-5" />
              </span>
              {s.change !== null && s.change !== undefined && (
                <span
                  className={cn(
                    "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold",
                    s.change >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700",
                  )}
                >
                  {s.change >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {Math.abs(s.change).toFixed(1)}%
                </span>
              )}
            </div>
            <p className="mt-4 text-2xl font-extrabold text-ink-900">{s.value}</p>
            <p className="mt-1 text-xs text-ink-500">
              {s.label} · {s.hint}
            </p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-ink-900">Doanh thu 14 ngày qua</h2>
            <span className="text-xs text-ink-400">Đơn vị: đồng (₫)</span>
          </div>
          <SalesChart data={dashboard.dailyRevenue} />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-base font-bold text-ink-900">Trạng thái đơn hàng</h2>
          <OrderStatusChart data={dashboard.statusDistribution} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {/* Recent orders */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-ink-900">Đơn hàng gần đây</h2>
            <Link
              href="/admin/orders"
              className="flex items-center gap-1 text-sm font-bold text-brand-700 hover:underline"
            >
              Xem tất cả <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-2">
            {dashboard.recentOrders.map((o) => (
              <Link
                key={o.id}
                href={`/admin/orders/${o.id}`}
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink-900">{o.code}</p>
                  <p className="text-xs text-ink-400">
                    {o.customerName} · {formatDate(o.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <p className="text-sm font-extrabold text-ink-900">{formatVND(o.total)}</p>
                  <OrderStatusBadge status={o.status} />
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {/* Best sellers */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 text-base font-bold text-ink-900">Bán chạy nhất</h2>
            <ul className="space-y-3">
              {dashboard.bestSellers.map((p, i) => (
                <li key={p.id} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-extrabold text-ink-700">
                    {i + 1}
                  </span>
                  <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-50">
                    <Image src={p.images[0]} alt={p.name} fill sizes="40px" className="object-cover" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-1 block text-sm font-medium text-ink-900">
                      {p.name}
                    </span>
                    <span className="text-xs text-ink-400">Đã bán {p.sold}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Low stock */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
            <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-ink-900">
              <AlertTriangle className="h-4 w-4 text-amber-600" /> Sắp hết hàng
            </h2>
            {lowStockProducts.length === 0 ? (
              <p className="text-sm text-ink-500">Tồn kho ổn định.</p>
            ) : (
              <ul className="space-y-2">
                {lowStockProducts.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="line-clamp-1 font-medium text-ink-900 hover:text-brand-700"
                    >
                      {p.name}
                    </Link>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-xs font-bold",
                        p.stock === 0 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800",
                      )}
                    >
                      Còn {p.stock}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/admin/inventory"
              className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-brand-700 hover:underline"
            >
              Quản lý kho <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
