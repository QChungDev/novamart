"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/store/auth-store";
import { useToast } from "@/lib/store/toast-store";
import { Button } from "@/components/ui/button";
import { FormField, Input, PasswordInput } from "@/components/ui/input";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (name.trim().length < 2) errs.name = "Vui lòng nhập họ tên.";
    if (!email.includes("@")) errs.email = "Email không hợp lệ.";
    if (password.length < 6) errs.password = "Mật khẩu phải có ít nhất 6 ký tự.";
    if (confirm !== password) errs.confirm = "Mật khẩu nhập lại không khớp.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password);
      toast("Đăng ký thành công! Chào mừng bạn đến với NovaMart.");
      router.push("/account");
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Đăng ký thất bại." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm md:p-8">
        <Link href="/" className="flex items-center justify-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-xl font-extrabold text-white">
            N
          </span>
          <span className="text-2xl font-extrabold text-ink-900">
            Nova<span className="text-brand-600">Mart</span>
          </span>
        </Link>
        <h1 className="mt-6 text-center text-xl font-extrabold text-ink-900">Tạo tài khoản</h1>
        <p className="mt-1 text-center text-sm text-ink-500">
          Tham gia NovaMart để nhận ưu đãi độc quyền
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <FormField label="Họ tên" required error={errors.name}>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nguyễn Văn A" autoComplete="name" />
          </FormField>
          <FormField label="Email" required error={errors.email}>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ban@email.com" autoComplete="email" />
          </FormField>
          <FormField label="Mật khẩu" required error={errors.password} hint="Ít nhất 6 ký tự">
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Tạo mật khẩu" autoComplete="new-password" />
          </FormField>
          <FormField label="Nhập lại mật khẩu" required error={errors.confirm}>
            <PasswordInput value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Nhập lại mật khẩu" autoComplete="new-password" />
          </FormField>
          {errors.form && (
            <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{errors.form}</p>
          )}
          <Button type="submit" className="w-full" size="lg" loading={loading}>
            Đăng ký
          </Button>
          <p className="text-center text-sm text-ink-500">
            Đã có tài khoản?{" "}
            <Link href="/login" className="font-bold text-brand-700 hover:underline">
              Đăng nhập
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
