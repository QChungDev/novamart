"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAdmin } from "@/lib/services/admin";
import { useToast } from "@/lib/store/toast-store";
import { Breadcrumbs } from "@/components/ui/data";
import { ProductForm, productToForm, type ProductFormValue } from "@/components/admin/ProductForm";
import type { Product } from "@/lib/types";

function toProduct(v: ProductFormValue): Product {
  const now = new Date().toISOString();
  return {
    id: `p-${Date.now().toString(36)}`,
    name: v.name.trim(),
    slug: `${v.name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now().toString(36)}`,
    sku: v.sku.trim(),
    categoryId: v.categoryId,
    price: Number(v.price),
    salePrice: v.salePrice ? Number(v.salePrice) : undefined,
    images: v.images,
    rating: 0,
    reviewCount: 0,
    stock: Number(v.stock),
    sold: 0,
    description: v.description.trim(),
    specs: [],
    tags: [],
    isNew: true,
    status: v.status,
    createdAt: now,
  };
}

export default function NewProductPage() {
  const router = useRouter();
  const { state, actions } = useAdmin();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (v: ProductFormValue) => {
    setSubmitting(true);
    setTimeout(async () => {
      await actions.saveProduct(toProduct(v));
      toast("Thêm sản phẩm mới thành công!");
      router.push("/admin/products");
    }, 500);
  };

  return (
    <div className="space-y-5">
      <Breadcrumbs
        items={[
          { label: "Sản phẩm", href: "/admin/products" },
          { label: "Thêm sản phẩm mới" },
        ]}
      />
      <div className="flex items-center gap-3">
        <Link
          href="/admin/products"
          className="rounded-lg p-2 text-ink-500 hover:bg-white"
          aria-label="Quay lại"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-extrabold text-ink-900">Thêm sản phẩm mới</h1>
      </div>
      <ProductForm
        initial={productToForm()}
        categories={state.categories}
        onSubmit={handleSubmit}
        submitLabel="Thêm sản phẩm"
        submitting={submitting}
      />
    </div>
  );
}
