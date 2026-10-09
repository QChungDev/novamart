"use client";

import Link from "next/link";
import { ArrowRight, MapPin, Package, Wallet } from "lucide-react";
import { useAuth } from "@/lib/store/auth-store";
import { adminActions, useAdminData } from "@/lib/services/admin";
import { formatVND, formatDate } from "@/lib/format";
import { OrderStatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import type { Order } from "@/lib/types";

export default function AccountOverviewPage() {
  const { user } = useAuth();
  const { data } = useAdminData(() => adminActions.getOrders({ pageSize: 100 }), [user?.id]);
  const orders: Order[] = data?.items ?? [];

  const myOrders = orders;
  const totalSpent = myOrders
    .filter((o) => o.status !== "cancelled")
    .reduce((s, o) => s + o.total, 0);
  const recent = myOrders.slice(0, 3);

  const stats = [
    { icon: Package, label: "Tổng đơn hàng", value: String(myOrders.length) },
    { icon: Wallet, label: "Tổng chi tiêu", value: formatVND(totalSpent) },
    { icon: MapPin, label: "Địa chỉ đã lưu", value: "—" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-ink-900">
        Xin chào, {user?.name}! 👋
      </h1>
      <p className="mt-1 text-sm text-ink-500">
        Quản lý thông tin cá nhân, địa chỉ và theo dõi đơn hàng của bạn tại đây.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-100 bg-white p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <s.icon className="h-5 w-5" />
            </span>
            <p className="mt-3 text-xl font-extrabold text-ink-900">{s.value}</p>
            <p className="text-xs text-ink-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink-900">Đơn hàng gần đây</h2>
          <Link
            href="/account/orders"
            className="flex items-center gap-1 text-sm font-bold text-brand-700 hover:underline"
          >
            Xem tất cả <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {recent.length === 0 ? (
          <EmptyState
            title="Bạn chưa có đơn hàng nào"
            description="Các đơn hàng bạn đặt tại NovaMart sẽ hiển thị ở đây."
            action={
              <Link
                href="/products"
                className="inline-flex h-10 items-center rounded-xl bg-brand-600 px-5 text-sm font-bold text-white hover:bg-brand-700"
              >
                Mua sắm ngay
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {recent.map((o) => (
              <Link
                key={o.id}
                href={`/account/orders/${o.id}`}
                className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-4 transition-shadow hover:shadow-md"
              >
                <div>
                  <p className="text-sm font-bold text-ink-900">{o.code}</p>
                  <p className="mt-0.5 text-xs text-ink-400">
                    {formatDate(o.createdAt)} · {o.items.length} sản phẩm
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-extrabold text-brand-700">{formatVND(o.total)}</p>
                  <OrderStatusBadge status={o.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
