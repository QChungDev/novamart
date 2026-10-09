"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ShoppingCart, Tag, Trash2, X } from "lucide-react";
import { useCart } from "@/lib/store/cart-store";
import { useToast } from "@/lib/store/toast-store";
import { validateCoupon, shippingFeeFor } from "@/lib/services/pricing";
import { formatVND } from "@/lib/format";
import { Breadcrumbs, QuantitySelector } from "@/components/ui/data";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { defaultSettings } from "@/lib/mock-data";

export default function CartPage() {
  const { lines, count, subtotal, setQuantity, removeItem, clear } = useCart();
  const { toast } = useToast();
  const [couponCode, setCouponCode] = useState("");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [couponError, setCouponError] = useState("");

  const check = appliedCode ? validateCoupon(appliedCode, subtotal) : null;
  const discount = check && check.ok ? check.discount : 0;
  const shippingFee = shippingFeeFor("standard", subtotal - discount);

  const applyCoupon = () => {
    if (!couponCode.trim()) {
      setCouponError("Vui lòng nhập mã giảm giá.");
      return;
    }
    const result = validateCoupon(couponCode, subtotal);
    if (result.ok) {
      setAppliedCode(result.coupon.code);
      setCouponError("");
      toast(`Áp dụng mã ${result.coupon.code} thành công!`);
    } else {
      setCouponError(result.error);
    }
  };

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <EmptyState
          title="Giỏ hàng trống"
          description="Bạn chưa có sản phẩm nào trong giỏ hàng. Hãy khám phá các sản phẩm công nghệ hấp dẫn tại NovaMart."
          icon={<ShoppingCart className="h-7 w-7" />}
          action={
            <Link href="/products">
              <Button>Tiếp tục mua sắm</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Breadcrumbs items={[{ label: "Trang chủ", href: "/" }, { label: "Giỏ hàng" }]} />
      <h1 className="mt-3 text-2xl font-extrabold text-ink-900">
        Giỏ hàng <span className="text-base font-medium text-ink-400">({count} sản phẩm)</span>
      </h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Lines */}
        <div className="space-y-3 lg:col-span-2">
          {lines.map((line) => (
            <div
              key={line.productId}
              className="flex gap-4 rounded-2xl border border-slate-100 bg-white p-4"
            >
              <Link
                href={`/products/${line.product.slug}`}
                className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-50"
              >
                <Image
                  src={line.product.images[0]}
                  alt={line.product.name}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/products/${line.product.slug}`}
                    className="line-clamp-2 text-sm font-semibold text-ink-900 hover:text-brand-700"
                  >
                    {line.product.name}
                  </Link>
                  <button
                    onClick={() => {
                      removeItem(line.productId);
                      toast("Đã xóa sản phẩm khỏi giỏ hàng", "info");
                    }}
                    className="cursor-pointer rounded-lg p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="Xóa sản phẩm"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-1 text-sm font-extrabold text-brand-700">
                  {formatVND(line.lineTotal / line.quantity)}
                </p>
                <div className="mt-auto flex items-center justify-between pt-2">
                  <QuantitySelector
                    small
                    value={line.quantity}
                    max={Math.min(99, line.product.stock)}
                    onChange={(v) => setQuantity(line.productId, v)}
                  />
                  <p className="text-sm font-bold text-ink-900">{formatVND(line.lineTotal)}</p>
                </div>
              </div>
            </div>
          ))}
          <button
            onClick={() => {
              clear();
              setAppliedCode(null);
              toast("Đã xóa toàn bộ giỏ hàng", "info");
            }}
            className="cursor-pointer text-sm font-medium text-ink-400 underline hover:text-red-600"
          >
            Xóa toàn bộ giỏ hàng
          </button>
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 lg:sticky lg:top-36">
            <h2 className="text-base font-bold text-ink-900">Tóm tắt đơn hàng</h2>

            <div className="mt-4">
              <label className="text-sm font-medium text-ink-700">Mã giảm giá</label>
              {appliedCode && check?.ok ? (
                <div className="mt-2 flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2.5">
                  <span className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                    <Tag className="h-4 w-4" /> {check.coupon.code}
                  </span>
                  <button
                    onClick={() => {
                      setAppliedCode(null);
                      setCouponCode("");
                    }}
                    className="cursor-pointer text-emerald-700 hover:text-emerald-900"
                    aria-label="Gỡ mã giảm giá"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Nhập mã, ví dụ NOVAMART10"
                      className="h-10 flex-1 rounded-xl border border-slate-200 px-3 text-sm uppercase placeholder:normal-case focus:border-brand-500 focus:outline-none"
                    />
                    <Button variant="secondary" size="sm" className="h-10" onClick={applyCoupon}>
                      Áp dụng
                    </Button>
                  </div>
                  {couponError && <p className="mt-1.5 text-xs text-red-600">{couponError}</p>}
                </>
              )}
            </div>

            <dl className="mt-5 space-y-2.5 border-t border-slate-100 pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-500">Tạm tính</dt>
                <dd className="font-semibold text-ink-900">{formatVND(subtotal)}</dd>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <dt>Giảm giá</dt>
                  <dd className="font-semibold">-{formatVND(discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-500">Phí vận chuyển</dt>
                <dd className="font-semibold text-ink-900">
                  {shippingFee === 0 ? (
                    <span className="text-emerald-700">Miễn phí</span>
                  ) : (
                    formatVND(shippingFee)
                  )}
                </dd>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-3 text-base">
                <dt className="font-bold text-ink-900">Tổng cộng</dt>
                <dd className="font-extrabold text-brand-700">
                  {formatVND(subtotal - discount + shippingFee)}
                </dd>
              </div>
            </dl>

            <Link href="/checkout" className="mt-5 block">
              <Button className="w-full" size="lg">
                Tiến hành thanh toán <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/products" className="mt-3 block">
              <Button variant="ghost" className="w-full">
                <ArrowLeft className="h-4 w-4" /> Tiếp tục mua sắm
              </Button>
            </Link>
            <p className="mt-3 text-center text-xs text-ink-400">
              Miễn phí vận chuyển cho đơn từ {formatVND(defaultSettings.freeShippingThreshold)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
