"use client";

import Link from "next/link";
import { Headset, Mail, MapPin, Phone } from "lucide-react";
import { shopService } from "@/lib/services/shop";
import { useStoreQuery } from "@/lib/data/use-store-query";
import type { Category } from "@/lib/types";

const SOCIALS = ["Facebook", "Instagram", "Youtube"];

export function SiteFooter() {
  const data = useStoreQuery<Category[]>("footer-categories", () =>
    shopService.getCategories(),
  );
  const categories = (data ?? []).slice(0, 6);
  return (
    <footer className="mt-16 bg-ink-950 text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-lg font-extrabold text-white">
              N
            </span>
            <span className="text-xl font-extrabold text-white">
              Nova<span className="text-brand-400">Mart</span>
            </span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            Nền tảng mua sắm trực tuyến uy tín — điện thoại, laptop, âm thanh và
            phụ kiện chính hãng với giá tốt nhất.
          </p>
          <div className="mt-4 flex gap-2">
            {SOCIALS.map((name) => (
              <a
                key={name}
                href="#"
                className="flex h-9 items-center rounded-lg bg-white/10 px-3 text-xs font-bold text-slate-300 hover:bg-brand-600 hover:text-white"
                aria-label={name}
              >
                {name}
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-wide text-white">Danh mục</h4>
          <ul className="mt-4 space-y-2.5 text-sm">
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/products?category=${c.slug}`} className="hover:text-white">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-wide text-white">Hỗ trợ</h4>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link href="#" className="hover:text-white">Chính sách đổi trả</Link></li>
            <li><Link href="#" className="hover:text-white">Chính sách bảo hành</Link></li>
            <li><Link href="#" className="hover:text-white">Chính sách vận chuyển</Link></li>
            <li><Link href="#" className="hover:text-white">Điều khoản sử dụng</Link></li>
            <li><Link href="#" className="hover:text-white">Chính sách bảo mật</Link></li>
            <li><Link href="#" className="hover:text-white">Câu hỏi thường gặp</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-wide text-white">Liên hệ</h4>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex gap-2.5">
              <MapPin className="h-4 w-4 shrink-0 text-brand-400" />
              123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh
            </li>
            <li className="flex gap-2.5">
              <Phone className="h-4 w-4 shrink-0 text-brand-400" />
              Hotline: 1900 1234 (8:00 – 21:00)
            </li>
            <li className="flex gap-2.5">
              <Mail className="h-4 w-4 shrink-0 text-brand-400" />
              hotro@novamart.vn
            </li>
            <li className="flex gap-2.5">
              <Headset className="h-4 w-4 shrink-0 text-brand-400" />
              Hỗ trợ kỹ thuật 24/7
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-slate-500 sm:flex-row">
          <p>© 2026 NovaMart. Bảo lưu mọi quyền.</p>
          <p>Thanh toán: COD · Thẻ ngân hàng · Ví điện tử</p>
        </div>
      </div>
    </footer>
  );
}
