import { notFound } from "next/navigation";
import { shopService } from "@/lib/services/shop";
import { ProductDetailClient } from "@/components/storefront/ProductDetail";

// Dữ liệu mẫu là tĩnh nên prerender toàn bộ trang sản phẩm tại build time.
export function generateStaticParams() {
  return shopService.getProducts().items.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = shopService.getProductBySlug(slug);
  return {
    title: product ? product.name : "Không tìm thấy sản phẩm",
    description: product?.description.slice(0, 160),
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = shopService.getProductBySlug(slug);
  if (!product) notFound();

  return <ProductDetailClient product={product} />;
}
