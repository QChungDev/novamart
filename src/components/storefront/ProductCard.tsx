"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { discountPercent, effectivePrice } from "@/lib/services/shop";
import { formatVND, formatCompact } from "@/lib/format";
import { useCart } from "@/lib/store/cart-store";
import { useToast } from "@/lib/store/toast-store";
import { Rating } from "@/components/ui/feedback";
import { Badge } from "@/components/ui/badge";
import type { Product } from "@/lib/types";

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const { toast } = useToast();
  const price = effectivePrice(product);
  const discount = discountPercent(product);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product.id, 1);
    toast(`Đã thêm "${product.name}" vào giỏ hàng`);
  };

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white transition-all hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-lg"
    >
      <div className="relative aspect-square overflow-hidden bg-slate-50">
        <Image
          src={product.images[0]}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {discount > 0 && <Badge tone="red">-{discount}%</Badge>}
          {product.isNew && <Badge tone="green">Mới</Badge>}
        </div>
        {product.stock <= 5 && product.stock > 0 && (
          <span className="absolute bottom-2 left-2 rounded-full bg-ink-950/80 px-2 py-0.5 text-[11px] font-semibold text-white">
            Chỉ còn {product.stock} sản phẩm
          </span>
        )}
        {product.stock === 0 && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/60 text-sm font-bold text-ink-700">
            Hết hàng
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <h3 className="line-clamp-2 min-h-10 text-sm font-medium leading-snug text-ink-900 group-hover:text-brand-700">
          {product.name}
        </h3>
        <div className="flex items-center gap-1.5">
          <Rating value={product.rating} />
          <span className="text-xs text-ink-400">
            ({formatCompact(product.reviewCount)}) · Đã bán {formatCompact(product.sold)}
          </span>
        </div>
        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div>
            <p className="text-base font-extrabold text-brand-700">{formatVND(price)}</p>
            {product.salePrice && (
              <p className="text-xs text-ink-400 line-through">{formatVND(product.price)}</p>
            )}
          </div>
          <button
            onClick={handleAdd}
            disabled={product.stock === 0}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition-colors hover:bg-brand-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={`Thêm ${product.name} vào giỏ hàng`}
          >
            <ShoppingCart className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Link>
  );
}
