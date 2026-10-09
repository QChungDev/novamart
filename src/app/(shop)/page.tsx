import { shopService } from "@/lib/services/shop";
import {
  BenefitsBar,
  CategoryGrid,
  Hero,
  ProductRow,
  PromoBanner,
} from "@/components/storefront/home-sections";
import { RecentlyViewed } from "@/components/storefront/RecentlyViewed";
import { Newsletter } from "@/components/storefront/Newsletter";

export default function HomePage() {
  const featured = shopService.getFeatured(8);
  const bestSellers = shopService.getBestSellers(8);
  const newArrivals = shopService.getNewArrivals(4);

  return (
    <div className="mx-auto max-w-7xl space-y-12 px-4 py-6">
      <Hero />
      <CategoryGrid />
      <ProductRow
        title="Sản phẩm nổi bật"
        subtitle="Những sản phẩm được yêu thích nhất tại NovaMart"
        products={featured}
        href="/products"
      />
      <PromoBanner />
      <ProductRow
        title="Bán chạy nhất"
        subtitle="Top sản phẩm có lượt mua cao nhất tháng này"
        products={bestSellers}
        href="/products?sort=popular"
      />
      <BenefitsBar />
      <ProductRow
        title="Hàng mới về"
        subtitle="Cập nhật những sản phẩm công nghệ mới nhất"
        products={newArrivals}
        href="/products?sort=newest"
      />
      <RecentlyViewed />
      <Newsletter />
    </div>
  );
}
