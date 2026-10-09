"use client";

import { useState } from "react";
import { MailCheck } from "lucide-react";
import { useToast } from "@/lib/store/toast-store";
import { Button } from "@/components/ui/button";

export function Newsletter() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) {
      setError("Vui lòng nhập email hợp lệ.");
      return;
    }
    setError("");
    setEmail("");
    toast("Đăng ký nhận tin thành công! Cảm ơn bạn đã theo dõi NovaMart.");
  };

  return (
    <section className="rounded-3xl border border-slate-100 bg-slate-50 px-6 py-10 text-center md:py-12">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white">
        <MailCheck className="h-6 w-6" />
      </span>
      <h2 className="mt-4 text-xl font-extrabold text-ink-900 md:text-2xl">
        Nhận tin khuyến mãi mỗi tuần
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-500">
        Đăng ký để nhận mã giảm giá độc quyền và thông tin sản phẩm mới nhất từ NovaMart.
      </p>
      <form onSubmit={submit} className="mx-auto mt-6 flex max-w-md flex-col gap-2 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Nhập email của bạn"
          className="h-12 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
        <Button type="submit" size="lg" className="shrink-0">
          Đăng ký
        </Button>
      </form>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </section>
  );
}
