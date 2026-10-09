"use client";

import { Suspense, use, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { useAdmin } from "@/lib/services/admin";
import { useToast } from "@/lib/store/toast-store";
import { formatVND, formatDateTime } from "@/lib/format";
import { Breadcrumbs } from "@/components/ui/data";
import { EmptyState } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/overlay";
import {
  OrderStatusBadge,
  orderStatusLabel,
  paymentMethodLabel,
  shippingMethodLabel,
} from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/lib/types";

const NEXT_STATUS: Partial<Record<OrderStatus, { next: OrderStatus; label: string }>> = {
  pending: { next: "confirmed", label: "Xác nhận đơn" },
  confirmed: { next: "shipping", label: "Bắt đầu giao hàng" },
  shipping: { next: "delivered", label: "Hoàn tất giao hàng" },
};

// Nội dung đọc params async nên bọc trong Suspense để không chặn prerender.
function AdminOrderDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { state, actions } = useAdmin();
  const { toast } = useToast();
  const [confirming, setConfirming] = useState<OrderStatus | null>(null);

  const order = state.orders.find((o) => o.id === id);

  if (!order) {
    return (
      <EmptyState
        title="Không tìm thấy đơn hàng"
        action={
          <Link
            href="/admin/orders"
            className="inline-flex h-10 items-center rounded-xl bg-brand-600 px-5 text-sm font-bold text-white hover:bg-brand-700"
          >
            <ArrowLeft className="h-4 w-4" /> Về danh sách
          </Link>
        }
      />
    );
  }

  const next = NEXT_STATUS[order.status];
  const canCancel = order.status === "pending" || order.status === "confirmed";

  const applyStatus = async (status: OrderStatus) => {
    await actions.updateOrderStatus(order.id, status, `Admin cập nhật: ${orderStatusLabel(status)}`);
    toast(`Đã chuyển đơn ${order.code} sang "${orderStatusLabel(status)}".`);
    setConfirming(null);
  };

  return (
    <div className="space-y-5">
      <Breadcrumbs
        items={[{ label: "Đơn hàng", href: "/admin/orders" }, { label: order.code }]}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/orders" className="rounded-lg p-2 text-ink-500 hover:bg-white" aria-label="Quay lại">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-extrabold text-ink-900">{order.code}</h1>
          <OrderStatusBadge status={order.status} />
        </div>
        <div className="flex gap-2">
          {canCancel && (
            <Button variant="danger" size="sm" onClick={() => setConfirming("cancelled")}>
              Hủy đơn
            </Button>
          )}
          {next && (
            <Button size="sm" onClick={() => setConfirming(next.next)}>
              {next.label}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-base font-bold text-ink-900">Sản phẩm trong đơn</h2>
            <ul className="mt-4 space-y-3">
              {order.items.map((item, i) => (
                <li key={i} className="flex gap-3">
                  <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-50">
                    <Image src={item.image} alt={item.name} fill sizes="56px" className="object-cover" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 block text-sm font-medium text-ink-900">{item.name}</span>
                    <span className="text-xs text-ink-400">
                      {formatVND(item.price)} × {item.quantity}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-bold">{formatVND(item.price * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-ink-500">Tạm tính</dt><dd className="font-semibold">{formatVND(order.subtotal)}</dd></div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <dt>Giảm giá{order.couponCode ? ` (${order.couponCode})` : ""}</dt>
                  <dd className="font-semibold">-{formatVND(order.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between"><dt className="text-ink-500">Vận chuyển</dt><dd className="font-semibold">{order.shippingFee === 0 ? "Miễn phí" : formatVND(order.shippingFee)}</dd></div>
              <div className="flex justify-between border-t border-slate-100 pt-2 text-base">
                <dt className="font-bold">Tổng cộng</dt>
                <dd className="font-extrabold text-brand-700">{formatVND(order.total)}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-base font-bold text-ink-900">Lịch sử trạng thái</h2>
            <ol className="mt-4">
              {order.timeline.map((t, i) => (
                <li key={i} className="relative flex gap-4 pb-5 last:pb-0">
                  {i < order.timeline.length - 1 && (
                    <span className="absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5 bg-slate-200" />
                  )}
                  <span className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
                    <Check className="h-4 w-4" />
                  </span>
                  <div className="pt-0.5">
                    <p className="text-sm font-bold text-ink-900">{orderStatusLabel(t.status)}</p>
                    <p className="text-xs text-ink-400">{formatDateTime(t.at)}</p>
                    {t.note && <p className="mt-0.5 text-xs text-ink-500">{t.note}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-base font-bold text-ink-900">Khách hàng</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-ink-500">Tên</dt><dd className="text-right font-semibold">{order.customerName}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-ink-500">SĐT</dt><dd className="font-semibold">{order.phone}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-ink-500">Email</dt><dd className="break-all text-right font-semibold">{order.email}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-ink-500">Địa chỉ</dt><dd className="text-right font-semibold">{order.street}, {order.district}, {order.city}</dd></div>
              {order.note && <div className="flex justify-between gap-3"><dt className="text-ink-500">Ghi chú</dt><dd className="text-right font-semibold">{order.note}</dd></div>}
            </dl>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-base font-bold text-ink-900">Thanh toán & vận chuyển</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-ink-500">Thanh toán</dt><dd className="text-right font-semibold">{paymentMethodLabel(order.paymentMethod)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-ink-500">Vận chuyển</dt><dd className="text-right font-semibold">{shippingMethodLabel(order.shippingMethod)}</dd></div>
            </dl>
          </div>
          <p className={cn("rounded-xl px-4 py-2.5 text-xs", "bg-amber-50 text-amber-800")}>
            Cập nhật trạng thái demo — thay đổi chỉ lưu trên trình duyệt này.
          </p>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirming}
        onClose={() => setConfirming(null)}
        onConfirm={() => confirming && applyStatus(confirming)}
        title={confirming === "cancelled" ? "Hủy đơn hàng" : "Cập nhật trạng thái"}
        message={
          confirming === "cancelled"
            ? `Bạn có chắc muốn hủy đơn ${order.code}?`
            : `Chuyển đơn ${order.code} sang trạng thái "${confirming ? orderStatusLabel(confirming) : ""}"?`
        }
        confirmLabel={confirming === "cancelled" ? "Hủy đơn" : "Xác nhận"}
        danger={confirming === "cancelled"}
      />
    </div>
  );
}

export default function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-400">
          Đang tải chi tiết đơn hàng...
        </div>
      }
    >
      <AdminOrderDetailContent params={params} />
    </Suspense>
  );
}
