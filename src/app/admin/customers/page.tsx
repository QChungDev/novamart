"use client";

import { useState } from "react";
import { Ban, CheckCircle2, Search } from "lucide-react";
import { adminActions, useAdminData } from "@/lib/services/admin";
import { useToast } from "@/lib/store/toast-store";
import { formatVND, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/overlay";
import { DataTable, Pagination, type Column } from "@/components/ui/data";
import { EmptyState } from "@/components/ui/feedback";
import type { Customer } from "@/lib/types";

const PAGE_SIZE = 10;

export default function AdminCustomersPage() {
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const { data, reload } = useAdminData(() => adminActions.getCustomers({ q }), [q]);
  const allCustomers = data?.items ?? [];
  const [target, setTarget] = useState<Customer | null>(null);

  const totalPages = Math.ceil(allCustomers.length / PAGE_SIZE);
  const pageItems = allCustomers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns: Column<Customer>[] = [
    {
      key: "name",
      header: "Khách hàng",
      render: (c) => (
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 font-bold text-brand-700">
            {c.name.charAt(0)}
          </span>
          <span>
            <span className="block font-semibold text-ink-900">{c.name}</span>
            <span className="text-xs text-ink-400">{c.email}</span>
          </span>
        </div>
      ),
    },
    { key: "phone", header: "SĐT", render: (c) => c.phone },
    { key: "city", header: "Thành phố", render: (c) => c.city },
    {
      key: "totalOrders",
      header: "Đơn hàng",
      render: (c) => <span className="font-bold">{c.totalOrders}</span>,
    },
    {
      key: "totalSpent",
      header: "Chi tiêu",
      render: (c) => <span className="font-bold">{formatVND(c.totalSpent)}</span>,
    },
    {
      key: "joinedAt",
      header: "Tham gia",
      render: (c) => <span className="text-ink-500">{formatDate(c.joinedAt)}</span>,
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (c) => (
        <Badge tone={c.status === "active" ? "green" : "red"}>
          {c.status === "active" ? "Hoạt động" : "Đã khóa"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Thao tác",
      className: "text-right",
      render: (c) => (
        <button
          onClick={() => setTarget(c)}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-ink-500 hover:bg-slate-100"
        >
          {c.status === "active" ? (
            <span className="flex items-center gap-1 text-red-600"><Ban className="h-3.5 w-3.5" /> Khóa</span>
          ) : (
            <span className="flex items-center gap-1 text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Mở khóa</span>
          )}
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">Khách hàng</h1>
        <p className="mt-1 text-sm text-ink-500">{data?.total ?? 0} khách hàng</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Tìm theo tên, email, số điện thoại..."
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none"
        />
      </div>

      {pageItems.length === 0 ? (
        <EmptyState title="Không tìm thấy khách hàng" description="Thử thay đổi từ khóa tìm kiếm." />
      ) : (
        <>
          <DataTable columns={columns} data={pageItems} />
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}

      <ConfirmDialog
        open={!!target}
        onClose={() => setTarget(null)}
        onConfirm={async () => {
          if (target) {
            const next = target.status === "active" ? "blocked" : "active";
            await adminActions.setCustomerStatus(target.id, next);
            reload();
            toast(
              next === "blocked"
                ? `Đã khóa tài khoản "${target.name}".`
                : `Đã mở khóa tài khoản "${target.name}".`,
              next === "blocked" ? "info" : "success",
            );
            setTarget(null);
          }
        }}
        title={target?.status === "active" ? "Khóa tài khoản" : "Mở khóa tài khoản"}
        message={
          target?.status === "active"
            ? `Khóa tài khoản của "${target?.name}"? Khách hàng sẽ không thể đặt hàng mới.`
            : `Mở khóa tài khoản của "${target?.name}"?`
        }
        confirmLabel={target?.status === "active" ? "Khóa tài khoản" : "Mở khóa"}
        danger={target?.status === "active"}
      />
    </div>
  );
}
