"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Menu, Search, ShoppingCart, User, X } from "lucide-react";
import { shopService } from "@/lib/services/shop";
import { useStoreQuery } from "@/lib/data/use-store-query";
import { useCart } from "@/lib/store/cart-store";
import { useAuth } from "@/lib/store/auth-store";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/types";

export function SiteHeader() {
  const router = useRouter();
  const { count } = useCart();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const data = useStoreQuery<Category[]>("header-categories", () =>
    shopService.getCategories(),
  );
  const categories = data ?? [];

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/products${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
    setMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white shadow-[0_1px_0_0_#eef1f6]">
      {/* Announcement bar */}
      <div className="bg-ink-900 text-white">
        <p className="mx-auto max-w-7xl px-4 py-1.5 text-center text-xs font-medium tracking-wide">
          Miễn phí vận chuyển cho đơn hàng từ 500.000 ₫ — Áp mã NOVAMART10 giảm thêm 10%
        </p>
      </div>

      {/* Main bar */}
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 md:gap-6">
        <button
          className="cursor-pointer rounded-lg p-2 text-ink-700 hover:bg-slate-100 lg:hidden"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Mở menu"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-lg font-extrabold text-white">
            N
          </span>
          <span className="text-xl font-extrabold tracking-tight text-ink-900">
            Nova<span className="text-brand-600">Mart</span>
          </span>
        </Link>

        <form onSubmit={submitSearch} className="hidden flex-1 md:block">
          <div className="relative">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm kiếm điện thoại, laptop, tai nghe..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-4 pr-12 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg bg-brand-600 text-white hover:bg-brand-700"
              aria-label="Tìm kiếm"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Link
            href={user ? "/account" : "/login"}
            className="hidden items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-ink-700 hover:bg-slate-100 sm:flex"
          >
            <User className="h-5 w-5" />
            <span className="max-w-24 truncate">{user ? user.name : "Tài khoản"}</span>
          </Link>
          <Link
            href="/cart"
            className="relative flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-ink-700 hover:bg-slate-100"
            aria-label="Giỏ hàng"
          >
            <ShoppingCart className="h-5 w-5" />
            <span className="hidden sm:inline">Giỏ hàng</span>
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Mobile search */}
      <div className="px-4 pb-3 md:hidden">
        <form onSubmit={submitSearch} className="relative">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm kiếm sản phẩm..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-4 pr-11 text-sm focus:border-brand-500 focus:bg-white focus:outline-none"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg bg-brand-600 text-white"
            aria-label="Tìm kiếm"
          >
            <Search className="h-4 w-4" />
          </button>
        </form>
      </div>

      {/* Category nav (desktop) */}
      <nav className="hidden border-t border-slate-100 lg:block">
        <div className="mx-auto flex max-w-7xl items-center gap-1 px-4">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/products?category=${c.slug}`}
              className="whitespace-nowrap px-3 py-2.5 text-sm font-medium text-ink-600 hover:text-brand-700"
            >
              {c.name}
            </Link>
          ))}
          <Link
            href="/products?onSale=1"
            className="ml-auto flex items-center gap-1 whitespace-nowrap px-3 py-2.5 text-sm font-bold text-red-600 hover:text-red-700"
          >
            <Heart className="h-4 w-4" /> Khuyến mãi
          </Link>
        </div>
      </nav>

      {/* Mobile menu */}
      <div
        className={cn(
          "overflow-hidden border-t border-slate-100 bg-white transition-all lg:hidden",
          menuOpen ? "max-h-[70vh] overflow-y-auto" : "max-h-0 border-t-0",
        )}
      >
        <nav className="flex flex-col px-4 py-2">
          {!user && (
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 rounded-lg px-2 py-3 text-sm font-semibold text-brand-700"
            >
              <User className="h-4 w-4" /> Đăng nhập / Đăng ký
            </Link>
          )}
          {user && (
            <Link
              href="/account"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 rounded-lg px-2 py-3 text-sm font-semibold text-brand-700"
            >
              <User className="h-4 w-4" /> {user.name}
            </Link>
          )}
          <p className="px-2 pb-1 pt-2 text-xs font-bold uppercase tracking-wide text-ink-400">
            Danh mục
          </p>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/products?category=${c.slug}`}
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-2 py-2.5 text-sm font-medium text-ink-700 hover:bg-slate-50"
            >
              {c.name}
            </Link>
          ))}
          <Link
            href="/products?onSale=1"
            onClick={() => setMenuOpen(false)}
            className="rounded-lg px-2 py-2.5 text-sm font-bold text-red-600"
          >
            Khuyến mãi
          </Link>
        </nav>
      </div>
    </header>
  );
}
