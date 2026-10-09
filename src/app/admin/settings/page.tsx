"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { useAdmin } from "@/lib/services/admin";
import { useToast } from "@/lib/store/toast-store";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/overlay";
import { FormField, Input } from "@/components/ui/input";

export default function AdminSettingsPage() {
  const { state, actions } = useAdmin();
  const { toast } = useToast();
  const s = state.settings;

  const [form, setForm] = useState({
    storeName: s.storeName,
    hotline: s.hotline,
    email: s.email,
    address: s.address,
    announcement: s.announcement,
    freeShippingThreshold: String(s.freeShippingThreshold),
    standardShippingFee: String(s.standardShippingFee),
    expressShippingFee: String(s.expressShippingFee),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const set = (patch: Partial<typeof form>) => {
    setForm((f) => ({ ...f, ...patch }));
    setErrors((e) => {
      const next = { ...e };
      for (const k of Object.keys(patch)) delete next[k];
      return next;
    });
  };

  const num = (v: string) => Number(v.replace(/[^\d]/g, ""));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (form.storeName.trim().length < 2) errs.storeName = "Vui lòng nhập tên cửa hàng.";
    if (!form.email.includes("@")) errs.email = "Email không hợp lệ.";
    if (!form.hotline.trim()) errs.hotline = "Vui lòng nhập hotline.";
    if (Number.isNaN(num(form.freeShippingThreshold))) errs.freeShippingThreshold = "Không hợp lệ.";
    if (Number.isNaN(num(form.standardShippingFee))) errs.standardShippingFee = "Không hợp lệ.";
    if (Number.isNaN(num(form.expressShippingFee))) errs.expressShippingFee = "Không hợp lệ.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    setTimeout(() => {
      actions.updateSettings({
        storeName: form.storeName.trim(),
        hotline: form.hotline.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        announcement: form.announcement.trim(),
        freeShippingThreshold: num(form.freeShippingThreshold),
        standardShippingFee: num(form.standardShippingFee),
        expressShippingFee: num(form.expressShippingFee),
      });
      setSaving(false);
      toast("Lưu cài đặt thành công!");
    }, 500);
  };

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">Cài đặt cửa hàng</h1>
        <p className="mt-1 text-sm text-ink-500">
          Thông tin chung và cấu hình vận chuyển — dữ liệu demo.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
          <h2 className="mb-4 text-base font-bold text-ink-900">Thông tin chung</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Tên cửa hàng" required error={errors.storeName}>
              <Input value={form.storeName} onChange={(e) => set({ storeName: e.target.value })} />
            </FormField>
            <FormField label="Hotline" required error={errors.hotline}>
              <Input value={form.hotline} onChange={(e) => set({ hotline: e.target.value })} />
            </FormField>
            <FormField label="Email hỗ trợ" required error={errors.email}>
              <Input value={form.email} onChange={(e) => set({ email: e.target.value })} />
            </FormField>
            <FormField label="Địa chỉ">
              <Input value={form.address} onChange={(e) => set({ address: e.target.value })} />
            </FormField>
            <div className="sm:col-span-2">
              <FormField label="Thông báo đầu trang" hint="Hiển thị trên thanh announcement của cửa hàng">
                <Input value={form.announcement} onChange={(e) => set({ announcement: e.target.value })} />
              </FormField>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
          <h2 className="mb-4 text-base font-bold text-ink-900">Phí vận chuyển</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Miễn phí từ (₫)" error={errors.freeShippingThreshold}>
              <Input value={form.freeShippingThreshold} onChange={(e) => set({ freeShippingThreshold: e.target.value })} inputMode="numeric" />
            </FormField>
            <FormField label="Phí tiêu chuẩn (₫)" error={errors.standardShippingFee}>
              <Input value={form.standardShippingFee} onChange={(e) => set({ standardShippingFee: e.target.value })} inputMode="numeric" />
            </FormField>
            <FormField label="Phí hỏa tốc (₫)" error={errors.expressShippingFee}>
              <Input value={form.expressShippingFee} onChange={(e) => set({ expressShippingFee: e.target.value })} inputMode="numeric" />
            </FormField>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" loading={saving}>
            Lưu cài đặt
          </Button>
          <Button type="button" variant="secondary" onClick={() => setResetOpen(true)}>
            <RotateCcw className="h-4 w-4" /> Khôi phục dữ liệu demo
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={() => {
          actions.resetDemo();
          setResetOpen(false);
          toast("Đã khôi phục toàn bộ dữ liệu demo ban đầu.", "info");
        }}
        title="Khôi phục dữ liệu demo"
        message="Mọi thay đổi bạn đã thực hiện (sản phẩm, đơn hàng, khuyến mãi...) sẽ bị xóa và quay về dữ liệu mẫu ban đầu. Tiếp tục?"
        confirmLabel="Khôi phục"
        danger
      />
    </div>
  );
}
