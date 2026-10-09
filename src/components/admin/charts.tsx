"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatVND } from "@/lib/format";
import { orderStatusLabel } from "@/components/ui/badge";
import type { DailyRevenue, OrderStatus, OrderStatusCount } from "@/lib/types";

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  confirmed: "#2f6df6",
  shipping: "#8b5cf6",
  delivered: "#10b981",
  cancelled: "#ef4444",
};

function compactVND(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}tr`;
  return `${(v / 1_000).toFixed(0)}k`;
}

export function SalesChart({ data }: { data: DailyRevenue[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2f6df6" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#2f6df6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#5b6b8c" }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 11, fill: "#5b6b8c" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={compactVND}
            width={44}
          />
          <Tooltip
            formatter={(value) => [formatVND(Number(value ?? 0)), "Doanh thu"]}
            contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#2f6df6"
            strokeWidth={2.5}
            fill="url(#revGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function OrderStatusChart({ data }: { data: OrderStatusCount[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="h-52 w-52 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="status"
              innerRadius={58}
              outerRadius={88}
              paddingAngle={3}
              strokeWidth={0}
            >
              {data.map((d) => (
                <Cell key={d.status} fill={STATUS_COLORS[d.status] ?? "#94a3b8"} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [
                `${Number(value ?? 0)} đơn`,
                orderStatusLabel(String(name ?? "pending") as OrderStatus),
              ]}
              contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="w-full space-y-2">
        {data.map((d) => (
          <li key={d.status} className="flex items-center gap-2.5 text-sm">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: STATUS_COLORS[d.status] }}
            />
            <span className="font-medium text-ink-700">{orderStatusLabel(d.status)}</span>
            <span className="ml-auto font-bold text-ink-900">
              {d.count}
              <span className="ml-1 font-normal text-ink-400">
                ({total ? Math.round((d.count / total) * 100) : 0}%)
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
