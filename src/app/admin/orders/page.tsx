"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { adminActions, useAdminData } from "@/lib/services/admin";
import { formatVND, formatDate } from "@/lib/format";
import { OrderStatusBadge, paymentMethodLabel } from "@/components/ui/badge";
import { DataTable, Pagination, Tabs, type Column } from "@/components/ui/data";
import { EmptyState } from "@/components/ui/feedback";
import type { Order, OrderStatus } from "@/lib/types";

type Tab = "all" | OrderStatus;
const PAGE_SIZE = 10;

export default function AdminOrdersPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const { data } = useAdminData(
    () => adminActions.getOrders({ status: tab === "all" ? undefined : tab, q, page, pageSize: PAGE_SIZE }),
    [tab, q, page],
  );
  const filtered = data?.items ?? [];
  const total = data?.total ?? 0;

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const pageItems = filtered;

  const columns: Column<Order>[] = [
    {
      key: "code",
      header: "Mã đơn",
      render: (o) => (
        <Link href={`/admin/orders/${o.code}`} className="font-bold text-brand-700 hover:underline">
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
          {total} đơn hàng
        </p>
      </div>

      <Tabs<Tab>
        value={tab}
        onChange={(t) => {
          setTab(t);
          setPage(1);
        }}
        tabs={[
          { value: "all", label: "Tất cả" },
          { value: "pending", label: "Chờ xác nhận" },
          { value: "confirmed", label: "Đã xác nhận" },
          { value: "shipping", label: "Đang giao" },
          { value: "delivered", label: "Đã giao" },
          { value: "cancelled", label: "Đã hủy" },
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
