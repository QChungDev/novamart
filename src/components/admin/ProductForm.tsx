"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select, Textarea } from "@/components/ui/input";
import type { Category, Product, ProductStatus } from "@/lib/types";

export interface ProductFormValue {
  name: string;
  sku: string;
  categoryId: string;
  description: string;
  price: string;
  salePrice: string;
  stock: string;
  images: string[];
  status: ProductStatus;
}

export function productToForm(p?: Product): ProductFormValue {
  return {
    name: p?.name ?? "",
    sku: p?.sku ?? "",
    categoryId: p?.categoryId ?? "",
    description: p?.description ?? "",
    price: p ? String(p.price) : "",
    salePrice: p?.salePrice ? String(p.salePrice) : "",
    stock: p ? String(p.stock) : "0",
    images: p?.images ?? [],
    status: p?.status ?? "active",
  };
}

export function ProductForm({
  initial,
  categories,
  onSubmit,
  submitLabel,
  submitting,
}: {
  initial: ProductFormValue;
  categories: Category[];
  onSubmit: (value: ProductFormValue) => void;
  submitLabel: string;
  submitting?: boolean;
}) {
  const [form, setForm] = useState<ProductFormValue>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imageInput, setImageInput] = useState("");

  const set = (patch: Partial<ProductFormValue>) => {
    setForm((f) => ({ ...f, ...patch }));
    setErrors((e) => {
      const next = { ...e };
      for (const k of Object.keys(patch)) delete next[k];
      return next;
    });
  };

  const addImage = () => {
    const url = imageInput.trim();
    if (!url) return;
    if (!/^https?:\/\/.+/.test(url)) {
      setErrors((e) => ({ ...e, images: "URL hình ảnh phải bắt đầu bằng http(s)://" }));
      return;
    }
    setForm((f) => ({ ...f, images: [...f.images, url] }));
    setImageInput("");
    setErrors((e) => {
      const next = { ...e };
      delete next.images;
      return next;
    });
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 3) e.name = "Tên sản phẩm phải có ít nhất 3 ký tự.";
    if (!form.sku.trim()) e.sku = "Vui lòng nhập mã SKU.";
    if (!form.categoryId) e.categoryId = "Vui lòng chọn danh mục.";
    const price = Number(form.price);
    if (!form.price || Number.isNaN(price) || price <= 0)
      e.price = "Giá bán phải là số dương.";
    if (form.salePrice) {
      const sale = Number(form.salePrice);
      if (Number.isNaN(sale) || sale <= 0) e.salePrice = "Giá khuyến mãi phải là số dương.";
      else if (!Number.isNaN(price) && sale >= price)
        e.salePrice = "Giá khuyến mãi phải nhỏ hơn giá bán.";
    }
    const stock = Number(form.stock);
    if (form.stock === "" || Number.isNaN(stock) || stock < 0 || !Number.isInteger(stock))
      e.stock = "Tồn kho phải là số nguyên không âm.";
    if (form.images.length === 0) e.images = "Cần ít nhất 1 hình ảnh sản phẩm.";
    if (form.description.trim().length < 10)
      e.description = "Mô tả phải có ít nhất 10 ký tự.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (validate()) onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
          <h2 className="mb-4 text-base font-bold text-ink-900">Thông tin cơ bản</h2>
          <div className="space-y-4">
            <FormField label="Tên sản phẩm" required error={errors.name}>
              <Input
                value={form.name}
                onChange={(e) => set({ name: e.target.value })}
                placeholder="Ví dụ: Tai nghe Sony WH-1000XM5"
              />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Mã SKU" required error={errors.sku}>
                <Input
                  value={form.sku}
                  onChange={(e) => set({ sku: e.target.value.toUpperCase() })}
                  placeholder="SONY-WH1000XM5"
                />
              </FormField>
              <FormField label="Danh mục" required error={errors.categoryId}>
                <Select value={form.categoryId} onChange={(e) => set({ categoryId: e.target.value })}>
                  <option value="">-- Chọn danh mục --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
            <FormField label="Mô tả" required error={errors.description}>
              <Textarea
                value={form.description}
                onChange={(e) => set({ description: e.target.value })}
                placeholder="Mô tả chi tiết sản phẩm..."
                rows={5}
              />
            </FormField>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
          <h2 className="mb-4 text-base font-bold text-ink-900">Hình ảnh</h2>
          <div className="flex gap-2">
            <Input
              value={imageInput}
              onChange={(e) => setImageInput(e.target.value)}
              placeholder="Dán URL hình ảnh rồi bấm Thêm"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addImage();
                }
              }}
            />
            <Button type="button" variant="secondary" onClick={addImage}>
              <Plus className="h-4 w-4" /> Thêm
            </Button>
          </div>
          {errors.images && <p className="mt-1.5 text-xs text-red-600">{errors.images}</p>}
          {form.images.length > 0 && (
            <ul className="mt-3 space-y-2">
              {form.images.map((src, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Ảnh ${i + 1}`} className="h-10 w-10 rounded-lg object-cover" />
                  <span className="min-w-0 flex-1 truncate text-xs text-ink-500">{src}</span>
                  {i === 0 && (
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700">
                      Ảnh chính
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => set({ images: form.images.filter((_, j) => j !== i) })}
                    className="cursor-pointer rounded-lg p-1 text-ink-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="Xóa ảnh"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-base font-bold text-ink-900">Giá & kho</h2>
          <div className="space-y-4">
            <FormField label="Giá bán (₫)" required error={errors.price}>
              <Input
                value={form.price}
                onChange={(e) => set({ price: e.target.value.replace(/[^\d]/g, "") })}
                placeholder="7490000"
                inputMode="numeric"
              />
            </FormField>
            <FormField label="Giá khuyến mãi (₫)" error={errors.salePrice} hint="Để trống nếu không giảm giá">
              <Input
                value={form.salePrice}
                onChange={(e) => set({ salePrice: e.target.value.replace(/[^\d]/g, "") })}
                placeholder="6990000"
                inputMode="numeric"
              />
            </FormField>
            <FormField label="Tồn kho" required error={errors.stock}>
              <Input
                value={form.stock}
                onChange={(e) => set({ stock: e.target.value.replace(/[^\d]/g, "") })}
                placeholder="0"
                inputMode="numeric"
              />
            </FormField>
            <FormField label="Trạng thái">
              <Select
                value={form.status}
                onChange={(e) => set({ status: e.target.value as ProductStatus })}
              >
                <option value="active">Đang bán</option>
                <option value="inactive">Ngừng bán</option>
              </Select>
            </FormField>
          </div>
        </div>
        <Button type="submit" className="w-full" size="lg" loading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
