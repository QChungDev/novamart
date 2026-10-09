"use client";

/**
 * Admin settings — Phase 2: store configuration lives in the backend.
 * This page shows system information instead of editable local settings.
 */

import { Server, Database, Globe } from "lucide-react";
import { apiBaseUrl, isApiConfigured } from "@/lib/api/client";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">Cài đặt hệ thống</h1>
        <p className="mt-1 text-sm text-ink-500">
          Cấu hình cửa hàng hiện được quản lý ở phía backend (FastAPI).
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Server className="h-5 w-5" />
            </span>
            <h2 className="font-bold text-ink-900">Backend API</h2>
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-500">Trạng thái</dt>
              <dd className="font-semibold text-emerald-600">
                {isApiConfigured() ? "Đã kết nối" : "Chưa cấu hình"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-500">Base URL</dt>
              <dd className="font-mono text-xs text-ink-900 break-all text-right">
                {apiBaseUrl() || "(chưa đặt NEXT_PUBLIC_API_BASE_URL)"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">API version</dt>
              <dd className="font-semibold text-ink-900">/api/v1</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Tài liệu API</dt>
              <dd>
                {isApiConfigured() ? (
                  <a
                    href={`${apiBaseUrl()}/docs`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-brand-700 hover:underline"
                  >
                    Swagger UI
                  </a>
                ) : (
                  <span className="text-ink-400">—</span>
                )}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Database className="h-5 w-5" />
            </span>
            <h2 className="font-bold text-ink-900">Quy tắc kinh doanh</h2>
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-500">Miễn phí vận chuyển</dt>
              <dd className="font-semibold text-ink-900">Đơn từ 500.000 ₫</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Phí giao tiêu chuẩn</dt>
              <dd className="font-semibold text-ink-900">30.000 ₫</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Phí giao nhanh</dt>
              <dd className="font-semibold text-ink-900">50.000 ₫</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Ngưỡng cảnh báo hết hàng</dt>
              <dd className="font-semibold text-ink-900">≤ 10 sản phẩm</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <Globe className="h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-sm">
            <p className="font-bold text-amber-900">Lưu ý Phase 2</p>
            <p className="mt-1 text-amber-800">
              Tên cửa hàng, hotline và các thông tin hiển thị khác được cấu hình trong
              code frontend hoặc biến môi trường. Giá trị tiền tệ, tồn kho và khuyến mãi
              do backend tính toán và kiểm soát.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
