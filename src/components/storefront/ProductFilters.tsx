"use client";

import { shopService, type ProductSort } from "@/lib/services/shop";
import { useStoreQuery } from "@/lib/data/use-api-query";
import { formatVND } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/input";
import { X } from "lucide-react";
import type { Category } from "@/lib/types";

export interface FilterState {
  categorySlug: string;
  minPrice: number | undefined;
  maxPrice: number | undefined;
  inStockOnly: boolean;
  onSaleOnly: boolean;
  sort: ProductSort;
}

export const EMPTY_FILTERS: FilterState = {
  categorySlug: "",
  minPrice: undefined,
  maxPrice: undefined,
  inStockOnly: false,
  onSaleOnly: false,
  sort: "popular",
};

const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: "popular", label: "Phổ biến nhất" },
  { value: "newest", label: "Mới nhất" },
  { value: "price-asc", label: "Giá tăng dần" },
  { value: "price-desc", label: "Giá giảm dần" },
  { value: "rating", label: "Đánh giá cao nhất" },
];

const PRICE_RANGES = [
  { label: "Dưới 3 triệu", min: 0, max: 3000000 },
  { label: "3 – 10 triệu", min: 3000000, max: 10000000 },
  { label: "10 – 20 triệu", min: 10000000, max: 20000000 },
  { label: "Trên 20 triệu", min: 20000000, max: undefined },
];

export function SortSelect({
  value,
  onChange,
}: {
  value: ProductSort;
  onChange: (v: ProductSort) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as ProductSort)}
      className="h-10 cursor-pointer rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-ink-700 focus:border-brand-500 focus:outline-none"
      aria-label="Sắp xếp sản phẩm"
    >
      {SORT_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** Active filter chips shown above the product grid. */
export function ActiveFilters({
  filters,
  onRemove,
  onClear,
}: {
  filters: FilterState;
  onRemove: (key: keyof FilterState) => void;
  onClear: () => void;
}) {
  const chips: { key: keyof FilterState; label: string }[] = [];
  const data = useStoreQuery<Category[]>("filter-categories", () =>
    shopService.getCategories(),
  );
  const categories = data ?? [];
  if (filters.categorySlug) {
    const c = categories.find((x) => x.slug === filters.categorySlug);
    if (c) chips.push({ key: "categorySlug", label: c.name });
  }
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    const from = filters.minPrice ? formatVND(filters.minPrice) : "0 ₫";
    const to = filters.maxPrice ? formatVND(filters.maxPrice) : "∞";
    chips.push({ key: "minPrice", label: `${from} – ${to}` });
  }
  if (filters.inStockOnly) chips.push({ key: "inStockOnly", label: "Còn hàng" });
  if (filters.onSaleOnly) chips.push({ key: "onSaleOnly", label: "Đang giảm giá" });

  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <button
          key={chip.key}
          onClick={() => onRemove(chip.key)}
          className="flex cursor-pointer items-center gap-1.5 rounded-full bg-brand-50 py-1.5 pl-3 pr-2 text-xs font-semibold text-brand-700 hover:bg-brand-100"
        >
          {chip.label} <X className="h-3.5 w-3.5" />
        </button>
      ))}
      <button
        onClick={onClear}
        className="cursor-pointer text-xs font-semibold text-ink-500 underline hover:text-ink-900"
      >
        Xóa tất cả
      </button>
    </div>
  );
}

export function FilterSidebar({
  filters,
  onChange,
}: {
  filters: FilterState;
  onChange: (f: FilterState) => void;
}) {
  const data = useStoreQuery<Category[]>("filter-categories", () =>
    shopService.getCategories(),
  );
  const categories = data ?? [];
  const set = (patch: Partial<FilterState>) => onChange({ ...filters, ...patch });

  const togglePrice = (min: number, max: number | undefined) => {
    const active = filters.minPrice === min && filters.maxPrice === max;
    set(active ? { minPrice: undefined, maxPrice: undefined } : { minPrice: min, maxPrice: max });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-900">
          Danh mục
        </h3>
        <ul className="space-y-1">
          <li>
            <button
              onClick={() => set({ categorySlug: "" })}
              className={`w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                !filters.categorySlug
                  ? "bg-brand-50 text-brand-700"
                  : "text-ink-600 hover:bg-slate-50"
              }`}
            >
              Tất cả sản phẩm
            </button>
          </li>
          {categories.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => set({ categorySlug: c.slug })}
                className={`w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                  filters.categorySlug === c.slug
                    ? "bg-brand-50 text-brand-700"
                    : "text-ink-600 hover:bg-slate-50"
                }`}
              >
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-900">
          Khoảng giá
        </h3>
        <div className="flex flex-wrap gap-2">
          {PRICE_RANGES.map((r) => {
            const active = filters.minPrice === r.min && filters.maxPrice === r.max;
            return (
              <button
                key={r.label}
                onClick={() => togglePrice(r.min, r.max)}
                className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-slate-200 text-ink-600 hover:border-brand-300 hover:text-brand-700"
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-900">
          Tùy chọn
        </h3>
        <div className="space-y-2.5">
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-700">
            <Checkbox
              checked={filters.inStockOnly}
              onChange={(e) => set({ inStockOnly: e.target.checked })}
            />
            Chỉ hiện sản phẩm còn hàng
          </label>
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-700">
            <Checkbox
              checked={filters.onSaleOnly}
              onChange={(e) => set({ onSaleOnly: e.target.checked })}
            />
            <span className="flex items-center gap-2">
              Đang giảm giá <Badge tone="red">Sale</Badge>
            </span>
          </label>
        </div>
      </div>

      <Button
        variant="secondary"
        size="sm"
        className="w-full"
        onClick={() => onChange({ ...EMPTY_FILTERS, sort: filters.sort })}
      >
        Đặt lại bộ lọc
      </Button>
    </div>
  );
}
