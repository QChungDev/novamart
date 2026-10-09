"use client";

import { shopService } from "@/lib/services/shop";
import { useStoreQuery } from "@/lib/data/use-store-query";
import type { Product } from "@/lib/types";
import {
  BenefitsBar,
  CategoryGrid,
  Hero,
  ProductRow,
  PromoBanner,
} from "@/components/storefront/home-sections";
import { RecentlyViewed } from "@/components/storefront/RecentlyViewed";
import { Newsletter } from "@/components/storefront/Newsletter";
import { ProductRowSkeleton } from "@/components/ui/feedback";

interface HomeData {
  featured: Product[];
  bestSellers: Product[];
  newArrivals: Product[];
}

export default function HomePage() {
  const data = useStoreQuery<HomeData>("home", async () => {
    const [featured, bestSellers, newArrivals] = await Promise.all([
      shopService.getFeatured(8),
      shopService.getBestSellers(8),
      shopService.getNewArrivals(4),
    ]);
    return { featured, bestSellers, newArrivals };
  });

  return (
    <div className="mx-auto max-w-7xl space-y-12 px-4 py-6">
      <Hero />
      <CategoryGrid />
      {!data ? (
        <>
          <ProductRowSkeleton />
          <ProductRowSkeleton />
        </>
      ) : (
        <>
          <ProductRow
            title="Sản phẩm nổi bật"
            subtitle="Những sản phẩm được yêu thích nhất tại NovaMart"
            products={data.featured}
            href="/products"
          />
          <PromoBanner />
          <ProductRow
            title="Bán chạy nhất"
            subtitle="Top sản phẩm có lượt mua cao nhất tháng này"
            products={data.bestSellers}
            href="/products?sort=popular"
          />
          <BenefitsBar />
          <ProductRow
            title="Hàng mới về"
            subtitle="Cập nhật những sản phẩm công nghệ mới nhất"
            products={data.newArrivals}
            href="/products?sort=newest"
          />
        </>
      )}
      <RecentlyViewed />
      <Newsletter />
    </div>
  );
}
