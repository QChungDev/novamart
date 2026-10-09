import { cn } from "@/lib/utils";
import { PackageSearch, Star } from "lucide-react";

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-brand-600",
        className,
      )}
      role="status"
      aria-label="Đang tải"
    />
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-ink-400 shadow-sm">
        {icon ?? <PackageSearch className="h-7 w-7" />}
      </div>
      <h3 className="text-base font-bold text-ink-900">{title}</h3>
      {description && <p className="max-w-sm text-sm text-ink-500">{description}</p>}
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-slate-100", className)} />;
}

export function Rating({
  value,
  size = "sm",
  showValue = false,
}: {
  value: number;
  size?: "sm" | "md";
  showValue?: boolean;
}) {
  const cls = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-flex items-center gap-0.5" aria-label={`Đánh giá ${value}/5`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={cn(
              cls,
              i <= Math.round(value)
                ? "fill-amber-400 text-amber-400"
                : "fill-slate-200 text-slate-200",
            )}
          />
        ))}
      </span>
      {showValue && (
        <span className="text-xs font-medium text-ink-500">{value.toFixed(1)}</span>
      )}
    </span>
  );
}
