import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type Tone = "marigold" | "green" | "red" | "sky";

const TONE: Record<Tone, string> = {
  marigold: "bg-marigold/15 text-marigold-dark",
  green: "bg-green-50 text-green-700",
  red: "bg-red-50 text-red-600",
  sky: "bg-sky-50 text-sky-700",
};

interface KpiCardProps {
  label: string;
  value: string;
  sub?: ReactNode;
  icon: LucideIcon;
  tone?: Tone;
  /** 0-100, draws a thin progress bar under the number. */
  progress?: number;
}

export function KpiCard({ label, value, sub, icon: Icon, tone = "marigold", progress }: KpiCardProps) {
  return (
    <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-ink-soft">{label}</p>
          <p className="mt-1 font-display text-2xl text-ink">{value}</p>
        </div>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${TONE[tone]}`}>
          <Icon size={17} />
        </span>
      </div>
      {progress !== undefined && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200">
          <div className="h-full rounded-full bg-marigold" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
        </div>
      )}
      {sub && <p className="mt-2 text-xs text-ink-soft">{sub}</p>}
    </div>
  );
}
