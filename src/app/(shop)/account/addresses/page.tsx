"use client";

import { useEffect, useState } from "react";
import { MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useToast } from "@/lib/store/toast-store";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Modal } from "@/components/ui/overlay";
import { EmptyState } from "@/components/ui/feedback";
import { FormField, Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { Address } from "@/lib/types";

const STORAGE_KEY = "novamart-addresses-v1";

const CITIES = ["TP. Hồ Chí Minh", "Hà Nội", "Đà Nẵng", "Cần Thơ", "Hải Phòng", "Huế", "Khác"];

const EMPTY_FORM = {
  label: "Nhà riêng",
  receiver: "",
  phone: "",
  street: "",
  district: "",
  city: CITIES[0],
};

function readStored(): Address[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Address[]) : [];
  } catch {
    return [];
  }
}

export default function AddressesPage() {
  const { toast } = useToast();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleting, setDeleting] = useState<Address | null>(null);

  useEffect(() => {
    // Client-only read; list renders empty until loaded.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAddresses(readStored());
  }, []);

  const persist = (list: Address[]) => {
    setAddresses(list);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
      /* ignore */
    }
  };

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (a: Address) => {
    setEditing(a);
    setForm({
      label: a.label,
      receiver: a.receiver,
      phone: a.phone,
      street: a.street,
      district: a.district,
      city: a.city,
    });
    setErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (form.receiver.trim().length < 2) e.receiver = "Vui lòng nhập tên người nhận.";
    if (!/^(0|\+84)(3|5|7|8|9)\d{8}$/.test(form.phone.replace(/\s/g, "")))
      e.phone = "Số điện thoại không hợp lệ.";
    if (form.street.trim().length < 5) e.street = "Vui lòng nhập địa chỉ chi tiết.";
    if (form.district.trim().length < 2) e.district = "Vui lòng nhập quận/huyện.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = () => {
    if (!validate()) return;
    if (editing) {
      persist(addresses.map((a) => (a.id === editing.id ? { ...a, ...form } : a)));
      toast("Cập nhật địa chỉ thành công!");
    } else {
      const entry: Address = {
        id: `addr-${Date.now()}`,
        ...form,
        isDefault: addresses.length === 0,
      };
      persist([...addresses, entry]);
      toast("Thêm địa chỉ mới thành công!");
    }
    setModalOpen(false);
  };

  const confirmDelete = () => {
    if (!deleting) return;
    const rest = addresses.filter((a) => a.id !== deleting.id);
    if (deleting.isDefault && rest.length > 0) rest[0].isDefault = true;
    persist(rest);
    setDeleting(null);
    toast("Đã xóa địa chỉ.", "info");
  };

  const setDefault = (id: string) => {
    persist(addresses.map((a) => ({ ...a, isDefault: a.id === id })));
    toast("Đã đặt làm địa chỉ mặc định.");
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-900">Sổ địa chỉ</h1>
          <p className="mt-1 text-sm text-ink-500">Quản lý các địa chỉ giao hàng của bạn.</p>
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4" /> Thêm địa chỉ
        </Button>
      </div>

      {addresses.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Chưa có địa chỉ nào"
            description="Thêm địa chỉ giao hàng để thanh toán nhanh hơn."
            icon={<MapPin className="h-7 w-7" />}
            action={
              <Button size="sm" onClick={openAdd}>
                <Plus className="h-4 w-4" /> Thêm địa chỉ đầu tiên
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {addresses.map((a) => (
            <div key={a.id} className="rounded-2xl border border-slate-100 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-sm font-bold text-ink-900">
                    {a.label}
                    {a.isDefault && <Badge tone="green">Mặc định</Badge>}
                  </p>
                  <p className="mt-2 text-sm text-ink-700">
                    {a.receiver} · {a.phone}
                  </p>
                  <p className="mt-1 text-sm text-ink-500">
                    {a.street}, {a.district}, {a.city}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
                {!a.isDefault && (
                  <button
                    onClick={() => setDefault(a.id)}
                    className="flex cursor-pointer items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
                  >
                    <Star className="h-3.5 w-3.5" /> Đặt mặc định
                  </button>
                )}
                <span className="flex-1" />
                <button
                  onClick={() => openEdit(a)}
                  className="flex cursor-pointer items-center gap-1 text-xs font-semibold text-ink-500 hover:text-brand-700"
                >
                  <Pencil className="h-3.5 w-3.5" /> Sửa
                </button>
                <button
                  onClick={() => setDeleting(a)}
                  className="flex cursor-pointer items-center gap-1 text-xs font-semibold text-ink-500 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Xóa
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Sửa địa chỉ" : "Thêm địa chỉ mới"}>
        <div className="space-y-4">
          <FormField label="Tên gợi nhớ">
            <Select value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })}>
              {["Nhà riêng", "Công ty", "Khác"].map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </Select>
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Người nhận" required error={errors.receiver}>
              <Input value={form.receiver} onChange={(e) => setForm({ ...form, receiver: e.target.value })} placeholder="Nguyễn Văn A" />
            </FormField>
            <FormField label="Số điện thoại" required error={errors.phone}>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0903123456" inputMode="tel" />
            </FormField>
          </div>
          <FormField label="Địa chỉ" required error={errors.street}>
            <Input value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} placeholder="Số nhà, tên đường" />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Quận / Huyện" required error={errors.district}>
              <Input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} placeholder="Quận 1" />
            </FormField>
            <FormField label="Tỉnh / Thành phố" required>
              <Select value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>
                {CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </FormField>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Hủy</Button>
            <Button onClick={save}>{editing ? "Lưu thay đổi" : "Thêm địa chỉ"}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Xóa địa chỉ"
        message={`Bạn có chắc muốn xóa địa chỉ "${deleting?.label}" không? Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa"
        danger
      />
    </div>
  );
}
