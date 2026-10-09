"use client";

import { useState } from "react";
import Image from "next/image";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useAdmin } from "@/lib/services/admin";
import { useToast } from "@/lib/store/toast-store";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Modal } from "@/components/ui/overlay";
import { DataTable, type Column } from "@/components/ui/data";
import { FormField, Input, Textarea } from "@/components/ui/input";
import type { Category } from "@/lib/types";

const EMPTY = { name: "", slug: "", image: "", description: "" };

export default function AdminCategoriesPage() {
  const { state, actions } = useAdmin();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleting, setDeleting] = useState<Category | null>(null);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    setForm({ name: c.name, slug: c.slug, image: c.image, description: c.description });
    setErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = "Tên danh mục phải có ít nhất 2 ký tự.";
    if (!/^[a-z0-9-]+$/.test(form.slug.trim()))
      e.slug = "Slug chỉ gồm chữ thường, số và dấu gạch ngang.";
    if (form.image && !/^https?:\/\/.+/.test(form.image))
      e.image = "URL hình ảnh không hợp lệ.";
    const dup = state.categories.some(
      (c) => c.slug === form.slug.trim() && c.id !== editing?.id,
    );
    if (dup) e.slug = "Slug này đã được sử dụng.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = () => {
    if (!validate()) return;
    const payload: Category = {
      id: editing?.id ?? `c-${Date.now().toString(36)}`,
      name: form.name.trim(),
      slug: form.slug.trim(),
      image: form.image.trim() || "https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=800&q=80",
      description: form.description.trim(),
    };
    actions.saveCategory(payload);
    toast(editing ? "Cập nhật danh mục thành công!" : "Thêm danh mục mới thành công!");
    setModalOpen(false);
  };

  const productCount = (id: string) => state.products.filter((p) => p.categoryId === id).length;

  const columns: Column<Category>[] = [
    {
      key: "name",
      header: "Danh mục",
      render: (c) => (
        <div className="flex items-center gap-3">
          <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-slate-50">
            <Image src={c.image} alt={c.name} fill sizes="44px" className="object-cover" />
          </span>
          <span>
            <span className="block font-semibold text-ink-900">{c.name}</span>
            <span className="text-xs text-ink-400">/{c.slug}</span>
          </span>
        </div>
      ),
    },
    {
      key: "products",
      header: "Số sản phẩm",
      render: (c) => <span className="font-bold">{productCount(c.id)}</span>,
    },
    {
      key: "description",
      header: "Mô tả",
      render: (c) => <span className="line-clamp-1 max-w-xs text-ink-500">{c.description}</span>,
    },
    {
      key: "actions",
      header: "Thao tác",
      className: "text-right",
      render: (c) => (
        <span className="flex justify-end gap-1">
          <button
            onClick={() => openEdit(c)}
            className="cursor-pointer rounded-lg p-2 text-ink-400 hover:bg-brand-50 hover:text-brand-700"
            aria-label="Sửa danh mục"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => setDeleting(c)}
            className="cursor-pointer rounded-lg p-2 text-ink-400 hover:bg-red-50 hover:text-red-600"
            aria-label="Xóa danh mục"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-900">Danh mục</h1>
          <p className="mt-1 text-sm text-ink-500">{state.categories.length} danh mục sản phẩm</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4" /> Thêm danh mục
        </Button>
      </div>

      <DataTable columns={columns} data={state.categories} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Sửa danh mục" : "Thêm danh mục"}>
        <div className="space-y-4">
          <FormField label="Tên danh mục" required error={errors.name}>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ví dụ: Điện thoại" />
          </FormField>
          <FormField label="Slug" required error={errors.slug} hint="Dùng trong URL, ví dụ: dien-thoai">
            <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })} placeholder="dien-thoai" />
          </FormField>
          <FormField label="URL hình ảnh" error={errors.image}>
            <Input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://..." />
          </FormField>
          <FormField label="Mô tả">
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Mô tả ngắn về danh mục" rows={3} />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Hủy</Button>
            <Button onClick={save}>{editing ? "Lưu thay đổi" : "Thêm danh mục"}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) {
            actions.deleteCategory(deleting.id);
            toast(`Đã xóa danh mục "${deleting.name}".`, "info");
            setDeleting(null);
          }
        }}
        title="Xóa danh mục"
        message={`Xóa danh mục "${deleting?.name}"? ${deleting ? productCount(deleting.id) : 0} sản phẩm thuộc danh mục này sẽ trở thành "chưa phân loại".`}
        confirmLabel="Xóa danh mục"
        danger
      />
    </div>
  );
}
