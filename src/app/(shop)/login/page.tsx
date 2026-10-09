"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useAuth } from "@/lib/store/auth-store";
import { useToast } from "@/lib/store/toast-store";
import { Button } from "@/components/ui/button";
import { FormField, Input, PasswordInput } from "@/components/ui/input";
import { Spinner } from "@/components/ui/feedback";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email.trim(), password);
      toast("Đăng nhập thành công! Chào mừng bạn trở lại.");
      router.push(searchParams.get("redirect") ?? "/account");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <FormField label="Email" required>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ban@email.com"
          autoComplete="email"
        />
      </FormField>
      <div>
        <FormField label="Mật khẩu" required>
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nhập mật khẩu"
            autoComplete="current-password"
          />
        </FormField>
        <div className="mt-1.5 text-right">
          <Link href="/forgot-password" className="text-xs font-semibold text-brand-700 hover:underline">
            Quên mật khẩu?
          </Link>
        </div>
      </div>
      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>
      )}
      <Button type="submit" className="w-full" size="lg" loading={loading}>
        Đăng nhập
      </Button>
      <p className="rounded-xl bg-brand-50 px-4 py-2.5 text-xs leading-relaxed text-brand-800">
        Tài khoản demo: <span className="font-bold">customer@novamart.vn</span> /{" "}
        <span className="font-bold">123456</span> — hoặc dùng bất kỳ email nào (mật khẩu ≥ 6 ký tự).
      </p>
      <p className="text-center text-sm text-ink-500">
        Chưa có tài khoản?{" "}
        <Link href="/register" className="font-bold text-brand-700 hover:underline">
          Đăng ký ngay
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
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
        <h1 className="mt-6 text-center text-xl font-extrabold text-ink-900">Đăng nhập</h1>
        <p className="mt-1 text-center text-sm text-ink-500">
          Chào mừng bạn trở lại với NovaMart
        </p>
        <div className="mt-6">
          <Suspense fallback={<Spinner />}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
