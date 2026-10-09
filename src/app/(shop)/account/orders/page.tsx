"use client";

import Link from "next/link";
import { useState } from "react";
import { Package } from "lucide-react";
import { useAuth } from "@/lib/store/auth-store";
import { adminActions, useAdminData } from "@/lib/services/admin";
import { formatVND, formatDate } from "@/lib/format";
import { OrderStatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { Tabs } from "@/components/ui/data";
import type { Order, OrderStatus } from "@/lib/types";

type Tab = "all" | OrderStatus;

export default function AccountOrdersPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("all");
  const { data } = useAdminData(() => adminActions.getOrders({ pageSize: 100 }), [user?.id]);
  const myOrders: Order[] = data?.items ?? [];
  const filtered = tab === "all" ? myOrders : myOrders.filter((o) => o.status === tab);

  const countFor = (t: Tab) =>
    t === "all" ? myOrders.length : myOrders.filter((o) => o.status === t).length;

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-ink-900">Đơn hàng của tôi</h1>
      <p className="mt-1 text-sm text-ink-500">Theo dõi trạng thái các đơn hàng bạn đã đặt.</p>

      <div className="mt-5">
        <Tabs<Tab>
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "all", label: "Tất cả", count: countFor("all") },
            { value: "pending", label: "Chờ xác nhận", count: countFor("pending") },
            { value: "confirmed", label: "Đã xác nhận", count: countFor("confirmed") },
            { value: "shipping", label: "Đang giao", count: countFor("shipping") },
            { value: "delivered", label: "Đã giao", count: countFor("delivered") },
            { value: "cancelled", label: "Đã hủy", count: countFor("cancelled") },
          ]}
        />
      </div>

      <div className="mt-5">
        {filtered.length === 0 ? (
          <EmptyState
            title="Không có đơn hàng nào"
            description="Chưa có đơn hàng nào ở trạng thái này."
            icon={<Package className="h-7 w-7" />}
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((o) => (
              <Link
                key={o.id}
                href={`/account/orders/${o.code}`}
                className="block rounded-2xl border border-slate-100 bg-white p-4 transition-shadow hover:shadow-md md:p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-ink-900">{o.code}</p>
                    <p className="mt-0.5 text-xs text-ink-400">
                      Đặt ngày {formatDate(o.createdAt)} · {o.items.length} sản phẩm
                    </p>
                  </div>
                  <OrderStatusBadge status={o.status} />
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                  <p className="line-clamp-1 text-xs text-ink-500">
                    {o.items.map((i) => `${i.name} ×${i.quantity}`).join(" · ")}
                  </p>
                  <p className="ml-3 shrink-0 text-sm font-extrabold text-brand-700">
                    {formatVND(o.total)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
