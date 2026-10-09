"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, use } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { useAuth } from "@/lib/store/auth-store";
import { adminActions, useAdminData } from "@/lib/services/admin";
import { formatVND, formatDateTime } from "@/lib/format";
import { Breadcrumbs } from "@/components/ui/data";
import { EmptyState, Spinner } from "@/components/ui/feedback";
import { OrderStatusBadge, orderStatusLabel, paymentMethodLabel, shippingMethodLabel } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/lib/types";

const TIMELINE_ORDER: OrderStatus[] = ["pending", "confirmed", "shipping", "delivered"];

// Nội dung đọc params async nên bọc trong Suspense để không chặn prerender.
function CustomerOrderDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { loading } = useAuth();
  const { data: order } = useAdminData(() => adminActions.getOrderByCode(id), [id]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!order) {
    return (
      <div>
        <EmptyState
          title="Không tìm thấy đơn hàng"
          description="Đơn hàng không tồn tại hoặc bạn không có quyền xem."
          action={
            <Link
              href="/account/orders"
              className="inline-flex h-10 items-center rounded-xl bg-brand-600 px-5 text-sm font-bold text-white hover:bg-brand-700"
            >
              <ArrowLeft className="h-4 w-4" /> Về danh sách đơn hàng
            </Link>
          }
        />
      </div>
    );
  }

  const currentStep = order.status === "cancelled" ? -1 : TIMELINE_ORDER.indexOf(order.status);

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Tài khoản", href: "/account" },
          { label: "Đơn hàng", href: "/account/orders" },
          { label: order.code },
        ]}
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-ink-900">Đơn hàng {order.code}</h1>
        <OrderStatusBadge status={order.status} />
      </div>

      {/* Timeline */}
      <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-5 md:p-6">
        <h2 className="text-base font-bold text-ink-900">Hành trình đơn hàng</h2>
        {order.status === "cancelled" ? (
          <p className="mt-3 text-sm text-red-600">
            Đơn hàng đã bị hủy
            {order.timeline.find((t) => t.status === "cancelled")?.note &&
              ` — ${order.timeline.find((t) => t.status === "cancelled")?.note}`}
          </p>
        ) : (
          <ol className="mt-5 space-y-0">
            {TIMELINE_ORDER.map((s, i) => {
              const done = i <= currentStep;
              const step = order.timeline.find((t) => t.status === s);
              return (
                <li key={s} className="relative flex gap-4 pb-6 last:pb-0">
                  {i < TIMELINE_ORDER.length - 1 && (
                    <span
                      className={cn(
                        "absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5",
                        i < currentStep ? "bg-emerald-500" : "bg-slate-200",
                      )}
                    />
                  )}
                  <span
                    className={cn(
                      "z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2",
                      done
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-slate-200 bg-white text-ink-400",
                    )}
                  >
                    {done && <Check className="h-4 w-4" />}
                  </span>
                  <div className="pt-0.5">
                    <p className={cn("text-sm font-bold", done ? "text-ink-900" : "text-ink-400")}>
                      {orderStatusLabel(s)}
                    </p>
                    {step && (
                      <p className="text-xs text-ink-400">{formatDateTime(step.at)}</p>
                    )}
                    {step?.note && <p className="mt-0.5 text-xs text-ink-500">{step.note}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Items */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5">
          <h2 className="text-base font-bold text-ink-900">Sản phẩm</h2>
          <ul className="mt-4 space-y-3">
            {order.items.map((item, i) => (
              <li key={i} className="flex gap-3">
                <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-50">
                  <Image src={item.image} alt={item.name} fill sizes="56px" className="object-cover" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 block text-sm font-medium text-ink-900">
                    {item.name}
                  </span>
                  <span className="text-xs text-ink-400">Số lượng: {item.quantity}</span>
                </span>
                <span className="shrink-0 text-sm font-bold text-ink-900">
                  {formatVND(item.price * item.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-500">Tạm tính</dt>
              <dd className="font-semibold">{formatVND(order.subtotal)}</dd>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <dt>Giảm giá{order.couponCode ? ` (${order.couponCode})` : ""}</dt>
                <dd className="font-semibold">-{formatVND(order.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-ink-500">Vận chuyển</dt>
              <dd className="font-semibold">
                {order.shippingFee === 0 ? "Miễn phí" : formatVND(order.shippingFee)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2 text-base">
              <dt className="font-bold">Tổng cộng</dt>
              <dd className="font-extrabold text-brand-700">{formatVND(order.total)}</dd>
            </div>
          </dl>
        </div>

        {/* Shipping & payment */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-5">
            <h2 className="text-base font-bold text-ink-900">Thông tin giao hàng</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="shrink-0 text-ink-500">Người nhận</dt>
                <dd className="text-right font-semibold">{order.customerName} · {order.phone}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="shrink-0 text-ink-500">Địa chỉ</dt>
                <dd className="text-right font-semibold">
                  {order.street}, {order.district}, {order.city}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="shrink-0 text-ink-500">Vận chuyển</dt>
                <dd className="text-right font-semibold">{shippingMethodLabel(order.shippingMethod)}</dd>
              </div>
              {order.note && (
                <div className="flex justify-between gap-4">
                  <dt className="shrink-0 text-ink-500">Ghi chú</dt>
                  <dd className="text-right font-semibold">{order.note}</dd>
                </div>
              )}
            </dl>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5">
            <h2 className="text-base font-bold text-ink-900">Thanh toán</h2>
            <p className="mt-2 text-sm text-ink-700">{paymentMethodLabel(order.paymentMethod)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CustomerOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <CustomerOrderDetailContent params={params} />
    </Suspense>
  );
}
