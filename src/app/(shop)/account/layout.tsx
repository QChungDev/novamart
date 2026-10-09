"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, MapPin, Package, UserRound } from "lucide-react";
import { useAuth } from "@/lib/store/auth-store";
import { useToast } from "@/lib/store/toast-store";
import { Spinner } from "@/components/ui/feedback";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/account", label: "Tổng quan", icon: LayoutDashboard, exact: true },
  { href: "/account/info", label: "Thông tin cá nhân", icon: UserRound, exact: false },
  { href: "/account/addresses", label: "Sổ địa chỉ", icon: MapPin, exact: false },
  { href: "/account/orders", label: "Đơn hàng của tôi", icon: Package, exact: false },
];

// Tách riêng để bọc Suspense: usePathname() chặn prerender nếu nằm ngoài Suspense.
function AccountNav({ onLogout }: { onLogout: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="mt-3 flex flex-row gap-1 overflow-x-auto nice-scroll lg:flex-col">
      {NAV.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href) && item.href !== "/account";
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "bg-brand-50 text-brand-700" : "text-ink-600 hover:bg-slate-50",
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
      <button
        onClick={onLogout}
        className="flex shrink-0 cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
      >
        <LogOut className="h-4 w-4" />
        Đăng xuất
      </button>
    </nav>
  );
}

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login?redirect=/account");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    toast("Đã đăng xuất khỏi tài khoản.", "info");
    router.push("/");
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="lg:w-64 lg:shrink-0">
          <div className="rounded-2xl border border-slate-100 bg-white p-4 lg:sticky lg:top-36">
            <div className="flex items-center gap-3 border-b border-slate-100 px-2 pb-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-600 text-lg font-bold text-white">
                {user.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ink-900">{user.name}</p>
                <p className="truncate text-xs text-ink-400">{user.email}</p>
              </div>
            </div>
            <Suspense fallback={<div className="mt-3 h-40 animate-pulse rounded-xl bg-slate-50" />}>
              <AccountNav onLogout={handleLogout} />
            </Suspense>
          </div>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
