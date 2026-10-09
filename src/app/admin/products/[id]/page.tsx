"use client";

import { Suspense, use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAdmin } from "@/lib/services/admin";
import { useToast } from "@/lib/store/toast-store";
import { Breadcrumbs } from "@/components/ui/data";
import { EmptyState } from "@/components/ui/feedback";
import { ProductForm, productToForm, type ProductFormValue } from "@/components/admin/ProductForm";

// Nội dung đọc params async nên bọc trong Suspense để không chặn prerender.
function EditProductContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { state, actions } = useAdmin();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const product = state.products.find((p) => p.id === id);

  if (!product) {
    return (
      <EmptyState
        title="Không tìm thấy sản phẩm"
        description="Sản phẩm có thể đã bị xóa."
        action={
          <Link
            href="/admin/products"
            className="inline-flex h-10 items-center rounded-xl bg-brand-600 px-5 text-sm font-bold text-white hover:bg-brand-700"
          >
            <ArrowLeft className="h-4 w-4" /> Về danh sách
          </Link>
        }
      />
    );
  }

  const handleSubmit = (v: ProductFormValue) => {
    setSubmitting(true);
    setTimeout(async () => {
      await actions.saveProduct({
        ...product,
        name: v.name.trim(),
        sku: v.sku.trim(),
        categoryId: v.categoryId,
        description: v.description.trim(),
        price: Number(v.price),
        salePrice: v.salePrice ? Number(v.salePrice) : undefined,
        stock: Number(v.stock),
        images: v.images,
        status: v.status,
      });
      toast("Cập nhật sản phẩm thành công!");
      router.push("/admin/products");
    }, 500);
  };

  return (
    <div className="space-y-5">
      <Breadcrumbs
        items={[
          { label: "Sản phẩm", href: "/admin/products" },
          { label: product.name },
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
        <h1 className="text-2xl font-extrabold text-ink-900">Sửa sản phẩm</h1>
      </div>
      <ProductForm
        initial={productToForm(product)}
        categories={state.categories}
        onSubmit={handleSubmit}
        submitLabel="Lưu thay đổi"
        submitting={submitting}
      />
    </div>
  );
}

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-400">
          Đang tải thông tin sản phẩm...
        </div>
      }
    >
      <EditProductContent params={params} />
    </Suspense>
  );
}
