"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  ShoppingCart,
  Tags,
  Users,
  Warehouse,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Tổng quan", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "Sản phẩm", icon: Package, exact: false },
  { href: "/admin/categories", label: "Danh mục", icon: Tags, exact: false },
  { href: "/admin/orders", label: "Đơn hàng", icon: ShoppingCart, exact: false },
  { href: "/admin/inventory", label: "Kho hàng", icon: Warehouse, exact: false },
  { href: "/admin/customers", label: "Khách hàng", icon: Users, exact: false },
  { href: "/admin/coupons", label: "Khuyến mãi", icon: Tags, exact: false },
  { href: "/admin/settings", label: "Cài đặt", icon: Settings, exact: false },
];

// Tách riêng để bọc Suspense: usePathname() chặn prerender nếu nằm ngoài Suspense.
function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3">
      {NAV.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-brand-600 text-white"
                : "text-slate-300 hover:bg-white/10 hover:text-white",
            )}
          >
            <item.icon className="h-4.5 w-4.5 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

// Tiêu đề breadcrumb trên top bar — cũng phụ thuộc usePathname.
function PageTitle() {
  const pathname = usePathname();
  const current = [...NAV]
    .reverse()
    .find((n) => (n.exact ? pathname === n.href : pathname.startsWith(n.href)));
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-ink-400">NovaMart Admin</span>
      <span className="text-ink-300">/</span>
      <span className="font-bold text-ink-900">{current?.label ?? "Tổng quan"}</span>
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <Link href="/admin" onClick={onNavigate} className="flex items-center gap-2 px-5 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-lg font-extrabold text-white">
          N
        </span>
        <span className="text-lg font-extrabold text-white">
          Nova<span className="text-brand-400">Mart</span>
          <span className="ml-1.5 rounded bg-white/10 px-1.5 py-0.5 align-middle text-[10px] font-bold uppercase text-slate-300">
            Admin
          </span>
        </span>
      </Link>
      <Suspense>
        <SidebarNav onNavigate={onNavigate} />
      </Suspense>
      <div className="space-y-1 border-t border-white/10 p-3">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white"
        >
          <ExternalLink className="h-4.5 w-4.5 shrink-0" /> Xem cửa hàng
        </Link>
        <button className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white">
          <LogOut className="h-4.5 w-4.5 shrink-0" /> Đăng xuất (demo)
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 bg-ink-950 lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-ink-950">
            <SidebarContent onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3 md:px-6">
            <button
              className="cursor-pointer rounded-lg p-2 text-ink-700 hover:bg-slate-100 lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Mở menu admin"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-sm">
              <Suspense>
                <PageTitle />
              </Suspense>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <span className="hidden rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 sm:inline">
                Dữ liệu demo
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-900 text-sm font-bold text-white">
                A
              </span>
            </div>
          </div>
          <p className="border-t border-amber-100 bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-800 md:px-6">
            Chế độ demo Phase 1 — mọi số liệu và thao tác là dữ liệu mẫu, chưa kết nối backend thật.
          </p>
        </header>

        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
