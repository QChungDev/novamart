"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { shopService } from "@/lib/services/shop";
import { useStoreQuery } from "@/lib/data/use-api-query";
import { Breadcrumbs, Pagination } from "@/components/ui/data";
import { EmptyState, Spinner } from "@/components/ui/feedback";
import { ProductCard } from "@/components/storefront/ProductCard";
import {
  ActiveFilters,
  EMPTY_FILTERS,
  FilterSidebar,
  SortSelect,
  type FilterState,
} from "@/components/storefront/ProductFilters";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 12;

function ListingClient() {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Sync filter state from URL (?q=, ?category=, ?onSale=, ?sort=).
  // URL is an external system, so syncing in an effect is intentional.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFilters((prev) => ({
      ...prev,
      categorySlug: searchParams.get("category") ?? "",
      onSaleOnly: searchParams.get("onSale") === "1" ? true : prev.onSaleOnly,
      sort: (searchParams.get("sort") as FilterState["sort"]) || prev.sort,
    }));
    setPage(1);
  }, [searchParams]);

  const q = searchParams.get("q") ?? "";

  const filterKey = JSON.stringify({
    q,
    ...filters,
    page,
    pageSize: PAGE_SIZE,
  });

  const listing = useStoreQuery("products-" + filterKey, () =>
    shopService.getProducts({
      q,
      categorySlug: filters.categorySlug || undefined,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      inStockOnly: filters.inStockOnly,
      onSaleOnly: filters.onSaleOnly,
      sort: filters.sort,
      page,
      pageSize: PAGE_SIZE,
    }),
  );

  const items = listing?.items ?? [];
  const total = listing?.total ?? 0;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const category = useStoreQuery(
    "cat-" + (filters.categorySlug || "none"),
    () =>
      filters.categorySlug
        ? shopService.getCategoryBySlug(filters.categorySlug)
        : Promise.resolve(undefined),
  );

  const removeFilter = (key: keyof FilterState) => {
    if (key === "minPrice") setFilters((f) => ({ ...f, minPrice: undefined, maxPrice: undefined }));
    else if (key === "categorySlug") setFilters((f) => ({ ...f, categorySlug: "" }));
    else if (key === "inStockOnly") setFilters((f) => ({ ...f, inStockOnly: false }));
    else if (key === "onSaleOnly") setFilters((f) => ({ ...f, onSaleOnly: false }));
    setPage(1);
  };

  const updateFilters = (f: FilterState) => {
    setFilters(f);
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Breadcrumbs
        items={[
          { label: "Trang chủ", href: "/" },
          { label: category ? category.name : q ? `Tìm kiếm: "${q}"` : "Tất cả sản phẩm" },
        ]}
      />
      <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-ink-900 md:text-3xl">
        {category ? category.name : q ? `Kết quả cho "${q}"` : "Tất cả sản phẩm"}
      </h1>
      <p className="mt-1 text-sm text-ink-500">
        Tìm thấy <span className="font-bold text-ink-900">{total}</span> sản phẩm
      </p>

      <div className="mt-6 flex gap-8">
        {/* Sidebar (desktop) */}
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-36 rounded-2xl border border-slate-100 bg-white p-5">
            <FilterSidebar filters={filters} onChange={updateFilters} />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-4 flex items-center justify-between gap-3">
            <Button
              variant="secondary"
              size="sm"
              className="lg:hidden"
              onClick={() => setMobileFiltersOpen(true)}
            >
              <SlidersHorizontal className="h-4 w-4" /> Bộ lọc
            </Button>
            <div className="ml-auto">
              <SortSelect value={filters.sort} onChange={(sort) => updateFilters({ ...filters, sort })} />
            </div>
          </div>

          <ActiveFilters
            filters={filters}
            onRemove={removeFilter}
            onClear={() => updateFilters({ ...EMPTY_FILTERS, sort: filters.sort })}
          />

          {items.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="Không tìm thấy sản phẩm"
                description="Hãy thử thay đổi từ khóa tìm kiếm hoặc nới lỏng điều kiện lọc."
                action={
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => updateFilters({ ...EMPTY_FILTERS, sort: filters.sort })}
                  >
                    Xóa bộ lọc
                  </Button>
                }
              />
            </div>
          ) : (
            <>
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                {items.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              <div className="mt-8">
                <Pagination page={page} totalPages={totalPages} onChange={setPage} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink-950/50"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Bộ lọc</h2>
              <Button variant="ghost" size="sm" onClick={() => setMobileFiltersOpen(false)}>
                Đóng
              </Button>
            </div>
            <FilterSidebar filters={filters} onChange={updateFilters} />
            <Button className="mt-6 w-full" onClick={() => setMobileFiltersOpen(false)}>
              Xem {total} sản phẩm
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <ListingClient />
    </Suspense>
  );
}
