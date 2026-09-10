import { Construction } from "lucide-react";
import { useLocation } from "react-router-dom";

export function ComingSoonPage() {
  const { pathname } = useLocation();

  const title = pathname
    .split("/")
    .filter(Boolean)
    .pop()
    ?.replace(/-/g, " ") ?? "This page";

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-marigold/15 text-marigold-dark">
        <Construction size={26} />
      </div>
      <h1 className="mt-5 font-display text-2xl text-ink capitalize">{title}</h1>
      <p className="mt-2 text-ink-soft max-w-sm">
        This section is under construction. Check back soon.
      </p>
      <p className="mt-1 text-xs text-ink-soft/60">{pathname}</p>
    </div>
  );
}
