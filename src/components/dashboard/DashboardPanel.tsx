import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface DashboardPanelProps {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
  /** Small text/link shown on the right of the title. */
  action?: ReactNode;
}

/** Card used by every dashboard widget (same look as SectionCard, but stretches to its grid cell). */
export function DashboardPanel({ title, icon: Icon, children, className = "", action }: DashboardPanelProps) {
  return (
    <section className={`flex h-full flex-col rounded-lg border border-line bg-white shadow-sm ${className}`}>
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-marigold/15 text-marigold-dark">
            <Icon size={14} />
          </span>
          <h2 className="font-display text-base text-ink">{title}</h2>
        </div>
        {action}
      </div>
      <div className="flex-1 p-4">{children}</div>
    </section>
  );
}
