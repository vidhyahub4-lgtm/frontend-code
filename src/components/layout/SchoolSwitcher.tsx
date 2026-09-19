import { useEffect, useRef, useState } from "react";
import { Check, LoaderCircle, School as SchoolIcon, Search, Settings } from "lucide-react";
import { useSelectedSchool } from "../../hooks/useSelectedSchool";
import { superAdminService } from "../../services/superadmin.service";
import { ApiError } from "../../types/api.types";
import type { School } from "../../types/superadmin.types";

/** Show a search box only when the list is long enough to need one. */
const SEARCH_THRESHOLD = 6;

/**
 * Settings (gear) button + dropdown that lets a superAdmin pick the school
 * they are working as. Render it only for superAdmins (Topbar handles that).
 */
export function SchoolSwitcher() {
  const { selectedSchool, selectSchool } = useSelectedSchool();
  const [isOpen, setIsOpen] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!isOpen) return;

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  // Fetch fresh list every time the dropdown opens (a school may have been
  // created since last time). Old list stays visible while refreshing.
  function loadSchools() {
    setIsLoading(true);
    setError(null);
    superAdminService
      .getSchools()
      .then((res) => setSchools(res.schools ?? []))
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Could not load schools.")
      )
      .finally(() => setIsLoading(false));
  }

  function handleToggle() {
    if (!isOpen) {
      setQuery("");
      loadSchools();
    }
    setIsOpen((open) => !open);
  }

  function handleSelect(school: School) {
    selectSchool({ id: school._id, name: school.schName, schoolCode: school.schoolCode });
    setIsOpen(false);
  }

  const normalizedQuery = query.trim().toLowerCase();
  const visibleSchools = normalizedQuery
    ? schools.filter(
        (s) =>
          s.schName.toLowerCase().includes(normalizedQuery) ||
          s.schoolCode.toLowerCase().includes(normalizedQuery)
      )
    : schools;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        aria-label="School settings"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`relative flex h-9 w-9 items-center justify-center rounded-md border border-line text-ink transition hover:bg-chalk ${
          isOpen ? "bg-chalk" : "bg-white"
        }`}
      >
        <Settings size={17} />
        {/* Gentle nudge until a school has been chosen */}
        {!selectedSchool && (
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-paper bg-marigold" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-line bg-white shadow-lg">
          <div className="border-b border-line px-4 py-3">
            <h2 className="font-display text-base text-ink">Select school</h2>
            <p className="mt-0.5 text-xs text-ink-soft">Choose the school you want to manage.</p>
          </div>

          {schools.length > SEARCH_THRESHOLD && (
            <div className="border-b border-line px-3 py-2">
              <div className="relative">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-soft"
                />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name or code"
                  autoFocus
                  className="w-full rounded-md border border-line bg-paper py-1.5 pl-8 pr-2 text-sm text-ink outline-none focus:border-marigold"
                />
              </div>
            </div>
          )}

          <div role="listbox" aria-label="Schools" className="max-h-72 overflow-y-auto p-1.5">
            {isLoading && schools.length === 0 && (
              <p className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-ink-soft">
                <LoaderCircle size={15} className="animate-spin" /> Loading schools…
              </p>
            )}

            {error && (
              <div className="px-3 py-4 text-center text-sm">
                <p className="text-red-600">{error}</p>
                <button
                  type="button"
                  onClick={loadSchools}
                  className="mt-2 font-medium text-marigold-dark hover:underline"
                >
                  Try again
                </button>
              </div>
            )}

            {!isLoading && !error && visibleSchools.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-ink-soft">
                {schools.length === 0 ? "No schools created yet." : "No school matches your search."}
              </p>
            )}

            {visibleSchools.map((school) => {
              const isSelected = school._id === selectedSchool?.id;
              return (
                <button
                  key={school._id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(school)}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition ${
                    isSelected ? "bg-marigold/15" : "hover:bg-chalk"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                      isSelected ? "bg-marigold text-white" : "bg-chalk text-ink-soft"
                    }`}
                  >
                    <SchoolIcon size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">
                      {school.schName}
                    </span>
                    <span className="block truncate text-xs text-ink-soft">
                      {school.schoolCode}
                      {school.cityId?.cityName ? ` · ${school.cityId.cityName}` : ""}
                    </span>
                  </span>
                  {isSelected && <Check size={16} className="shrink-0 text-marigold-dark" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
