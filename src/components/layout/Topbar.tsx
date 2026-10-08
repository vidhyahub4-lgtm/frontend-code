import { LogOut, Menu, School } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSelectedSchool } from "../../hooks/useSelectedSchool";
import { useSelectedSession } from "../../hooks/useSelectedSession";
import { AdminWorkspaceBar } from "./AdminWorkspaceBar";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { selectedSchool } = useSelectedSchool();
  const { selectedSession } = useSelectedSession();
  const isSuperAdmin = user?.userType === "superAdmin";

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const initials = user ? `${user.firstname[0] ?? ""}${user.lastname[0] ?? ""}`.toUpperCase() : "";

  return (
    <header className="print:hidden sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-line bg-paper/90 backdrop-blur px-4 py-3 lg:px-8">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open menu"
        className="text-ink lg:hidden"
      >
        <Menu size={22} />
      </button>

      {/* superAdmin: school + session they are working as. Admin: own school + session picker. */}
      {isSuperAdmin ? (
        <div className="flex min-w-0 items-center gap-2 rounded-full border border-line bg-white px-3 py-1 text-xs">
          <School size={14} className="shrink-0 text-marigold-dark" />
          <span className="truncate max-w-[9rem] sm:max-w-xs">
            {selectedSchool ? (
              <span className="font-medium text-ink">{selectedSchool.name}</span>
            ) : (
              <span className="text-ink-soft">No school selected</span>
            )}
          </span>
          <span className="h-3 w-px shrink-0 bg-line" />
          {selectedSession ? (
            <span className="shrink-0 font-medium text-ink">{selectedSession.name}</span>
          ) : (
            <span className="shrink-0 text-ink-soft">No session</span>
          )}
        </div>
      ) : user?.sch ? (
        <AdminWorkspaceBar school={user.sch} />
      ) : (
        <div className="hidden lg:block" />
      )}

      <div className="flex items-center gap-3">
        {isSuperAdmin && <WorkspaceSwitcher />}
        {user && (
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-chalkboard text-xs font-semibold text-chalk">
              {initials}
            </div>
            <div className="hidden sm:block leading-tight">
              <p className="text-sm font-medium text-ink">
                {user.firstname} {user.lastname}
              </p>
              <p className="text-xs text-ink-soft capitalize">{user.userType}</p>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={handleLogout}
          aria-label="Log out"
          className="flex items-center gap-1.5 rounded-md border border-line bg-white px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-chalk"
        >
          <LogOut size={15} />
          <span className="hidden sm:inline">Log out</span>
        </button>
      </div>
    </header>
  );
}
