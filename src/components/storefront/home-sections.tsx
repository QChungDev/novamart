import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgePercent, Headset, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { shopService } from "@/lib/services/shop";
import { ProductCard } from "./ProductCard";
import type { Product } from "@/lib/types";

/* ----------------------------------- Hero ----------------------------------- */

export function Hero() {
  return (
    <section className="overflow-hidden rounded-3xl bg-ink-950">
      <div className="grid items-center gap-8 px-6 py-10 md:grid-cols-2 md:px-12 md:py-14">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-600/20 px-3 py-1 text-xs font-bold text-brand-300">
            <BadgePercent className="h-3.5 w-3.5" /> Sale giữa tháng — Giảm đến 30%
          </span>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight text-white md:text-5xl">
            Công nghệ chính hãng,
            <br />
            giá tốt mỗi ngày
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-300 md:text-base">
            Điện thoại, laptop, âm thanh và phụ kiện từ các thương hiệu hàng đầu.
            Bảo hành chính hãng, giao hàng toàn quốc.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/products"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand-600 px-6 font-bold text-white transition-colors hover:bg-brand-500"
            >
              Mua sắm ngay <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/products?onSale=1"
              className="inline-flex h-12 items-center rounded-xl border border-white/20 px-6 font-bold text-white transition-colors hover:bg-white/10"
            >
              Săn khuyến mãi
            </Link>
          </div>
        </div>
        <div className="relative hidden aspect-[4/3] md:block">
          <Image
            src="https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1000&q=80"
            alt="Thiết bị công nghệ NovaMart"
            fill
            className="rounded-2xl object-cover"
            priority
          />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------- Category grid ------------------------------- */

export function CategoryGrid() {
  const categories = shopService.getCategories();
  return (
    <section>
      <SectionHeader title="Danh mục nổi bật" href="/products" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/products?category=${c.slug}`}
            className="group flex flex-col items-center gap-2.5 rounded-2xl border border-slate-100 bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className="relative h-16 w-16 overflow-hidden rounded-2xl bg-slate-50">
              <Image
                src={c.image}
                alt={c.name}
                fill
                sizes="64px"
                className="object-cover transition-transform duration-300 group-hover:scale-110"
              />
            </span>
            <span className="text-center text-xs font-semibold leading-tight text-ink-900 group-hover:text-brand-700">
              {c.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------- Product rows ------------------------------- */

export function SectionHeader({
  title,
  subtitle,
  href,
  hrefLabel = "Xem tất cả",
}: {
  title: string;
  subtitle?: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-ink-900 md:text-2xl">
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="flex shrink-0 items-center gap-1 text-sm font-bold text-brand-700 hover:text-brand-600"
        >
          {hrefLabel} <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

export function ProductRow({
  title,
  subtitle,
  products,
  href,
}: {
  title: string;
  subtitle?: string;
  products: Product[];
  href: string;
}) {
  return (
    <section>
      <SectionHeader title={title} subtitle={subtitle} href={href} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}

/* -------------------------------- Promo banner ------------------------------- */

export function PromoBanner() {
  return (
    <section className="grid gap-3 md:grid-cols-2">
      <div className="flex items-center justify-between gap-4 overflow-hidden rounded-3xl bg-brand-600 px-6 py-8 text-white md:px-10">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-brand-100">
            Mã giảm giá
          </p>
          <p className="mt-2 text-2xl font-extrabold">NOVAMART10</p>
          <p className="mt-1 text-sm text-brand-100">
            Giảm 10% cho đơn hàng từ 1.000.000 ₫
          </p>
          <Link
            href="/products"
            className="mt-4 inline-flex h-10 items-center rounded-xl bg-white px-5 text-sm font-bold text-brand-700 hover:bg-brand-50"
          >
            Áp dụng ngay
          </Link>
        </div>
        <BadgePercent className="hidden h-24 w-24 shrink-0 text-brand-200/60 sm:block" />
      </div>
      <div className="flex items-center justify-between gap-4 overflow-hidden rounded-3xl bg-ink-900 px-6 py-8 text-white md:px-10">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Miễn phí vận chuyển
          </p>
          <p className="mt-2 text-2xl font-extrabold">FREESHIP</p>
          <p className="mt-1 text-sm text-slate-300">
            Freeship cho đơn hàng từ 500.000 ₫
          </p>
          <Link
            href="/products"
            className="mt-4 inline-flex h-10 items-center rounded-xl bg-white px-5 text-sm font-bold text-ink-900 hover:bg-slate-100"
          >
            Mua sắm ngay
          </Link>
        </div>
        <Truck className="hidden h-24 w-24 shrink-0 text-white/10 sm:block" />
      </div>
    </section>
  );
}

/* --------------------------------- Benefits ---------------------------------- */

const BENEFITS = [
  {
    icon: Truck,
    title: "Giao hàng toàn quốc",
    desc: "Miễn phí cho đơn từ 500.000 ₫",
  },
  {
    icon: ShieldCheck,
    title: "Chính hãng 100%",
    desc: "Bảo hành theo tiêu chuẩn hãng",
  },
  {
    icon: RotateCcw,
    title: "Đổi trả 7 ngày",
    desc: "Đổi trả dễ dàng nếu lỗi kỹ thuật",
  },
  {
    icon: Headset,
    title: "Hỗ trợ 24/7",
    desc: "Hotline 1900 1234 luôn sẵn sàng",
  },
];

export function BenefitsBar() {
  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {BENEFITS.map((b) => (
        <div
          key={b.title}
          className="flex items-center gap-3.5 rounded-2xl border border-slate-100 bg-white p-4"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <b.icon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-ink-900">{b.title}</p>
            <p className="mt-0.5 text-xs text-ink-500">{b.desc}</p>
          </div>
        </div>
      ))}
    </section>
  );
}
