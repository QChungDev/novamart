import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // Dev proxy: tranh CORS khi chay local (ưu tiên NEXT_PUBLIC_API_BASE_URL khi deploy)
    const api = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (api) return [];
    return [{ source: "/api/:path*", destination: "http://localhost:8000/api/:path*" }];
  },
};

export default nextConfig;
