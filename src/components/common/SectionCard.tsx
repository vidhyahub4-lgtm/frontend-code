import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface SectionCardProps {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}

export function SectionCard({ title, icon: Icon, children }: SectionCardProps) {
  return (
    <div className="rounded-lg border border-line bg-white shadow-sm">
      <div className="flex items-center gap-2.5 border-b border-line px-5 py-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-marigold/15 text-marigold-dark">
          <Icon size={16} />
        </span>
        <h2 className="font-display text-lg text-ink">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
