import { X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { SidebarNavItem } from "./SidebarNavItem";
import { sortTopLevelItems } from "../../lib/sidebarPaths";

interface SidebarProps {
  isMobileOpen: boolean;
  onClose: () => void;
}

function ChalkMarkIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 22C5 13 10 6 15 6C20 6 25 13 25 22" stroke="#E8A33D" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 22C9 15.5 12 10 15 10C18 10 21 15.5 21 22" stroke="#F4F1E8" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="15" cy="24" r="1.6" fill="#E8A33D" />
    </svg>
  );
}

function SidebarContent({ onNavigate }: { onNavigate: () => void }) {
  const { sidebar } = useAuth();
  const orderedSidebar = sortTopLevelItems(sidebar);

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
      {orderedSidebar.length === 0 ? (
        <p className="px-3 text-sm text-chalk/50">No menu items available.</p>
      ) : (
        orderedSidebar.map((item) => (
          <SidebarNavItem key={item.link} item={item} depth={0} onNavigate={onNavigate} />
        ))
      )}
    </nav>
  );
}

export function Sidebar({ isMobileOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Desktop: persistent column */}
      <aside className="hidden lg:flex lg:w-72 lg:shrink-0 lg:flex-col lg:h-screen lg:sticky lg:top-0 bg-chalkboard text-chalk">
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/10">
          <ChalkMarkIcon />
          <span className="font-display text-xl tracking-tight">VidyaHub</span>
        </div>
        <SidebarContent onNavigate={onClose} />
      </aside>

      {/* Mobile: overlay drawer */}
      <div
        className={`fixed inset-0 z-40 lg:hidden transition-opacity duration-200 ${
          isMobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!isMobileOpen}
      >
        <div
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />
        <aside
          className={`absolute left-0 top-0 h-full w-[82%] max-w-72 flex flex-col bg-chalkboard text-chalk shadow-xl transition-transform duration-200 ${
            isMobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between gap-2.5 px-5 py-5 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <ChalkMarkIcon />
              <span className="font-display text-xl tracking-tight">VidyaHub</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="text-chalk/70 hover:text-chalk transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <SidebarContent onNavigate={onClose} />
        </aside>
      </div>
    </>
  );
}
