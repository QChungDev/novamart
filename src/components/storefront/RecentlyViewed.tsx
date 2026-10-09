"use client";

import { useEffect, useState } from "react";
import { getRecentViews } from "@/lib/recently-viewed";
import { shopService } from "@/lib/services/shop";
import { ProductCard } from "./ProductCard";
import { SectionHeader } from "./home-sections";
import type { Product } from "@/lib/types";

/** Recently viewed products rail (prototype, localStorage). */
export function RecentlyViewed({ currentId }: { currentId?: string }) {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    // Client-only read; component renders null until loaded.
    const ids = getRecentViews(currentId).slice(0, 4);
    const found: Product[] = [];
    for (const id of ids) {
      const p = shopService.getProductById(id);
      if (p) found.push(p);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProducts(found);
  }, [currentId]);

  if (products.length === 0) return null;

  return (
    <section>
      <SectionHeader title="Đã xem gần đây" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
