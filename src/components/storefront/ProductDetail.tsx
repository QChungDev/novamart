"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check, ShoppingCart, Zap } from "lucide-react";
import { discountPercent, effectivePrice, shopService } from "@/lib/services/shop";
import { useStoreQuery } from "@/lib/data/use-store-query";
import { formatVND, formatCompact } from "@/lib/format";
import { pushRecentView } from "@/lib/recently-viewed";
import { useCart } from "@/lib/store/cart-store";
import { useToast } from "@/lib/store/toast-store";
import { Breadcrumbs, QuantitySelector, Tabs } from "@/components/ui/data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, Rating } from "@/components/ui/feedback";
import { ProductCard } from "@/components/storefront/ProductCard";
import { RecentlyViewed } from "@/components/storefront/RecentlyViewed";
import { cn } from "@/lib/utils";
import type { Category, Product, Review } from "@/lib/types";

interface DetailExtras {
  reviews: Review[];
  related: Product[];
  category?: Category;
}

export function ProductDetailClient({ product }: { product: Product }) {
  const router = useRouter();
  const { addItem } = useCart();
  const { toast } = useToast();
  const [imageIndex, setImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [tab, setTab] = useState<"desc" | "specs" | "reviews">("desc");

  useEffect(() => {
    pushRecentView(product.id);
  }, [product.id]);

  const price = effectivePrice(product);
  const discount = discountPercent(product);
  const extras = useStoreQuery<DetailExtras>(
    "detail-extras-" + product.id,
    async () => {
      const [reviews, related, category] = await Promise.all([
        shopService.getReviews(product.id),
        shopService.getRelated(product, 4),
        shopService.getCategoryById(product.categoryId),
      ]);
      return { reviews, related, category };
    },
  );
  const reviews = extras?.reviews ?? [];
  const related = extras?.related ?? [];
  const category = extras?.category;

  const handleAdd = () => {
    addItem(product.id, quantity);
    toast(`Đã thêm ${quantity} "${product.name}" vào giỏ hàng`);
  };

  const handleBuyNow = () => {
    addItem(product.id, quantity);
    router.push("/checkout");
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Breadcrumbs
        items={[
          { label: "Trang chủ", href: "/" },
          { label: "Sản phẩm", href: "/products" },
          ...(category
            ? [{ label: category.name, href: `/products?category=${category.slug}` }]
            : []),
          { label: product.name },
        ]}
      />

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        {/* Gallery */}
        <div>
          <div className="relative aspect-square overflow-hidden rounded-3xl bg-slate-50">
            <Image
              src={product.images[imageIndex]}
              alt={product.name}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
              priority
            />
            {discount > 0 && (
              <Badge tone="red" className="absolute left-4 top-4 text-sm">
                -{discount}%
              </Badge>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {product.images.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setImageIndex(i)}
                  className={cn(
                    "relative h-20 w-20 cursor-pointer overflow-hidden rounded-xl border-2 bg-slate-50",
                    i === imageIndex ? "border-brand-600" : "border-transparent",
                  )}
                  aria-label={`Xem ảnh ${i + 1}`}
                >
                  <Image src={src} alt="" fill sizes="80px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
            SKU: {product.sku}
          </p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink-900 md:text-3xl">
            {product.name}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <Rating value={product.rating} showValue />
            <span className="text-sm text-ink-400">·</span>
            <span className="text-sm text-ink-500">{product.reviewCount} đánh giá</span>
            <span className="text-sm text-ink-400">·</span>
            <span className="text-sm text-ink-500">
              Đã bán {formatCompact(product.sold)}
            </span>
          </div>

          <div className="mt-5 rounded-2xl bg-slate-50 p-5">
            <div className="flex items-baseline gap-3">
              <p className="text-3xl font-extrabold text-brand-700">{formatVND(price)}</p>
              {product.salePrice && (
                <p className="text-base text-ink-400 line-through">
                  {formatVND(product.price)}
                </p>
              )}
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-sm font-medium">
              {product.stock > 0 ? (
                <>
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span className="text-emerald-700">
                    Còn hàng{product.stock <= 5 ? ` — chỉ còn ${product.stock} sản phẩm` : ""}
                  </span>
                </>
              ) : (
                <span className="text-red-600">Hết hàng</span>
              )}
            </p>
          </div>

          <div className="mt-5 flex items-center gap-4">
            <span className="text-sm font-medium text-ink-700">Số lượng:</span>
            <QuantitySelector
              value={quantity}
              onChange={setQuantity}
              max={Math.min(99, product.stock)}
            />
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={handleAdd}
              disabled={product.stock === 0}
            >
              <ShoppingCart className="h-5 w-5" /> Thêm vào giỏ
            </Button>
            <Button
              size="lg"
              className="flex-1"
              onClick={handleBuyNow}
              disabled={product.stock === 0}
            >
              <Zap className="h-5 w-5" /> Mua ngay
            </Button>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-slate-100 p-3.5">
              <p className="font-bold text-ink-900">Bảo hành chính hãng</p>
              <p className="mt-1 text-ink-500">12 tháng, 1 đổi 1 trong 7 ngày</p>
            </div>
            <div className="rounded-xl border border-slate-100 p-3.5">
              <p className="font-bold text-ink-900">Giao hàng nhanh</p>
              <p className="mt-1 text-ink-500">Nội thành 2h, toàn quốc 2–4 ngày</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs: description / specs / reviews */}
      <div className="mt-12">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "desc", label: "Mô tả sản phẩm" },
            { value: "specs", label: "Thông số kỹ thuật" },
            { value: "reviews", label: `Đánh giá (${reviews.length})` },
          ]}
        />
        <div className="py-6">
          {tab === "desc" && (
            <p className="max-w-3xl leading-relaxed text-ink-700">{product.description}</p>
          )}
          {tab === "specs" && (
            <dl className="max-w-3xl overflow-hidden rounded-2xl border border-slate-200">
              {product.specs.map((s, i) => (
                <div
                  key={s.label}
                  className={cn("grid grid-cols-3 gap-4 px-5 py-3 text-sm", i % 2 === 0 && "bg-slate-50/70")}
                >
                  <dt className="font-semibold text-ink-500">{s.label}</dt>
                  <dd className="col-span-2 font-medium text-ink-900">{s.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {tab === "reviews" && (
            <div className="max-w-3xl space-y-4">
              <p className="rounded-xl bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
                Dữ liệu đánh giá demo — sẽ được thay bằng đánh giá thật khi có backend.
              </p>
              {reviews.length === 0 && (
                <EmptyState
                  title="Chưa có đánh giá"
                  description="Hãy là người đầu tiên đánh giá sản phẩm này."
                />
              )}
              {reviews.map((r) => (
                <article key={r.id} className="rounded-2xl border border-slate-100 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 font-bold text-brand-700">
                        {r.author.charAt(0)}
                      </span>
                      <div>
                        <p className="flex items-center gap-2 text-sm font-bold text-ink-900">
                          {r.author}
                          {r.verified && (
                            <span className="flex items-center gap-1 text-xs font-medium text-emerald-700">
                              <Check className="h-3.5 w-3.5" /> Đã mua hàng
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-ink-400">
                          {new Date(r.date).toLocaleDateString("vi-VN")}
                        </p>
                      </div>
                    </div>
                    <Rating value={r.rating} />
                  </div>
                  <h4 className="mt-3 text-sm font-bold text-ink-900">{r.title}</h4>
                  <p className="mt-1 text-sm leading-relaxed text-ink-600">{r.content}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-5 text-xl font-extrabold text-ink-900">Sản phẩm liên quan</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-12">
        <RecentlyViewed currentId={product.id} />
      </div>
    </div>
  );
}
