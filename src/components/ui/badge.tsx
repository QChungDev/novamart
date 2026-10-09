import { cn } from "@/lib/utils";
import type { CouponType, OrderStatus, PaymentMethod, ShippingMethod } from "@/lib/types";

type BadgeTone = "blue" | "green" | "amber" | "red" | "slate" | "purple";

const TONES: Record<BadgeTone, string> = {
  blue: "bg-brand-50 text-brand-700",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
  slate: "bg-slate-100 text-ink-700",
  purple: "bg-violet-50 text-violet-700",
};

export function Badge({
  tone = "slate",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const ORDER_STATUS_META: Record<OrderStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: "Chờ xác nhận", tone: "amber" },
  confirmed: { label: "Đã xác nhận", tone: "blue" },
  shipping: { label: "Đang giao", tone: "purple" },
  delivered: { label: "Đã giao", tone: "green" },
  cancelled: { label: "Đã hủy", tone: "red" },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const meta = ORDER_STATUS_META[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export function orderStatusLabel(status: OrderStatus): string {
  return ORDER_STATUS_META[status].label;
}

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cod: "Thanh toán khi nhận hàng (COD)",
  demo_card: "Thẻ demo (mô phỏng)",
  demo_wallet: "Ví điện tử demo (mô phỏng)",
};

export function paymentMethodLabel(m: PaymentMethod): string {
  return PAYMENT_LABELS[m];
}

const SHIPPING_LABELS: Record<ShippingMethod, string> = {
  standard: "Giao hàng tiêu chuẩn",
  express: "Giao hàng nhanh",
};

export function shippingMethodLabel(m: ShippingMethod): string {
  return SHIPPING_LABELS[m];
}

export function couponTypeLabel(t: CouponType): string {
  return t === "percent" ? "Phần trăm" : "Số tiền";
}
