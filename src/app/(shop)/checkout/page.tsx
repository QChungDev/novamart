"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Banknote, CheckCircle2, CreditCard, ShoppingCart, Truck, Wallet, Zap } from "lucide-react";
import { useCart } from "@/lib/store/cart-store";
import { useAuth } from "@/lib/store/auth-store";
import { api } from "@/lib/api/client";
import { validateCoupon, shippingFeeFor, type CouponCheck } from "@/lib/services/pricing";
import { formatVND } from "@/lib/format";
import { Breadcrumbs } from "@/components/ui/data";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { FormField, Input, Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Order, PaymentMethod, ShippingMethod } from "@/lib/types";

const CITIES = [
  "TP. Hồ Chí Minh",
  "Hà Nội",
  "Đà Nẵng",
  "Cần Thơ",
  "Hải Phòng",
  "Huế",
  "Nha Trang",
  "Vũng Tàu",
  "Biên Hòa",
  "Khác",
];

interface FormState {
  name: string;
  phone: string;
  email: string;
  street: string;
  district: string;
  city: string;
  note: string;
  shippingMethod: ShippingMethod;
  paymentMethod: PaymentMethod;
}

const PHONE_RE = /^(0|\+84)(3|5|7|8|9)\d{8}$/;

export default function CheckoutPage() {
  const router = useRouter();
  const { lines, subtotal, clear } = useCart();
  const { user } = useAuth();
  const [form, setForm] = useState<FormState>({
    name: user?.name ?? "",
    phone: user?.phone ?? "",
    email: user?.email ?? "",
    street: "",
    district: "",
    city: CITIES[0],
    note: "",
    shippingMethod: "standard",
    paymentMethod: "cod",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [couponCode, setCouponCode] = useState("");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [couponError, setCouponError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [couponCheck, setCouponCheck] = useState<CouponCheck | null>(null);
  const [shippingFee, setShippingFee] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const c = appliedCode ? await validateCoupon(appliedCode, subtotal) : null;
      if (!alive) return;
      setCouponCheck(c);
      const discount = c && c.ok ? c.discount : 0;
      setShippingFee(await shippingFeeFor(form.shippingMethod, subtotal - discount));
    })();
    return () => {
      alive = false;
    };
  }, [appliedCode, subtotal, form.shippingMethod]);

  const discount = couponCheck && couponCheck.ok ? couponCheck.discount : 0;
  const total = subtotal - discount + shippingFee;

  const set = (patch: Partial<FormState>) => {
    setForm((f) => ({ ...f, ...patch }));
    setErrors((e) => {
      const next = { ...e };
      for (const k of Object.keys(patch)) delete next[k as keyof FormState];
      return next;
    });
  };

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (form.name.trim().length < 2) e.name = "Vui lòng nhập họ tên người nhận.";
    if (!PHONE_RE.test(form.phone.replace(/\s/g, "")))
      e.phone = "Số điện thoại không hợp lệ (ví dụ: 0903123456).";
    if (!form.email.includes("@")) e.email = "Email không hợp lệ.";
    if (form.street.trim().length < 5) e.street = "Vui lòng nhập địa chỉ chi tiết (số nhà, đường).";
    if (form.district.trim().length < 2) e.district = "Vui lòng nhập quận/huyện.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError("Vui lòng nhập mã giảm giá.");
      return;
    }
    const result = await validateCoupon(couponCode, subtotal);
    if (result.ok) {
      setAppliedCode(couponCode.trim().toUpperCase());
      setCouponError("");
    } else {
      setCouponError(result.error);
    }
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) {
      document.querySelector("[data-error]")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSubmitting(true);
    try {
      const data = await api.post<Record<string, unknown>>("/api/v1/orders/checkout", {
        items: lines.map((l) => ({ product_id: l.productId, quantity: l.quantity })),
        customer_name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        street: form.street.trim(),
        district: form.district.trim(),
        city: form.city,
        note: form.note.trim(),
        shipping_method: form.shippingMethod,
        payment_method: form.paymentMethod,
        coupon_code: appliedCode,
      });
      const order = {
        id: data.id as number,
        code: data.code as string,
        customerName: data.customer_name as string,
        phone: data.phone as string,
        email: data.email as string,
        street: data.street as string,
        district: data.district as string,
        city: data.city as string,
        note: data.note as string,
        items: (data.items as Record<string, unknown>[]).map((i) => ({
          productId: i.product_id as number,
          name: i.name as string,
          image: i.image as string,
          price: Number(i.price),
          quantity: i.quantity as number,
        })),
        subtotal: Number(data.subtotal),
        shippingFee: Number(data.shipping_fee),
        discount: Number(data.discount),
        total: Number(data.total),
        couponCode: (data.coupon_code as string) || undefined,
        status: data.status as Order["status"],
        paymentMethod: data.payment_method as Order["paymentMethod"],
        shippingMethod: data.shipping_method as Order["shippingMethod"],
        createdAt: data.created_at as string,
        timeline: (data.timeline as Record<string, unknown>[]).map((t) => ({
          status: t.status as Order["status"],
          at: t.created_at as string,
          note: t.note as string | undefined,
        })),
      } as Order;
      clear();
      setPlacedOrder(order);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Đặt hàng thất bại. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ------------------------- Order confirmation ------------------------- */
  if (placedOrder) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 className="h-9 w-9 text-emerald-600" />
        </span>
        <h1 className="mt-5 text-2xl font-extrabold text-ink-900">Đặt hàng thành công!</h1>
        <p className="mt-2 text-sm text-ink-500">
          Cảm ơn <span className="font-bold text-ink-900">{placedOrder.customerName}</span> đã mua
          sắm tại NovaMart. Chúng tôi sẽ liên hệ xác nhận đơn hàng trong ít phút.
        </p>
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-left">
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink-500">Mã đơn hàng</span>
            <span className="text-lg font-extrabold text-brand-700">{placedOrder.code}</span>
          </div>
          <dl className="mt-4 space-y-2 border-t border-slate-200 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-500">Người nhận</dt>
              <dd className="font-semibold">{placedOrder.customerName} · {placedOrder.phone}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-ink-500">Địa chỉ</dt>
              <dd className="text-right font-semibold">
                {placedOrder.street}, {placedOrder.district}, {placedOrder.city}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Thanh toán</dt>
              <dd className="font-semibold">
                {placedOrder.paymentMethod === "cod" ? "COD" : "Demo (mô phỏng)"}
              </dd>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-3 text-base">
              <dt className="font-bold">Tổng thanh toán</dt>
              <dd className="font-extrabold text-brand-700">{formatVND(placedOrder.total)}</dd>
            </div>
          </dl>
        </div>
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
          Đây là đơn hàng demo của bản prototype — chưa có thanh toán hay vận chuyển thật.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/products">
            <Button variant="secondary">Tiếp tục mua sắm</Button>
          </Link>
          <Link href="/account/orders">
            <Button>Theo dõi đơn hàng</Button>
          </Link>
        </div>
      </div>
    );
  }

  /* ------------------------------ Empty cart ----------------------------- */
  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <EmptyState
          title="Không có sản phẩm để thanh toán"
          description="Giỏ hàng của bạn đang trống. Hãy thêm sản phẩm trước khi thanh toán."
          icon={<ShoppingCart className="h-7 w-7" />}
          action={
            <Link href="/products">
              <Button>Mua sắm ngay</Button>
            </Link>
          }
        />
      </div>
    );
  }

  /* --------------------------------- Form --------------------------------- */
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Breadcrumbs
        items={[
          { label: "Trang chủ", href: "/" },
          { label: "Giỏ hàng", href: "/cart" },
          { label: "Thanh toán" },
        ]}
      />
      <h1 className="mt-3 text-2xl font-extrabold text-ink-900">Thanh toán</h1>

      <form onSubmit={submit} className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Shipping info */}
          <section className="rounded-2xl border border-slate-100 bg-white p-5 md:p-6">
            <h2 className="text-base font-bold text-ink-900">Thông tin giao hàng</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div data-error={errors.name ? true : undefined}>
                <FormField label="Họ tên người nhận" required error={errors.name}>
                  <Input
                    value={form.name}
                    onChange={(e) => set({ name: e.target.value })}
                    placeholder="Nguyễn Văn A"
                  />
                </FormField>
              </div>
              <div data-error={errors.phone ? true : undefined}>
                <FormField label="Số điện thoại" required error={errors.phone}>
                  <Input
                    value={form.phone}
                    onChange={(e) => set({ phone: e.target.value })}
                    placeholder="0903123456"
                    inputMode="tel"
                  />
                </FormField>
              </div>
              <div className="sm:col-span-2" data-error={errors.email ? true : undefined}>
                <FormField label="Email" required error={errors.email}>
                  <Input
                    value={form.email}
                    onChange={(e) => set({ email: e.target.value })}
                    placeholder="ban@email.com"
                    type="email"
                  />
                </FormField>
              </div>
              <div className="sm:col-span-2" data-error={errors.street ? true : undefined}>
                <FormField label="Địa chỉ" required error={errors.street}>
                  <Input
                    value={form.street}
                    onChange={(e) => set({ street: e.target.value })}
                    placeholder="Số nhà, tên đường, phường/xã"
                  />
                </FormField>
              </div>
              <div data-error={errors.district ? true : undefined}>
                <FormField label="Quận / Huyện" required error={errors.district}>
                  <Input
                    value={form.district}
                    onChange={(e) => set({ district: e.target.value })}
                    placeholder="Quận 1"
                  />
                </FormField>
              </div>
              <FormField label="Tỉnh / Thành phố" required>
                <Select value={form.city} onChange={(e) => set({ city: e.target.value })}>
                  {CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </FormField>
              <div className="sm:col-span-2">
                <FormField label="Ghi chú giao hàng" hint="Không bắt buộc">
                  <Textarea
                    value={form.note}
                    onChange={(e) => set({ note: e.target.value })}
                    placeholder="Ví dụ: giao giờ hành chính, gọi trước khi giao..."
                  />
                </FormField>
              </div>
            </div>
          </section>

          {/* Shipping method */}
          <section className="rounded-2xl border border-slate-100 bg-white p-5 md:p-6">
            <h2 className="text-base font-bold text-ink-900">Phương thức vận chuyển</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(
                [
                  { value: "standard", icon: Truck, label: "Tiêu chuẩn", desc: "2–4 ngày làm việc" },
                  { value: "express", icon: Zap, label: "Hỏa tốc", desc: "Nội thành trong 2 giờ" },
                ] as const
              ).map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => set({ shippingMethod: m.value })}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 text-left transition-colors",
                    form.shippingMethod === m.value
                      ? "border-brand-600 bg-brand-50/50"
                      : "border-slate-200 hover:border-slate-300",
                  )}
                >
                  <m.icon className="h-5 w-5 text-brand-700" />
                  <span>
                    <span className="block text-sm font-bold text-ink-900">{m.label}</span>
                    <span className="block text-xs text-ink-500">{m.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Payment method */}
          <section className="rounded-2xl border border-slate-100 bg-white p-5 md:p-6">
            <h2 className="text-base font-bold text-ink-900">Phương thức thanh toán</h2>
            <div className="mt-4 space-y-3">
              {(
                [
                  { value: "cod", icon: Banknote, label: "Thanh toán khi nhận hàng (COD)", desc: "Trả tiền mặt cho shipper", demo: false },
                  { value: "demo_card", icon: CreditCard, label: "Thẻ ngân hàng", desc: "Mô phỏng — chưa trừ tiền thật", demo: true },
                  { value: "demo_wallet", icon: Wallet, label: "Ví điện tử", desc: "Mô phỏng — chưa trừ tiền thật", demo: true },
                ] as const
              ).map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => set({ paymentMethod: m.value })}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-3 rounded-xl border-2 p-4 text-left transition-colors",
                    form.paymentMethod === m.value
                      ? "border-brand-600 bg-brand-50/50"
                      : "border-slate-200 hover:border-slate-300",
                  )}
                >
                  <m.icon className="h-5 w-5 shrink-0 text-brand-700" />
                  <span className="flex-1">
                    <span className="flex items-center gap-2 text-sm font-bold text-ink-900">
                      {m.label}
                      {m.demo && <Badge tone="amber">Demo</Badge>}
                    </span>
                    <span className="block text-xs text-ink-500">{m.desc}</span>
                  </span>
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full border-2",
                      form.paymentMethod === m.value ? "border-brand-600" : "border-slate-300",
                    )}
                  >
                    {form.paymentMethod === m.value && (
                      <span className="h-2.5 w-2.5 rounded-full bg-brand-600" />
                    )}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Order summary */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 lg:sticky lg:top-36">
            <h2 className="text-base font-bold text-ink-900">
              Đơn hàng ({lines.reduce((s, l) => s + l.quantity, 0)})
            </h2>
            <ul className="mt-4 max-h-64 space-y-3 overflow-y-auto nice-scroll">
              {lines.map((l) => (
                <li key={l.productId} className="flex gap-3">
                  <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-50">
                    <Image
                      src={l.product.images[0]}
                      alt={l.product.name}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                    <span className="absolute right-0 top-0 rounded-bl-lg bg-ink-950/70 px-1.5 text-[11px] font-bold text-white">
                      {l.quantity}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 block text-xs font-medium text-ink-900">
                      {l.product.name}
                    </span>
                    <span className="mt-0.5 block text-xs font-bold text-brand-700">
                      {formatVND(l.lineTotal)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-4 border-t border-slate-100 pt-4">
              {appliedCode && couponCheck?.ok ? (
                <p className="flex items-center justify-between text-sm">
                  <span className="font-bold text-emerald-700">Mã {appliedCode}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setAppliedCode(null);
                      setCouponCode("");
                    }}
                    className="cursor-pointer text-xs text-ink-400 underline"
                  >
                    Gỡ
                  </button>
                </p>
              ) : (
                <>
                  <div className="flex gap-2">
                    <input
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Mã giảm giá"
                      className="h-10 flex-1 rounded-xl border border-slate-200 px-3 text-sm uppercase placeholder:normal-case focus:border-brand-500 focus:outline-none"
                    />
                    <Button type="button" variant="secondary" size="sm" className="h-10" onClick={applyCoupon}>
                      Áp dụng
                    </Button>
                  </div>
                  {couponError && <p className="mt-1.5 text-xs text-red-600">{couponError}</p>}
                </>
              )}
            </div>

            <dl className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-500">Tạm tính</dt>
                <dd className="font-semibold">{formatVND(subtotal)}</dd>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <dt>Giảm giá</dt>
                  <dd className="font-semibold">-{formatVND(discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-500">Vận chuyển</dt>
                <dd className="font-semibold">
                  {shippingFee === 0 ? <span className="text-emerald-700">Miễn phí</span> : formatVND(shippingFee)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-3 text-base">
                <dt className="font-bold">Tổng cộng</dt>
                <dd className="font-extrabold text-brand-700">{formatVND(total)}</dd>
              </div>
            </dl>

            <Button type="submit" size="lg" className="mt-5 w-full" loading={submitting}>
              Đặt hàng
            </Button>
            <button
              type="button"
              onClick={() => router.push("/cart")}
              className="mt-2 w-full cursor-pointer py-2 text-center text-sm font-medium text-ink-500 hover:text-ink-900"
            >
              Quay lại giỏ hàng
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
