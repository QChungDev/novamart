"use client";

import { useState } from "react";
import { useAuth } from "@/lib/store/auth-store";
import { useToast } from "@/lib/store/toast-store";
import { Button } from "@/components/ui/button";
import { FormField, Input } from "@/components/ui/input";

export default function AccountInfoPage() {
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (name.trim().length < 2) errs.name = "Vui lòng nhập họ tên.";
    if (phone && !/^(0|\+84)(3|5|7|8|9)\d{8}$/.test(phone.replace(/\s/g, "")))
      errs.phone = "Số điện thoại không hợp lệ.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    updateProfile({ name: name.trim(), phone: phone.trim() });
    setSaving(false);
    toast("Cập nhật thông tin thành công!");
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-ink-900">Thông tin cá nhân</h1>
      <p className="mt-1 text-sm text-ink-500">
        Cập nhật họ tên và số điện thoại liên hệ của bạn.
      </p>

      <form
        onSubmit={submit}
        className="mt-6 max-w-xl space-y-4 rounded-2xl border border-slate-100 bg-white p-5 md:p-6"
      >
        <FormField label="Họ tên" required error={errors.name}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nguyễn Văn A" />
        </FormField>
        <FormField label="Email">
          <Input value={user?.email ?? ""} disabled />
        </FormField>
        <FormField label="Số điện thoại" error={errors.phone}>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0903123456"
            inputMode="tel"
          />
        </FormField>
        <p className="rounded-xl bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
          Chế độ demo — thông tin chỉ lưu trên trình duyệt này.
        </p>
        <Button type="submit" loading={saving}>
          Lưu thay đổi
        </Button>
      </form>
    </div>
  );
}
