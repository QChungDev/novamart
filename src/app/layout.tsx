import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vn",
  subsets: ["vietnamese", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "NovaMart — Mua sắm trực tuyến",
    template: "%s | NovaMart",
  },
  description:
    "NovaMart — Nền tảng mua sắm trực tuyến: điện thoại, laptop, âm thanh, phụ kiện chính hãng với giá tốt nhất.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${beVietnamPro.variable} antialiased`}>
      <body className="min-h-screen bg-white font-sans text-ink-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
