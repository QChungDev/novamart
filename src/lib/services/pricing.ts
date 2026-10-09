/**
 * Pricing helpers — Phase 2: coupon validation via FastAPI backend.
 * Shipping fees match backend rules (free over 500K).
 */

import { adminActions } from "./admin";
import type { ShippingMethod } from "../types";

export type CouponCheck =
  | { ok: true; discount: number }
  | { ok: false; error: string };

export async function validateCoupon(code: string, subtotal: number): Promise<CouponCheck> {
  const result = await adminActions.validateCoupon(code, subtotal);
  if (result.ok) return { ok: true, discount: result.discount };
  return { ok: false, error: result.error || "Mã giảm giá không hợp lệ." };
}

const FREE_SHIPPING_THRESHOLD = 500_000;
const STANDARD_FEE = 30_000;
const EXPRESS_FEE = 50_000;

export async function shippingFeeFor(
  method: ShippingMethod,
  subtotal: number,
): Promise<number> {
  if (subtotal >= FREE_SHIPPING_THRESHOLD) return 0;
  return method === "express" ? EXPRESS_FEE : STANDARD_FEE;
}

/** Đồng bộ — chỉ dùng cho nơi đã có settings trong tay. */
export function shippingFeeForSync(
  method: ShippingMethod,
  subtotal: number,
  settings: { freeShippingThreshold: number; standardShippingFee: number; expressShippingFee: number },
): number {
  if (subtotal >= settings.freeShippingThreshold) return 0;
  return method === "express" ? settings.expressShippingFee : settings.standardShippingFee;
}
