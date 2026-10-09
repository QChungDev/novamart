"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useAdmin } from "@/lib/services/admin";
import { useToast } from "@/lib/store/toast-store";
import { formatVND, formatDate } from "@/lib/format";
import { Badge, couponTypeLabel } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Modal } from "@/components/ui/overlay";
import { DataTable, type Column } from "@/components/ui/data";
import { FormField, Input, Select, Textarea } from "@/components/ui/input";
import type { Coupon, CouponType } from "@/lib/types";

const EMPTY = {
  code: "",
  description: "",
  type: "percent" as CouponType,
  value: "",
  minOrder: "",
  usageLimit: "",
  startDate: "",
  endDate: "",
  status: "active" as Coupon["status"],
};

export default function AdminCouponsPage() {
  const { state, actions } = useAdmin();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleting, setDeleting] = useState<Coupon | null>(null);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (c: Coupon) => {
    setEditing(c);
    setForm({
      code: c.code,
      description: c.description,
      type: c.type,
      value: String(c.value),
      minOrder: String(c.minOrder),
      usageLimit: String(c.usageLimit),
      startDate: c.startDate.slice(0, 10),
      endDate: c.endDate.slice(0, 10),
      status: c.status,
    });
    setErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!/^[A-Z0-9]{4,20}$/.test(form.code.trim().toUpperCase()))
      e.code = "Mã gồm 4–20 ký tự chữ in hoa hoặc số.";
    const dup = state.coupons.some(
      (c) => c.code.toUpperCase() === form.code.trim().toUpperCase() && c.id !== editing?.id,
    );
    if (dup) e.code = "Mã này đã tồn tại.";
    if (form.description.trim().length < 5) e.description = "Mô tả phải có ít nhất 5 ký tự.";
    const value = Number(form.value);
    if (Number.isNaN(value) || value <= 0) e.value = "Giá trị phải là số dương.";
    else if (form.type === "percent" && value > 100) e.value = "Phần trăm không vượt quá 100.";
    if (form.minOrder && (Number.isNaN(Number(form.minOrder)) || Number(form.minOrder) < 0))
      e.minOrder = "Đơn tối thiểu không hợp lệ.";
    const limit = Number(form.usageLimit);
    if (!form.usageLimit || Number.isNaN(limit) || limit <= 0 || !Number.isInteger(limit))
      e.usageLimit = "Giới hạn lượt dùng phải là số nguyên dương.";
    if (!form.startDate) e.startDate = "Chọn ngày bắt đầu.";
    if (!form.endDate) e.endDate = "Chọn ngày kết thúc.";
    if (form.startDate && form.endDate && form.startDate > form.endDate)
      e.endDate = "Ngày kết thúc phải sau ngày bắt đầu.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    const payload: Coupon = {
      id: editing?.id ?? `cp-${Date.now().toString(36)}`,
      code: form.code.trim().toUpperCase(),
      description: form.description.trim(),
      type: form.type,
      value: Number(form.value),
      minOrder: Number(form.minOrder) || 0,
      usageLimit: Number(form.usageLimit),
      used: editing?.used ?? 0,
      startDate: new Date(form.startDate).toISOString(),
      endDate: new Date(form.endDate).toISOString(),
      status: form.status,
    };
    await actions.saveCoupon(payload);
    toast(editing ? "Cập nhật mã giảm giá thành công!" : "Thêm mã giảm giá thành công!");
    setModalOpen(false);
  };

  const valueLabel = (c: Coupon) =>
    c.type === "percent" ? `Giảm ${c.value}%` : `Giảm ${formatVND(c.value)}`;

  const columns: Column<Coupon>[] = [
    {
      key: "code",
      header: "Mã",
      render: (c) => (
        <span>
          <span className="rounded-lg bg-brand-50 px-2.5 py-1 font-mono text-sm font-bold text-brand-700">
            {c.code}
          </span>
          <span className="mt-1 block max-w-56 text-xs text-ink-400">{c.description}</span>
        </span>
      ),
    },
    { key: "type", header: "Loại", render: (c) => couponTypeLabel(c.type) },
    { key: "value", header: "Giá trị", render: (c) => <span className="font-bold">{valueLabel(c)}</span> },
    {
      key: "usage",
      header: "Đã dùng",
      render: (c) => (
        <span>
          <span className="font-bold">{c.used}</span>
          <span className="text-ink-400">/{c.usageLimit}</span>
          <span className="block h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
            <span
              className="block h-full rounded-full bg-brand-600"
              style={{ width: `${Math.min(100, (c.used / c.usageLimit) * 100)}%` }}
            />
          </span>
        </span>
      ),
    },
    {
      key: "dates",
      header: "Hiệu lực",
      render: (c) => (
        <span className="text-xs text-ink-500">
          {formatDate(c.startDate)} → {formatDate(c.endDate)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (c) => (
        <Badge tone={c.status === "active" ? "green" : "slate"}>
          {c.status === "active" ? "Đang chạy" : "Tạm dừng"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Thao tác",
      className: "text-right",
      render: (c) => (
        <span className="flex justify-end gap-1">
          <button onClick={() => openEdit(c)} className="cursor-pointer rounded-lg p-2 text-ink-400 hover:bg-brand-50 hover:text-brand-700" aria-label="Sửa mã">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={() => setDeleting(c)} className="cursor-pointer rounded-lg p-2 text-ink-400 hover:bg-red-50 hover:text-red-600" aria-label="Xóa mã">
            <Trash2 className="h-4 w-4" />
          </button>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-900">Khuyến mãi</h1>
          <p className="mt-1 text-sm text-ink-500">{state.coupons.length} mã giảm giá</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4" /> Tạo mã mới
        </Button>
      </div>

      <DataTable columns={columns} data={state.coupons} emptyTitle="Chưa có mã giảm giá nào" />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Sửa mã giảm giá" : "Tạo mã giảm giá"} wide>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Mã giảm giá" required error={errors.code} hint="Chữ in hoa, không dấu cách">
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s/g, "") })} placeholder="SALE20" />
          </FormField>
          <FormField label="Trạng thái">
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Coupon["status"] })}>
              <option value="active">Đang chạy</option>
              <option value="inactive">Tạm dừng</option>
            </Select>
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="Mô tả" required error={errors.description}>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ví dụ: Giảm 20% cho đơn từ 2 triệu" rows={2} />
            </FormField>
          </div>
          <FormField label="Loại giảm giá" required>
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as CouponType })}>
              <option value="percent">Phần trăm (%)</option>
              <option value="fixed">Số tiền (₫)</option>
            </Select>
          </FormField>
          <FormField label={form.type === "percent" ? "Phần trăm (%)" : "Số tiền giảm (₫)"} required error={errors.value}>
            <Input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value.replace(/[^\d]/g, "") })} placeholder={form.type === "percent" ? "20" : "500000"} inputMode="numeric" />
          </FormField>
          <FormField label="Đơn hàng tối thiểu (₫)" error={errors.minOrder}>
            <Input value={form.minOrder} onChange={(e) => setForm({ ...form, minOrder: e.target.value.replace(/[^\d]/g, "") })} placeholder="0" inputMode="numeric" />
          </FormField>
          <FormField label="Giới hạn lượt dùng" required error={errors.usageLimit}>
            <Input value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value.replace(/[^\d]/g, "") })} placeholder="100" inputMode="numeric" />
          </FormField>
          <FormField label="Ngày bắt đầu" required error={errors.startDate}>
            <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </FormField>
          <FormField label="Ngày kết thúc" required error={errors.endDate}>
            <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </FormField>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Hủy</Button>
          <Button onClick={save}>{editing ? "Lưu thay đổi" : "Tạo mã"}</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) {
            await actions.deleteCoupon(deleting.id);
            toast(`Đã xóa mã "${deleting.code}".`, "info");
            setDeleting(null);
          }
        }}
        title="Xóa mã giảm giá"
        message={`Bạn có chắc muốn xóa mã "${deleting?.code}" không?`}
        confirmLabel="Xóa mã"
        danger
      />
    </div>
  );
}
