"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { shopService } from "@/lib/services/shop";
import { useStoreQuery } from "@/lib/data/use-store-query";
import { ProductDetailClient } from "@/components/storefront/ProductDetail";
import { Spinner } from "@/components/ui/feedback";
import type { Product } from "@/lib/types";

function DetailContent() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const product = useStoreQuery<Product | undefined>(
    "product-" + slug,
    () => shopService.getProductBySlug(slug),
  );

  if (product === null) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (product === undefined) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <h1 className="text-2xl font-extrabold text-ink-900">Không tìm thấy sản phẩm</h1>
        <p className="mt-2 text-sm text-ink-500">
          Sản phẩm không tồn tại hoặc đã ngừng kinh doanh.
        </p>
        <Link
          href="/products"
          className="mt-6 inline-flex h-11 items-center rounded-xl bg-brand-600 px-6 font-bold text-white hover:bg-brand-500"
        >
          Xem tất cả sản phẩm
        </Link>
      </div>
    );
  }

  return <ProductDetailClient key={product.id} product={product} />;
}

export default function ProductDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <DetailContent />
    </Suspense>
  );
}
