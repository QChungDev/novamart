"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowDownToLine, History, PackagePlus, SlidersHorizontal } from "lucide-react";
import { adminActions, useAdminData } from "@/lib/services/admin";
import { useToast } from "@/lib/store/toast-store";
import { formatVND, formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/overlay";
import { DataTable, type Column } from "@/components/ui/data";
import { FormField, Input, Textarea } from "@/components/ui/input";
import { Tabs } from "@/components/ui/data";
import { cn } from "@/lib/utils";
import type { Product, StockMovement } from "@/lib/types";

type Tab = "stock" | "history";

export default function AdminInventoryPage() {
  const { data: products, reload: reloadProducts } = useAdminData(() => adminActions.getProducts(), []);
  const { data: movements, reload: reloadMovements } = useAdminData(() => adminActions.getMovements(), []);
  const allProducts = products ?? [];
  const allMovements = movements ?? [];
  const reload = () => { reloadProducts(); reloadMovements(); };
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("stock");
  const [receiveTarget, setReceiveTarget] = useState<Product | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<Product | null>(null);
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const resetModal = () => {
    setQty("");
    setReason("");
    setError("");
  };

  const doReceive = async () => {
    const n = Number(qty);
    if (!qty || Number.isNaN(n) || n <= 0 || !Number.isInteger(n)) {
      setError("Số lượng nhập phải là số nguyên dương.");
      return;
    }
    if (!reason.trim()) {
      setError("Vui lòng nhập lý do nhập hàng.");
      return;
    }
    if (receiveTarget) {
      await adminActions.receiveStock(receiveTarget.id, n, reason.trim());
      reload();
      toast(`Đã nhập ${n} sản phẩm "${receiveTarget.name}" vào kho.`);
    }
    setReceiveTarget(null);
    resetModal();
  };

  const doAdjust = async () => {
    const n = Number(qty);
    if (qty === "" || Number.isNaN(n) || n < 0 || !Number.isInteger(n)) {
      setError("Tồn kho mới phải là số nguyên không âm.");
      return;
    }
    if (!reason.trim()) {
      setError("Vui lòng nhập lý do điều chỉnh.");
      return;
    }
    if (adjustTarget) {
      await adminActions.adjustStock(adjustTarget.id, n, reason.trim());
      reload();
      toast(`Đã điều chỉnh tồn kho "${adjustTarget.name}" thành ${n}.`);
    }
    setAdjustTarget(null);
    resetModal();
  };

  const stockColumns: Column<Product>[] = [
    {
      key: "product",
      header: "Sản phẩm",
      render: (p) => (
        <div className="flex items-center gap-3">
          <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-slate-50">
            {p.images[0] && <Image src={p.images[0]} alt={p.name} fill sizes="44px" className="object-cover" />}
          </span>
          <span>
            <span className="line-clamp-1 block max-w-56 font-semibold text-ink-900">{p.name}</span>
            <span className="text-xs text-ink-400">{p.sku}</span>
          </span>
        </div>
      ),
    },
    {
      key: "stock",
      header: "Tồn kho",
      render: (p) => (
        <span className={cn("font-extrabold", p.stock === 0 ? "text-red-600" : p.stock <= 10 ? "text-amber-600" : "text-ink-900")}>
          {p.stock}
        </span>
      ),
    },
    {
      key: "sold",
      header: "Đã bán",
      render: (p) => <span className="text-ink-500">{p.sold}</span>,
    },
    {
      key: "value",
      header: "Giá trị tồn",
      render: (p) => <span className="font-semibold">{formatVND(p.stock * (p.salePrice ?? p.price))}</span>,
    },
    {
      key: "actions",
      header: "Thao tác",
      className: "text-right",
      render: (p) => (
        <span className="flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={() => { setReceiveTarget(p); resetModal(); }}>
            <PackagePlus className="h-3.5 w-3.5" /> Nhập hàng
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setAdjustTarget(p); resetModal(); }}>
            <SlidersHorizontal className="h-3.5 w-3.5" /> Điều chỉnh
          </Button>
        </span>
      ),
    },
  ];

  const movementColumns: Column<StockMovement>[] = [
    {
      key: "createdAt",
      header: "Thời gian",
      render: (m) => <span className="text-ink-500">{formatDateTime(m.createdAt)}</span>,
    },
    {
      key: "product",
      header: "Sản phẩm",
      render: (m) => (
        <span className="font-semibold text-ink-900">
          {allProducts.find((p) => p.id === m.productId)?.name ?? m.productId}
        </span>
      ),
    },
    {
      key: "type",
      header: "Loại",
      render: (m) => (
        <Badge tone={m.type === "in" ? "green" : m.type === "out" ? "red" : "blue"}>
          {m.type === "in" ? "Nhập hàng" : m.type === "out" ? "Xuất hàng" : "Điều chỉnh"}
        </Badge>
      ),
    },
    {
      key: "quantity",
      header: "Số lượng",
      render: (m) => (
        <span className={cn("font-bold", m.quantity >= 0 ? "text-emerald-700" : "text-red-600")}>
          {m.quantity >= 0 ? `+${m.quantity}` : m.quantity}
        </span>
      ),
    },
    { key: "reason", header: "Lý do", render: (m) => <span className="text-ink-500">{m.reason}</span> },
    { key: "createdBy", header: "Người thực hiện", render: (m) => m.createdBy },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">Kho hàng</h1>
        <p className="mt-1 text-sm text-ink-500">
          Nhập hàng, điều chỉnh tồn kho và xem lịch sử xuất nhập — dữ liệu demo.
        </p>
      </div>

      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "stock", label: "Tồn kho hiện tại", count: allProducts.length },
          { value: "history", label: "Lịch sử xuất nhập", count: allMovements.length },
        ]}
      />

      {tab === "stock" ? (
        <DataTable columns={stockColumns} data={allProducts} emptyTitle="Chưa có sản phẩm nào" />
      ) : (
        <DataTable
          columns={movementColumns}
          data={allMovements}
          emptyTitle="Chưa có lịch sử xuất nhập"
          emptyDescription="Các lần nhập hàng và điều chỉnh tồn kho sẽ hiển thị ở đây."
        />
      )}

      {/* Receive modal */}
      <Modal open={!!receiveTarget} onClose={() => setReceiveTarget(null)} title={`Nhập hàng — ${receiveTarget?.name}`}>
        <div className="space-y-4">
          <FormField label="Số lượng nhập" required error={error && !qty ? error : undefined}>
            <Input value={qty} onChange={(e) => setQty(e.target.value.replace(/[^\d]/g, ""))} placeholder="Ví dụ: 20" inputMode="numeric" />
          </FormField>
          <FormField label="Lý do" required>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ví dụ: Nhập hàng từ nhà phân phối..." rows={3} />
          </FormField>
          {error && qty && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setReceiveTarget(null)}>Hủy</Button>
            <Button onClick={doReceive}><ArrowDownToLine className="h-4 w-4" /> Nhập kho</Button>
          </div>
        </div>
      </Modal>

      {/* Adjust modal */}
      <Modal open={!!adjustTarget} onClose={() => setAdjustTarget(null)} title={`Điều chỉnh tồn kho — ${adjustTarget?.name}`}>
        <div className="space-y-4">
          <p className="text-sm text-ink-500">
            Tồn kho hiện tại: <span className="font-bold text-ink-900">{adjustTarget?.stock}</span>
          </p>
          <FormField label="Tồn kho mới" required error={error && qty === "" ? error : undefined}>
            <Input value={qty} onChange={(e) => setQty(e.target.value.replace(/[^\d]/g, ""))} placeholder="Ví dụ: 15" inputMode="numeric" />
          </FormField>
          <FormField label="Lý do điều chỉnh" required>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ví dụ: Kiểm kê cuối tháng..." rows={3} />
          </FormField>
          {error && qty !== "" && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex items-center gap-2 text-xs text-ink-400">
            <History className="h-3.5 w-3.5" /> Chênh lệch sẽ được ghi vào lịch sử xuất nhập.
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setAdjustTarget(null)}>Hủy</Button>
            <Button onClick={doAdjust}>Lưu điều chỉnh</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
