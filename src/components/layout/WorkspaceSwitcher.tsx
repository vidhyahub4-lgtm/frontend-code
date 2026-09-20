import { useEffect, useRef, useState } from "react";
import { Check, LoaderCircle, School as SchoolIcon, Search, Settings } from "lucide-react";
import { useSelectedSchool } from "../../hooks/useSelectedSchool";
import { useSelectedSession } from "../../hooks/useSelectedSession";
import { superAdminService } from "../../services/superadmin.service";
import { ApiError } from "../../types/api.types";
import type { School, Session } from "../../types/superadmin.types";
import type { SelectedSchool } from "../../lib/selectedSchool";

/** Show a search box only when the list is long enough to need one. */
const SEARCH_THRESHOLD = 6;

/**
 * Settings (gear) button + dropdown that lets a superAdmin pick the school
 * AND the session they are working in. Render it only for superAdmins
 * (Topbar handles that).
 *
 * Picks are held as a local "draft" and only written to localStorage when
 * the user presses Save; closing the panel discards the draft.
 * Nothing is auto-selected: the user must choose.
 */
export function WorkspaceSwitcher() {
  const { selectedSchool, selectSchool } = useSelectedSchool();
  const { selectedSession, selectSession } = useSelectedSession();
  const [isOpen, setIsOpen] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [draftSchool, setDraftSchool] = useState<SelectedSchool | null>(null);
  const [draftSessionId, setDraftSessionId] = useState("");
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

  function loadSessions() {
    setSessionsLoading(true);
    setSessionsError(null);
    superAdminService
      .getSessions()
      .then((res) => setSessions(res.sessions ?? []))
      .catch((err) =>
        setSessionsError(err instanceof ApiError ? err.message : "Could not load sessions.")
      )
      .finally(() => setSessionsLoading(false));
  }

  function handleToggle() {
    if (!isOpen) {
      // Start the draft from what is currently saved
      setDraftSchool(selectedSchool);
      setDraftSessionId(selectedSession?.id ?? "");
      setQuery("");
      loadSchools();
      loadSessions();
    }
    setIsOpen((open) => !open);
  }

  function handleSelectSchool(school: School) {
    setDraftSchool({ id: school._id, name: school.schName, schoolCode: school.schoolCode });
  }

  // Both must be chosen, and something must differ from what is saved.
  const canSave =
    Boolean(draftSchool && draftSessionId) &&
    (draftSchool?.id !== selectedSchool?.id || draftSessionId !== selectedSession?.id);

  function handleSave() {
    if (!draftSchool || !draftSessionId) return;

    const picked = sessions.find((session) => session._id === draftSessionId);
    const name = picked?.session ?? (selectedSession?.id === draftSessionId ? selectedSession.name : null);
    if (!name) return;

    selectSchool(draftSchool);
    selectSession({ id: draftSessionId, name });
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
        {(!selectedSchool || !selectedSession) && (
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-paper bg-marigold" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-line bg-white shadow-lg">
          <div className="border-b border-line px-4 py-3">
            <h2 className="font-display text-base text-ink">Workspace</h2>
            <p className="mt-0.5 text-xs text-ink-soft">
              Choose the school and session you want to work in.
            </p>
          </div>

          <p className="px-4 pt-3 text-xs font-medium uppercase tracking-wide text-ink-soft">
            School
          </p>

          {schools.length > SEARCH_THRESHOLD && (
            <div className="px-3 pt-2">
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

          <div role="listbox" aria-label="Schools" className="max-h-56 overflow-y-auto p-1.5">
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
              const isSelected = school._id === draftSchool?.id;
              return (
                <button
                  key={school._id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelectSchool(school)}
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

          <div className="border-t border-line px-4 pb-4 pt-3">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Session</p>

            {sessionsLoading && sessions.length === 0 && (
              <p className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
                <LoaderCircle size={15} className="animate-spin" /> Loading sessions…
              </p>
            )}

            {sessionsError && (
              <p className="mt-2 text-sm text-red-600">
                {sessionsError}{" "}
                <button
                  type="button"
                  onClick={loadSessions}
                  className="font-medium text-marigold-dark hover:underline"
                >
                  Try again
                </button>
              </p>
            )}

            {!sessionsLoading && !sessionsError && sessions.length === 0 && (
              <p className="mt-2 text-sm text-ink-soft">No sessions created yet.</p>
            )}

            <select
              aria-label="Session"
              value={draftSessionId}
              onChange={(e) => setDraftSessionId(e.target.value)}
              disabled={sessionsLoading && sessions.length === 0}
              className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-marigold/40"
            >
              <option value="" disabled>
                Select a session
              </option>
              {/* Keep the saved choice visible even before the list has loaded */}
              {selectedSession &&
                selectedSession.id === draftSessionId &&
                !sessions.some((s) => s._id === selectedSession.id) && (
                  <option value={selectedSession.id}>{selectedSession.name}</option>
                )}
              {sessions.map((session) => (
                <option key={session._id} value={session._id}>
                  {session.session}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-line bg-paper px-4 py-3">
            <p className="text-xs text-ink-soft">
              {draftSchool && draftSessionId
                ? "Save to apply your selection."
                : "Select a school and a session."}
            </p>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="shrink-0 rounded-md bg-marigold px-4 py-1.5 text-sm font-medium text-chalkboard transition hover:bg-marigold-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
