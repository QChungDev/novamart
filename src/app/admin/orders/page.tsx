"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { useAdmin } from "@/lib/services/admin";
import { formatVND, formatDate } from "@/lib/format";
import { OrderStatusBadge, paymentMethodLabel } from "@/components/ui/badge";
import { DataTable, Pagination, Tabs, type Column } from "@/components/ui/data";
import { EmptyState } from "@/components/ui/feedback";
import type { Order, OrderStatus } from "@/lib/types";

type Tab = "all" | OrderStatus;
const PAGE_SIZE = 10;

export default function AdminOrdersPage() {
  const { state } = useAdmin();
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return state.orders.filter((o) => {
      if (tab !== "all" && o.status !== tab) return false;
      if (needle && !`${o.code} ${o.customerName} ${o.phone}`.toLowerCase().includes(needle))
        return false;
      return true;
    });
  }, [state.orders, tab, q]);

  const countFor = (t: Tab) =>
    t === "all" ? state.orders.length : state.orders.filter((o) => o.status === t).length;

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns: Column<Order>[] = [
    {
      key: "code",
      header: "Mã đơn",
      render: (o) => (
        <Link href={`/admin/orders/${o.id}`} className="font-bold text-brand-700 hover:underline">
          {o.code}
        </Link>
      ),
    },
    {
      key: "customer",
      header: "Khách hàng",
      render: (o) => (
        <span>
          <span className="block font-semibold text-ink-900">{o.customerName}</span>
          <span className="text-xs text-ink-400">{o.phone}</span>
        </span>
      ),
    },
    {
      key: "items",
      header: "Sản phẩm",
      render: (o) => `${o.items.reduce((s, i) => s + i.quantity, 0)} món`,
    },
    {
      key: "total",
      header: "Tổng tiền",
      render: (o) => <span className="font-extrabold text-ink-900">{formatVND(o.total)}</span>,
    },
    {
      key: "payment",
      header: "Thanh toán",
      render: (o) => <span className="text-ink-500">{paymentMethodLabel(o.paymentMethod)}</span>,
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (o) => <OrderStatusBadge status={o.status} />,
    },
    {
      key: "createdAt",
      header: "Ngày đặt",
      render: (o) => <span className="text-ink-500">{formatDate(o.createdAt)}</span>,
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">Đơn hàng</h1>
        <p className="mt-1 text-sm text-ink-500">
          {state.orders.length} đơn hàng · cập nhật trạng thái demo
        </p>
      </div>

      <Tabs<Tab>
        value={tab}
        onChange={(t) => {
          setTab(t);
          setPage(1);
        }}
        tabs={[
          { value: "all", label: "Tất cả", count: countFor("all") },
          { value: "pending", label: "Chờ xác nhận", count: countFor("pending") },
          { value: "confirmed", label: "Đã xác nhận", count: countFor("confirmed") },
          { value: "shipping", label: "Đang giao", count: countFor("shipping") },
          { value: "delivered", label: "Đã giao", count: countFor("delivered") },
          { value: "cancelled", label: "Đã hủy", count: countFor("cancelled") },
        ]}
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Tìm theo mã đơn, tên khách hàng, số điện thoại..."
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Không có đơn hàng nào" description="Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm." />
      ) : (
        <>
          <DataTable columns={columns} data={pageItems} />
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
