"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { adminActions, useAdminData } from "@/lib/services/admin";
import { useToast } from "@/lib/store/toast-store";
import { formatVND } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/overlay";
import { DataTable, Pagination, type Column } from "@/components/ui/data";
import { EmptyState } from "@/components/ui/feedback";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types";

const PAGE_SIZE = 10;

export default function AdminProductsPage() {
  const { toast } = useToast();
  const { data: products, reload } = useAdminData(() => adminActions.getProducts(), []);
  const { data: categories } = useAdminData(() => adminActions.getCategories(), []);
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<Product | null>(null);

  const allProducts = useMemo(() => products ?? [], [products]);
  const allCategories = categories ?? [];

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return allProducts.filter((p) => {
      if (needle && !`${p.name} ${p.sku}`.toLowerCase().includes(needle)) return false;
      if (categoryId && String(p.categoryId) !== categoryId) return false;
      if (status && p.status !== status) return false;
      return true;
    });
  }, [allProducts, q, categoryId, status]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const catName = (id: number | null) =>
    allCategories.find((c) => c.id === id)?.name ?? "—";

  const columns: Column<Product>[] = [
    {
      key: "product",
      header: "Sản phẩm",
      render: (p) => (
        <div className="flex items-center gap-3">
          <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-slate-50">
            {p.images[0] && (
              <Image src={p.images[0]} alt={p.name} fill sizes="44px" className="object-cover" />
            )}
          </span>
          <span>
            <span className="line-clamp-1 block max-w-56 font-semibold text-ink-900">{p.name}</span>
            <span className="text-xs text-ink-400">{p.sku}</span>
          </span>
        </div>
      ),
    },
    { key: "category", header: "Danh mục", render: (p) => catName(p.categoryId) },
    {
      key: "price",
      header: "Giá bán",
      render: (p) => (
        <span>
          <span className="block font-bold text-ink-900">{formatVND(p.salePrice ?? p.price)}</span>
          {p.salePrice && (
            <span className="block text-xs text-ink-400 line-through">{formatVND(p.price)}</span>
          )}
        </span>
      ),
    },
    {
      key: "stock",
      header: "Tồn kho",
      render: (p) => (
        <span
          className={cn(
            "font-bold",
            p.stock === 0 ? "text-red-600" : p.stock <= 10 ? "text-amber-600" : "text-ink-900",
          )}
        >
          {p.stock}
        </span>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (p) => (
        <Badge tone={p.status === "active" ? "green" : "slate"}>
          {p.status === "active" ? "Đang bán" : "Ngừng bán"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Thao tác",
      className: "text-right",
      render: (p) => (
        <span className="flex justify-end gap-1">
          <Link
            href={`/admin/products/${p.id}`}
            className="rounded-lg p-2 text-ink-400 hover:bg-brand-50 hover:text-brand-700"
            aria-label="Sửa sản phẩm"
          >
            <Pencil className="h-4 w-4" />
          </Link>
          <button
            onClick={() => setDeleting(p)}
            className="cursor-pointer rounded-lg p-2 text-ink-400 hover:bg-red-50 hover:text-red-600"
            aria-label="Xóa sản phẩm"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-900">Sản phẩm</h1>
          <p className="mt-1 text-sm text-ink-500">
            {filtered.length} sản phẩm · thao tác demo, lưu trên trình duyệt
          </p>
        </div>
        <Link href="/admin/products/new">
          <Button>
            <Plus className="h-4 w-4" /> Thêm sản phẩm
          </Button>
        </Link>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm theo tên hoặc SKU..."
            className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
        <select
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setPage(1);
          }}
          className="h-10 cursor-pointer rounded-xl border border-slate-200 px-3 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="">Tất cả danh mục</option>
          {allCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="h-10 cursor-pointer rounded-xl border border-slate-200 px-3 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="">Mọi trạng thái</option>
          <option value="active">Đang bán</option>
          <option value="inactive">Ngừng bán</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Không tìm thấy sản phẩm"
          description="Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc."
        />
      ) : (
        <>
          <DataTable columns={columns} data={pageItems} />
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) {
            await adminActions.deleteProduct(deleting.id); reload();
            toast(`Đã xóa sản phẩm "${deleting.name}".`, "info");
            setDeleting(null);
          }
        }}
        title="Xóa sản phẩm"
        message={`Bạn có chắc muốn xóa "${deleting?.name}" không? Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa sản phẩm"
        danger
      />
    </div>
  );
}
