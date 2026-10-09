/**
 * Prototype pricing helpers: coupons, shipping fees.
 * Phase 2: these rules move to the FastAPI backend.
 */

import { coupons, defaultSettings } from "../mock-data";
import type { Coupon, ShippingMethod } from "../types";

export type CouponCheck =
  | { ok: true; coupon: Coupon; discount: number }
  | { ok: false; error: string };

export function validateCoupon(code: string, subtotal: number): CouponCheck {
  const normalized = code.trim().toUpperCase();
  const coupon = coupons.find((c) => c.code.toUpperCase() === normalized);
  if (!coupon) return { ok: false, error: "Mã giảm giá không tồn tại." };
  if (coupon.status !== "active")
    return { ok: false, error: "Mã giảm giá đã hết hiệu lực." };
  const now = new Date();
  if (new Date(coupon.startDate) > now || new Date(coupon.endDate) < now)
    return { ok: false, error: "Mã giảm giá đã hết hạn sử dụng." };
  if (subtotal < coupon.minOrder)
    return {
      ok: false,
      error: `Đơn hàng phải từ ${coupon.minOrder.toLocaleString("vi-VN")} ₫ mới dùng được mã này.`,
    };
  if (coupon.used >= coupon.usageLimit)
    return { ok: false, error: "Mã giảm giá đã hết lượt sử dụng." };

  const discount =
    coupon.type === "percent"
      ? Math.round((subtotal * coupon.value) / 100)
      : coupon.value;
  return { ok: true, coupon, discount };
}

export function shippingFeeFor(
  method: ShippingMethod,
  subtotal: number,
  settings = defaultSettings,
): number {
  if (subtotal >= settings.freeShippingThreshold) return 0;
  return method === "express" ? settings.expressShippingFee : settings.standardShippingFee;
}
