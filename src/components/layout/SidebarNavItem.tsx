import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import type { SidebarItem } from "../../types/auth.types";
import { resolveSidebarIcon } from "../../lib/sidebarIcons";
import { isLinkActive, subtreeContainsPath } from "../../lib/sidebarPaths";

interface SidebarNavItemProps {
  item: SidebarItem;
  depth: number;
  onNavigate: () => void;
}

export function SidebarNavItem({ item, depth, onNavigate }: SidebarNavItemProps) {
  const { pathname } = useLocation();
  const hasChildren = Boolean(item.children && item.children.length > 0);
  const active = isLinkActive(item.link, pathname);
  const containsActive = hasChildren && subtreeContainsPath(item, pathname);

  const [open, setOpen] = useState(containsActive);

  // Auto-expand a group when navigation lands inside it; never auto-collapse
  // a group the user opened manually.
  useEffect(() => {
    if (containsActive) setOpen(true);
  }, [containsActive]);

  const Icon = resolveSidebarIcon(item.icon, item.text, hasChildren, open);
  const paddingLeft = 12 + depth * 20;

  const baseRowClasses =
    "flex w-full items-center gap-2.5 rounded-md py-2 pr-3 text-[13.5px] font-medium transition-colors";

  if (!hasChildren) {
    return (
      <Link
        to={item.link}
        onClick={onNavigate}
        style={{ paddingLeft }}
        className={`${baseRowClasses} ${
          active
            ? "bg-marigold/15 text-marigold-dark"
            : "text-chalk/75 hover:bg-white/5 hover:text-chalk"
        }`}
      >
        <Icon size={16} strokeWidth={2} className="shrink-0" />
        <span className="truncate">{item.text}</span>
      </Link>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{ paddingLeft }}
        aria-expanded={open}
        className={`${baseRowClasses} ${
          containsActive
            ? "text-chalk"
            : "text-chalk/75 hover:bg-white/5 hover:text-chalk"
        }`}
      >
        <Icon size={16} strokeWidth={2} className="shrink-0" />
        <span className="flex-1 truncate text-left">{item.text}</span>
        <ChevronDown
          size={15}
          className={`shrink-0 text-chalk/50 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <div
        className={`grid overflow-hidden transition-all duration-200 ease-in-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        {/* Vertical guide line under the parent's icon, spanning the full
            height of its children — makes the folder/file nesting readable
            at a glance instead of relying on indent alone. */}
        <div className="relative min-h-0 space-y-0.5 pt-0.5">
          <div
            className="pointer-events-none absolute top-0 bottom-1 w-px bg-white/10"
            style={{ left: paddingLeft + 7 }}
          />
          {item.children!.map((child) => (
            <SidebarNavItem
              key={child.link}
              item={child}
              depth={depth + 1}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
