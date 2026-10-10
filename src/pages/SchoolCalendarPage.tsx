import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CalendarDays, CheckCircle2, Loader2, School } from "lucide-react";
import { SectionCard } from "../components/common/SectionCard";
import { useSelectedSchool } from "../hooks/useSelectedSchool";
import { useSelectedSession } from "../hooks/useSelectedSession";
import { calendarService } from "../services/calendar.service";
import { schoolSettingService } from "../services/schoolSetting.service";
import { ApiError } from "../types/api.types";
import type { CalendarDateEntry, CalendarMark, CalendarScope } from "../types/calendar.types";
import type { SchClass } from "../types/superadmin.types";

const inputClasses =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-marigold/40 disabled:opacity-60";
const labelClasses = "text-sm font-medium text-ink-soft";
const SESSION_FORMAT = /^\d{4}-\d{2}$/;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

const MARK_STYLE: Record<CalendarMark, { label: string; cell: string; dot: string }> = {
  H: { label: "Holiday", cell: "bg-red-100 text-red-700 ring-1 ring-red-300", dot: "bg-red-400" },
  S: { label: "Weekly off", cell: "bg-slate-200 text-slate-700 ring-1 ring-slate-300", dot: "bg-slate-400" },
  W: { label: "Working day", cell: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300", dot: "bg-emerald-400" },
};

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const todayLocal = () => {
  const t = new Date();
  return iso(t.getFullYear(), t.getMonth(), t.getDate());
};
const prettyDate = (value: string) => {
  const [y, m, d] = value.split("-").map(Number);
  return `${d} ${MONTHS[m - 1].slice(0, 3)} ${y}`;
};

/** April of the start year through March of the next one. */
function sessionMonths(startYear: number): { y: number; m: number }[] {
  return Array.from({ length: 12 }, (_, i) => {
    const m = (3 + i) % 12;
    return { y: startYear + (3 + i >= 12 ? 1 : 0), m };
  });
}

function MonthCard({
  y,
  m,
  marks,
  selected,
  today,
  onToggle,
}: {
  y: number;
  m: number;
  marks: Map<string, CalendarDateEntry>;
  selected: Set<string>;
  today: string;
  onToggle: (date: string) => void;
}) {
  const first = new Date(Date.UTC(y, m, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  return (
    <div className="rounded-lg border border-line bg-white p-3 shadow-sm">
      <p className="mb-2 text-center font-display text-base text-ink">
        {MONTHS[m]} <span className="text-xs text-ink-soft">{y}</span>
      </p>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
        {WEEKDAYS.map((w, i) => (
          <span key={i} className={`py-1 font-medium ${i === 0 ? "text-red-500" : "text-ink-soft"}`}>{w}</span>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <span key={`e${i}`} />;
          const date = iso(y, m, d);
          const entry = marks.get(date);
          const isSel = selected.has(date);
          const base = entry ? MARK_STYLE[entry.markas].cell : i % 7 === 0 ? "text-red-500 hover:bg-chalk" : "text-ink hover:bg-chalk";
          return (
            <button
              key={date}
              type="button"
              aria-pressed={isSel}
              aria-label={`${prettyDate(date)}${entry ? `, ${MARK_STYLE[entry.markas].label}${entry.res ? `: ${entry.res}` : ""}` : ""}`}
              title={entry ? `${MARK_STYLE[entry.markas].label}${entry.res ? ` — ${entry.res}` : ""}` : undefined}
              onClick={() => onToggle(date)}
              className={`aspect-square rounded-md text-xs transition ${base} ${
                isSel ? "!bg-marigold !text-chalkboard font-semibold ring-2 ring-marigold-dark" : ""
              } ${date === today && !isSel ? "font-bold underline underline-offset-2" : ""}`}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CalendarContent({ schId, sessionName }: { schId: string; sessionName: string }) {
  const validSession = SESSION_FORMAT.test(sessionName);
  const startYear = validSession ? parseInt(sessionName.slice(0, 4), 10) : 0;

  const [schClasses, setSchClasses] = useState<SchClass[]>([]);
  const [setupLoading, setSetupLoading] = useState(true);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");

  const [entries, setEntries] = useState<CalendarDateEntry[]>([]);
  const [calLoading, setCalLoading] = useState(false);
  const [calError, setCalError] = useState<string | null>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scope, setScope] = useState<CalendarScope>("SECTION");
  const [reason, setReason] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "warn" | "err"; text: string } | null>(null);
  const lock = useRef(false);

  useEffect(() => {
    let cancelled = false;
    schoolSettingService
      .getSchClasses(schId)
      .then((res) => { if (!cancelled) setSchClasses(res.schClasses ?? []); })
      .catch((err) => { if (!cancelled) setSetupError(err instanceof ApiError ? err.message : "Could not load classes."); })
      .finally(() => { if (!cancelled) setSetupLoading(false); });
    return () => { cancelled = true; };
  }, [schId]);

  const selectedClass = schClasses.find((c) => c.classID._id === classId);
  const sectionOptions = selectedClass?.sectionID ?? [];
  const className = selectedClass?.classID.className ?? "";

  const loadCalendar = useCallback(() => {
    if (!classId || !sectionId || !validSession) return Promise.resolve();
    setCalLoading(true);
    setCalError(null);
    return calendarService
      .getCalendar({ schId, session: sessionName, clsid: classId, secid: sectionId })
      .then((res) => setEntries((res.data.cal ?? []).flatMap((m) => m.dates ?? [])))
      .catch((err) => {
        setEntries([]);
        setCalError(err instanceof ApiError ? err.message : "Could not load the calendar.");
      })
      .finally(() => setCalLoading(false));
  }, [schId, sessionName, classId, sectionId, validSession]);

  useEffect(() => {
    if (!classId || !sectionId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCalendar();
  }, [classId, sectionId, loadCalendar]);

  const marks = useMemo(() => new Map(entries.map((e) => [e.date.slice(0, 10), e])), [entries]);
  const holidays = useMemo(
    () => entries.filter((e) => e.markas === "H").sort((a, b) => a.date.localeCompare(b.date)),
    [entries]
  );
  const counts = useMemo(() => {
    const c = { H: 0, S: 0, W: 0 };
    entries.forEach((e) => { c[e.markas] += 1; });
    return c;
  }, [entries]);
  const today = todayLocal();
  const ready = Boolean(classId && sectionId && validSession);

  function toggleDate(date: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
    setMessage(null);
  }

  function selectSundays() {
    const sundays: string[] = [];
    sessionMonths(startYear).forEach(({ y, m }) => {
      const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
      for (let d = 1; d <= days; d++) if (new Date(Date.UTC(y, m, d)).getUTCDay() === 0) sundays.push(iso(y, m, d));
    });
    setSelected(new Set(sundays));
    setMessage(null);
  }

  const scopeTarget = () => ({
    scope,
    ...(scope !== "ALL" ? { clsid: classId } : {}),
    ...(scope === "SECTION" ? { secids: [sectionId] } : {}),
  });
  const scopeText = scope === "SECTION" ? "this section" : scope === "CLASS" ? `all sections of ${className}` : "the whole school";

  async function apply(action: CalendarMark | "REMOVE") {
    if (lock.current || selected.size === 0) return;
    if (action === "H" && !reason.trim()) {
      setMessage({ type: "err", text: "Enter a reason for the holiday." });
      return;
    }
    const dates = [...selected].sort();
    if (scope !== "SECTION" && !window.confirm(`Apply this change to ${scopeText} for ${dates.length} date(s)?`)) return;

    lock.current = true;
    setIsApplying(true);
    setMessage(null);
    try {
      const res =
        action === "REMOVE"
          ? await calendarService.removeDates({ schId, session: sessionName, dates, ...scopeTarget() })
          : await calendarService.markDates({
              schId,
              session: sessionName,
              dates: dates.map((date) => ({ date, markas: action, ...(action === "H" ? { res: reason.trim() } : {}) })),
              ...scopeTarget(),
            });
      const failed = res.data?.failed?.length ?? 0;
      setMessage(
        failed
          ? { type: "warn", text: `Updated ${res.data.updated} of ${res.data.matched} sections; ${failed} failed.` }
          : { type: "ok", text: `Saved for ${scopeText} (${res.data.updated} section${res.data.updated === 1 ? "" : "s"} updated).` }
      );
      setSelected(new Set());
      if (action === "H") setReason("");
      await loadCalendar();
    } catch (err) {
      setMessage({ type: "err", text: err instanceof ApiError ? err.message : "Could not update the calendar." });
    } finally {
      lock.current = false;
      setIsApplying(false);
    }
  }

  const btn = "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50";

  if (!validSession) {
    return (
      <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
        The calendar needs a session named like “2026-27”. The selected session is “{sessionName}”.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <SectionCard title="Select Section" icon={CalendarDays}>
        <div className="space-y-4">
          {setupError && (
            <p className="flex items-center gap-1.5 text-sm text-red-700"><AlertCircle size={14} /> {setupError}</p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="cal-class" className={labelClasses}>Class</label>
              <select
                id="cal-class"
                value={classId}
                onChange={(e) => { setClassId(e.target.value); setSectionId(""); setEntries([]); setSelected(new Set()); setMessage(null); }}
                disabled={setupLoading}
                className={inputClasses}
              >
                <option value="">{setupLoading ? "Loading classes…" : "Select a class"}</option>
                {schClasses.map((c) => (
                  <option key={c.classID._id} value={c.classID._id}>{c.classID.className}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="cal-section" className={labelClasses}>Section</label>
              <select
                id="cal-section"
                value={sectionId}
                onChange={(e) => { setSectionId(e.target.value); setSelected(new Set()); setMessage(null); }}
                disabled={!classId || sectionOptions.length === 0}
                className={inputClasses}
              >
                <option value="">
                  {!classId ? "Select a class first" : sectionOptions.length === 0 ? "No sections for this class" : "Select a section"}
                </option>
                {sectionOptions.map((s) => (
                  <option key={s._id} value={s._id}>{s.sectionName}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </SectionCard>

      {ready && (
        <>
          <SectionCard title={`Calendar ${sessionName}`} icon={CalendarDays}>
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-soft">
                {(Object.keys(MARK_STYLE) as CalendarMark[]).map((k) => (
                  <span key={k} className="flex items-center gap-1.5">
                    <i className={`h-2.5 w-2.5 rounded-full ${MARK_STYLE[k].dot}`} />
                    {MARK_STYLE[k].label} ({counts[k]})
                  </span>
                ))}
                <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-marigold" /> Selected</span>
                {calLoading && <span className="flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Loading…</span>}
              </div>
              {calError && (
                <p className="flex items-center gap-1.5 text-sm text-red-700"><AlertCircle size={14} /> {calError}</p>
              )}
              <div className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-3 ${calLoading ? "opacity-60" : ""}`}>
                {sessionMonths(startYear).map(({ y, m }) => (
                  <MonthCard key={`${y}-${m}`} y={y} m={m} marks={marks} selected={selected} today={today} onToggle={toggleDate} />
                ))}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Mark Selected Dates" icon={CalendarDays}>
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium text-ink">{selected.size} date(s) selected</span>
                <button type="button" onClick={selectSundays} className="rounded-full border border-line bg-white px-3 py-1 text-xs font-medium text-ink hover:bg-paper">
                  Select all Sundays
                </button>
                {selected.size > 0 && (
                  <button type="button" onClick={() => setSelected(new Set())} className="text-xs font-medium text-marigold-dark hover:underline">
                    Clear
                  </button>
                )}
              </div>

              <div className="space-y-1">
                <p className={labelClasses}>Apply to</p>
                <div role="radiogroup" aria-label="Apply to" className="inline-flex flex-wrap overflow-hidden rounded-md border border-line">
                  {([["SECTION", "This section"], ["CLASS", `All sections of ${className || "class"}`], ["ALL", "Whole school"]] as [CalendarScope, string][]).map(([value, text]) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={scope === value}
                      onClick={() => setScope(value)}
                      className={`px-3 py-1.5 text-sm transition ${scope === value ? "bg-marigold font-medium text-chalkboard" : "bg-white text-ink hover:bg-chalk"}`}
                    >
                      {text}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="cal-reason" className={labelClasses}>Holiday reason (needed for Holiday)</label>
                <input id="cal-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Diwali" className={inputClasses} />
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={isApplying || selected.size === 0} onClick={() => apply("H")} className={`${btn} bg-red-500 text-white hover:bg-red-600`}>
                  {isApplying && <Loader2 size={14} className="animate-spin" />} Mark Holiday
                </button>
                <button type="button" disabled={isApplying || selected.size === 0} onClick={() => apply("S")} className={`${btn} bg-slate-600 text-white hover:bg-slate-700`}>
                  Weekly Off
                </button>
                <button type="button" disabled={isApplying || selected.size === 0} onClick={() => apply("W")} className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700`}>
                  Working Day
                </button>
                <button type="button" disabled={isApplying || selected.size === 0} onClick={() => apply("REMOVE")} className={`${btn} border border-line bg-white text-ink hover:bg-chalk`}>
                  Remove Mark
                </button>
              </div>

              {message && (
                <p
                  role={message.type === "err" ? "alert" : "status"}
                  className={`flex items-center gap-1.5 text-sm ${message.type === "ok" ? "text-emerald-700" : message.type === "warn" ? "text-amber-700" : "text-red-700"}`}
                >
                  {message.type === "ok" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />} {message.text}
                </p>
              )}
            </div>
          </SectionCard>

          {holidays.length > 0 && (
            <SectionCard title={`Holidays (${holidays.length})`} icon={CalendarDays}>
              <ul className="grid gap-2 sm:grid-cols-2">
                {holidays.map((h) => (
                  <li key={h.date} className="flex items-center justify-between gap-3 rounded-md border border-line bg-white px-3 py-2 text-sm">
                    <span className="font-medium text-ink">{prettyDate(h.date.slice(0, 10))}</span>
                    <span className="truncate text-ink-soft">{h.res}</span>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}
        </>
      )}
    </div>
  );
}

function SchoolCalendarPage() {
  const { selectedSchool } = useSelectedSchool();
  const { selectedSession } = useSelectedSession();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-ink">School Calendar</h1>
        {selectedSchool && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
            <School size={14} className="text-marigold-dark" />
            {selectedSchool.name}
            {selectedSession && ` · Session ${selectedSession.name}`}
          </p>
        )}
      </div>

      {selectedSchool && selectedSession ? (
        <CalendarContent key={`${selectedSchool.id}:${selectedSession.id}`} schId={selectedSchool.id} sessionName={selectedSession.name} />
      ) : (
        <div className="rounded-lg border border-dashed border-line bg-white px-5 py-10 text-center">
          <AlertCircle size={28} className="mx-auto text-marigold-dark" />
          <p className="mt-3 font-display text-lg text-ink">
            {selectedSchool ? "No session selected" : "No school selected"}
          </p>
          <p className="mt-1 text-sm text-ink-soft">Use the settings icon at the top right to select a school and session first.</p>
        </div>
      )}
    </div>
  );
}

export default SchoolCalendarPage;
