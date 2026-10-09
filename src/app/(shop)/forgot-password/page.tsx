"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField, Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) {
      setError("Vui lòng nhập email hợp lệ.");
      return;
    }
    setError("");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800)); // mock latency
    setLoading(false);
    setSent(true);
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
        {sent ? (
          <div className="mt-6 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
              <MailCheck className="h-7 w-7 text-emerald-600" />
            </span>
            <h1 className="mt-4 text-xl font-extrabold text-ink-900">Đã gửi email!</h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">
              Nếu email <span className="font-bold text-ink-900">{email}</span> tồn tại trong hệ
              thống, bạn sẽ nhận được liên kết đặt lại mật khẩu trong vài phút.
            </p>
            <p className="mt-3 rounded-xl bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
              Chế độ demo — email khôi phục chưa được gửi thật.
            </p>
            <Link href="/login" className="mt-6 inline-block">
              <Button variant="secondary">
                <ArrowLeft className="h-4 w-4" /> Quay lại đăng nhập
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <h1 className="mt-6 text-center text-xl font-extrabold text-ink-900">
              Quên mật khẩu
            </h1>
            <p className="mt-1 text-center text-sm text-ink-500">
              Nhập email để nhận liên kết đặt lại mật khẩu
            </p>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <FormField label="Email" required error={error}>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ban@email.com"
                  autoComplete="email"
                />
              </FormField>
              <Button type="submit" className="w-full" size="lg" loading={loading}>
                Gửi liên kết đặt lại
              </Button>
              <p className="text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline"
                >
                  <ArrowLeft className="h-4 w-4" /> Quay lại đăng nhập
                </Link>
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
