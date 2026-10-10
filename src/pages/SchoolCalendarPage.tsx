import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
import {
  AlertCircle,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2,
  School,
  Trash2,
  X,
} from "lucide-react";
import { SectionCard } from "../components/common/SectionCard";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { MonthGrid } from "../components/calendar/MonthGrid";
import { MARK_STYLE } from "../components/calendar/markStyle";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useSelectedSchool } from "../hooks/useSelectedSchool";
import { useSelectedSession } from "../hooks/useSelectedSession";
import { calendarService } from "../services/calendar.service";
import { schoolSettingService } from "../services/schoolSetting.service";
import { ApiError } from "../types/api.types";
import type { CalendarDateEntry, CalendarMark, CalendarScope } from "../types/calendar.types";
import type { SchClass } from "../types/superadmin.types";
import {
  MONTHS,
  MONTHS_SHORT,
  SESSION_FORMAT,
  addDays,
  compressRanges,
  datesInRange,
  groupHolidays,
  iso,
  monthIndexOf,
  prettyDate,
  prettyRange,
  sessionBounds,
  sessionMonths,
  todayLocal,
  weekdayName,
  weekdayOf,
  weekdayDatesInMonth,
  type HolidayGroup,
} from "../lib/calendarDates";

const inputClasses =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-marigold/40 disabled:opacity-60";
const labelClasses = "text-sm font-medium text-ink-soft";

type ApplyAction = CalendarMark | "REMOVE";
type Message = { type: "ok" | "warn" | "err"; text: string };
interface PendingApply {
  action: ApplyAction;
  dates: string[];
  scope: CalendarScope;
  reason: string;
}
interface CalendarSnapshot {
  key: string;
  entries: CalendarDateEntry[];
  error: string | null;
}

const ACTION_COPY: Record<
  ApplyAction,
  { title: string; confirm: string; verb: string; tone: "danger" | "slate" | "success" | "neutral" }
> = {
  H: { title: "Mark as holiday?", confirm: "Mark holiday", verb: "marked as a holiday", tone: "danger" },
  S: { title: "Mark as weekly off?", confirm: "Mark weekly off", verb: "marked as weekly off", tone: "slate" },
  W: { title: "Mark as working day?", confirm: "Mark working day", verb: "marked as working days", tone: "success" },
  REMOVE: { title: "Remove marks?", confirm: "Remove marks", verb: "cleared back to regular days", tone: "neutral" },
};

function MonthSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-line bg-white p-3" aria-hidden="true">
      <div className="mb-3 h-4 w-28 rounded bg-chalk" />
      <div className="mb-3 flex gap-1.5">
        <div className="h-5 w-14 rounded-full bg-chalk" />
        <div className="h-5 w-16 rounded-full bg-chalk" />
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }, (_, i) => (
          <div key={i} className="aspect-square rounded-lg bg-chalk" />
        ))}
      </div>
    </div>
  );
}

function CalendarContent({ schId, sessionName }: { schId: string; sessionName: string }) {
  const validSession = SESSION_FORMAT.test(sessionName);
  const startYear = validSession ? parseInt(sessionName.slice(0, 4), 10) : 0;
  const months = useMemo(() => (validSession ? sessionMonths(startYear) : []), [validSession, startYear]);

  // How many months fit side by side: 1 on phones, 2 on tablets, 3 on wide screens.
  const wide = useMediaQuery("(min-width: 1280px)");
  const mid = useMediaQuery("(min-width: 768px)");
  const pageSize = wide ? 3 : mid ? 2 : 1;

  // ---- class / section selection ----
  const [schClasses, setSchClasses] = useState<SchClass[]>([]);
  const [setupLoading, setSetupLoading] = useState(true);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");

  // ---- calendar data ----
  const [cal, setCal] = useState<CalendarSnapshot | null>(null);
  const latestKey = useRef<string | null>(null);

  // ---- view state ----
  const [startIdxRaw, setStartIdx] = useState(() => {
    const idx = validSession ? monthIndexOf(startYear, todayLocal()) : -1;
    return Math.max(idx, 0);
  });
  const [focusDate, setFocusDate] = useState(() => {
    const t = todayLocal();
    return validSession && monthIndexOf(startYear, t) !== -1 ? t : `${startYear}-04-01`;
  });
  const [activeDate, setActiveDate] = useState<string | null>(null);

  // ---- selection + apply ----
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [anchorDate, setAnchorDate] = useState<string | null>(null);
  const [rangeMode, setRangeMode] = useState(false);
  const [scope, setScope] = useState<CalendarScope>("SECTION");
  const [reason, setReason] = useState("");
  const [applyingAction, setApplyingAction] = useState<ApplyAction | null>(null);
  const [pending, setPending] = useState<PendingApply | null>(null);
  const [message, setMessage] = useState<Message | null>(null);

  const lock = useRef(false);
  const drag = useRef<{ active: boolean; mode: "add" | "remove"; last: string }>({
    active: false,
    mode: "add",
    last: "",
  });
  const lastPointer = useRef("mouse");
  const pendingFocus = useRef<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const reasonRef = useRef<HTMLInputElement>(null);

  const ready = Boolean(classId && sectionId && validSession);
  const calKey = ready ? `${schId}|${sessionName}|${classId}|${sectionId}` : null;

  // ---------- data loading ----------
  useEffect(() => {
    let cancelled = false;
    schoolSettingService
      .getSchClasses(schId)
      .then((res) => {
        if (!cancelled) setSchClasses(res.schClasses ?? []);
      })
      .catch((err) => {
        if (!cancelled) setSetupError(err instanceof ApiError ? err.message : "Could not load classes.");
      })
      .finally(() => {
        if (!cancelled) setSetupLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [schId]);

  const loadSnapshot = useCallback(
    async (key: string): Promise<CalendarSnapshot> => {
      try {
        const res = await calendarService.getCalendar({
          schId,
          session: sessionName,
          clsid: classId,
          secid: sectionId,
        });
        return { key, entries: (res.data.cal ?? []).flatMap((m) => m.dates ?? []), error: null };
      } catch (err) {
        return {
          key,
          entries: [],
          error: err instanceof ApiError ? err.message : "Could not load the calendar.",
        };
      }
    },
    [schId, sessionName, classId, sectionId]
  );

  // Reload after a change (or a retry). Ignored if another section was picked meanwhile.
  const refetch = useCallback(
    async (key: string) => {
      const snapshot = await loadSnapshot(key);
      if (latestKey.current === key) setCal(snapshot);
    },
    [loadSnapshot]
  );

  useEffect(() => {
    latestKey.current = calKey;
    if (!calKey) return;
    let cancelled = false;
    loadSnapshot(calKey).then((snapshot) => {
      if (!cancelled) setCal(snapshot);
    });
    return () => {
      cancelled = true;
    };
  }, [calKey, loadSnapshot]);

  // Success / warning messages fade away on their own; errors stay until dismissed.
  useEffect(() => {
    if (!message || message.type === "err") return;
    const id = window.setTimeout(() => setMessage(null), 6000);
    return () => window.clearTimeout(id);
  }, [message]);

  // A mouse drag always ends when the button is released, wherever that happens.
  useEffect(() => {
    const stop = () => {
      drag.current.active = false;
    };
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, []);

  // After a keyboard move into another month, put the focus on the new day once it exists.
  useEffect(() => {
    if (!pendingFocus.current) return;
    const el = gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${pendingFocus.current}"]`);
    if (el) {
      el.focus();
      pendingFocus.current = null;
    }
  });

  // ---------- derived data ----------
  const calLoading = calKey !== null && cal?.key !== calKey;
  const entries = useMemo(() => (cal && cal.key === calKey ? cal.entries : []), [cal, calKey]);
  const calError = cal && cal.key === calKey ? cal.error : null;

  const marks = useMemo(() => new Map(entries.map((e) => [e.date.slice(0, 10), e])), [entries]);
  const holidayGroups = useMemo(() => groupHolidays(entries), [entries]);
  const totals = useMemo(() => {
    const c = { H: 0, S: 0, W: 0 };
    entries.forEach((e) => {
      c[e.markas] += 1;
    });
    return c;
  }, [entries]);

  const selectedClass = schClasses.find((c) => c.classID._id === classId);
  const sectionOptions = selectedClass?.sectionID ?? [];
  const className = selectedClass?.classID.className ?? "";

  const today = todayLocal();
  const startIdx = Math.min(startIdxRaw, 12 - pageSize);
  const visibleMonths = months.slice(startIdx, startIdx + pageSize);
  const clampStart = (i: number) => Math.max(0, Math.min(i, 12 - pageSize));
  const todayIdx = validSession ? monthIndexOf(startYear, today) : -1;

  const focusIdx = validSession ? monthIndexOf(startYear, focusDate) : -1;
  const tabbableDate =
    focusIdx >= startIdx && focusIdx < startIdx + pageSize
      ? focusDate
      : visibleMonths[0]
        ? iso(visibleMonths[0].y, visibleMonths[0].m, 1)
        : focusDate;

  const monthIndicators = useMemo(() => {
    const map = new Map<string, { holidays: number; picked: number }>();
    const bump = (date: string, key: "holidays" | "picked") => {
      const k = date.slice(0, 7);
      const cur = map.get(k) ?? { holidays: 0, picked: 0 };
      cur[key] += 1;
      map.set(k, cur);
    };
    entries.forEach((e) => e.markas === "H" && bump(e.date, "holidays"));
    selected.forEach((d) => bump(d, "picked"));
    return map;
  }, [entries, selected]);

  const selectedList = useMemo(() => [...selected].sort(), [selected]);
  const selectedRanges = useMemo(() => compressRanges(selectedList), [selectedList]);

  const scopeText = (s: CalendarScope) =>
    s === "SECTION" ? "this section" : s === "CLASS" ? `all sections of ${className}` : "the whole school";

  // ---------- selection ----------
  const applyToSelection = (dates: string[], mode: "add" | "remove") =>
    setSelected((prev) => {
      const next = new Set(prev);
      dates.forEach((d) => (mode === "add" ? next.add(d) : next.delete(d)));
      return next;
    });

  function selectDate(date: string, opts: { shift: boolean; startDrag: boolean }) {
    setActiveDate(date);
    setFocusDate(date);
    setMessage(null);

    // Shift+click (or Range mode on touch) selects everything between the last pick and this one.
    if ((opts.shift || rangeMode) && anchorDate && anchorDate !== date) {
      applyToSelection(datesInRange(anchorDate, date), "add");
      setAnchorDate(date);
      return;
    }

    const mode = selected.has(date) ? "remove" : "add";
    applyToSelection([date], mode);
    setAnchorDate(date);
    if (opts.startDrag) drag.current = { active: true, mode, last: date };
  }

  function onDayPointerDown(e: PointerEvent<HTMLButtonElement>, date: string) {
    lastPointer.current = e.pointerType;
    if (e.pointerType !== "mouse" || e.button !== 0) return; // touch / pen are handled by click
    selectDate(date, { shift: e.shiftKey, startDrag: true });
  }

  function onDayEnter(date: string) {
    if (!drag.current.active) return;
    const from = drag.current.last;
    drag.current.last = date;
    applyToSelection(datesInRange(from, date), drag.current.mode);
    setActiveDate(date);
  }

  function onDayClick(e: MouseEvent<HTMLButtonElement>, date: string) {
    // A real mouse click was already handled on pointer down; keyboard (detail 0) and touch land here.
    if (lastPointer.current === "mouse" && e.detail > 0) return;
    selectDate(date, { shift: e.shiftKey, startDrag: false });
  }

  function onDayKeyDown(e: KeyboardEvent<HTMLButtonElement>, date: string) {
    const step = ({ ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 } as Record<string, number>)[e.key];
    if (!step) return;
    e.preventDefault();
    const target = addDays(date, step);
    const idx = monthIndexOf(startYear, target);
    if (idx === -1) return;
    lastPointer.current = "keyboard";
    setFocusDate(target);
    pendingFocus.current = target;
    if (idx < startIdx) setStartIdx(clampStart(idx));
    else if (idx >= startIdx + pageSize) setStartIdx(clampStart(idx - pageSize + 1));
  }

  function selectWeekdayInMonth(y: number, m: number, weekday: number) {
    applyToSelection(weekdayDatesInMonth(y, m, weekday), "add");
    setMessage(null);
  }

  function clearMonth(y: number, m: number) {
    const prefix = `${y}-${String(m + 1).padStart(2, "0")}`;
    setSelected((prev) => new Set([...prev].filter((d) => !d.startsWith(prefix))));
  }

  function selectAllSundays() {
    const { start, end } = sessionBounds(startYear);
    const first = addDays(start, (7 - weekdayOf(start)) % 7);
    const sundays: string[] = [];
    for (let d = first; d <= end; d = addDays(d, 7)) sundays.push(d);
    applyToSelection(sundays, "add");
    setMessage(null);
  }

  function clearSelection() {
    setSelected(new Set());
    setAnchorDate(null);
  }

  function resetForNewTarget() {
    clearSelection();
    setActiveDate(null);
    setMessage(null);
  }

  // ---------- navigation ----------
  function jumpToToday() {
    if (todayIdx === -1) return;
    setStartIdx(clampStart(todayIdx));
    setFocusDate(today);
    setActiveDate(today);
  }

  function jumpToGroup(group: HolidayGroup) {
    const idx = monthIndexOf(startYear, group.start);
    if (idx !== -1) setStartIdx(clampStart(idx));
    applyToSelection(group.dates, "add");
    setFocusDate(group.start);
    setActiveDate(group.start);
    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ---------- applying changes ----------
  function requestApply(
    action: ApplyAction,
    dates: string[],
    opts: { scope?: CalendarScope; forceConfirm?: boolean } = {}
  ) {
    if (lock.current || dates.length === 0) return;
    const useScope = opts.scope ?? scope;
    if (action === "H" && !reason.trim()) {
      setMessage({ type: "err", text: "Add a reason for the holiday, for example “Diwali”." });
      reasonRef.current?.focus();
      return;
    }
    const request: PendingApply = {
      action,
      dates: [...dates].sort(),
      scope: useScope,
      reason: reason.trim(),
    };
    if (useScope !== "SECTION" || opts.forceConfirm) setPending(request);
    else void execute(request);
  }

  async function execute(p: PendingApply) {
    if (lock.current || !calKey) return;
    lock.current = true;
    setApplyingAction(p.action);
    setMessage(null);

    const target = {
      scope: p.scope,
      ...(p.scope !== "ALL" ? { clsid: classId } : {}),
      ...(p.scope === "SECTION" ? { secids: [sectionId] } : {}),
    };

    try {
      const res =
        p.action === "REMOVE"
          ? await calendarService.removeDates({ schId, session: sessionName, dates: p.dates, ...target })
          : await calendarService.markDates({
              schId,
              session: sessionName,
              dates: p.dates.map((date) => ({
                date,
                markas: p.action as CalendarMark,
                ...(p.action === "H" ? { res: p.reason } : {}),
              })),
              ...target,
            });

      const failed = res.data?.failed?.length ?? 0;
      const updated = res.data?.updated ?? 0;
      const where = scopeText(p.scope);
      setMessage(
        failed
          ? { type: "warn", text: `Saved for ${updated} of ${res.data.matched} sections. ${failed} could not be updated, so try again.` }
          : {
              type: "ok",
              text:
                p.action === "REMOVE"
                  ? `Marks removed for ${where}.`
                  : `${ACTION_COPY[p.action].confirm} saved for ${where} (${p.dates.length} date${p.dates.length === 1 ? "" : "s"}).`,
            }
      );
      setSelected((prev) => new Set([...prev].filter((d) => !p.dates.includes(d))));
      if (p.action === "H") setReason("");
      await refetch(calKey);
    } catch (err) {
      setMessage({ type: "err", text: err instanceof ApiError ? err.message : "Could not update the calendar." });
    } finally {
      lock.current = false;
      setApplyingAction(null);
      setPending(null);
    }
  }

  const busy = applyingAction !== null;
  const activeEntry = activeDate ? marks.get(activeDate) : undefined;
  const rangeLabel = visibleMonths.length
    ? `${MONTHS[visibleMonths[0].m]} ${visibleMonths[0].y}${
        visibleMonths.length > 1
          ? ` – ${MONTHS_SHORT[visibleMonths[visibleMonths.length - 1].m]} ${visibleMonths[visibleMonths.length - 1].y}`
          : ""
      }`
    : "";

  const toolButton =
    "inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-chalk disabled:cursor-not-allowed disabled:opacity-40";
  const barInput =
    "rounded-md border border-white/15 bg-chalkboard-light px-3 py-2 text-sm text-chalk placeholder:text-chalk/50 focus:outline-none focus:ring-2 focus:ring-marigold/60 disabled:opacity-60";
  const actionButton =
    "inline-flex items-center justify-center gap-1.5 rounded-md px-3.5 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-2 focus-visible:ring-offset-chalkboard disabled:cursor-not-allowed disabled:opacity-50";

  if (!validSession) {
    return (
      <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
        The calendar needs a session named like “2026-27”. The selected session is “{sessionName}”.
      </p>
    );
  }

  return (
    <div className="space-y-6 pb-2">
      <SectionCard title="Select section" icon={CalendarDays}>
        <div className="space-y-4">
          {setupError && (
            <p role="alert" className="flex items-center gap-1.5 text-sm text-red-700">
              <AlertCircle size={14} /> {setupError}
            </p>
          )}
          {!setupLoading && !setupError && schClasses.length === 0 && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              This school has no classes yet. Add them in School Setting, Class &amp; Section Setup, then come back.
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="cal-class" className={labelClasses}>Class</label>
              <select
                id="cal-class"
                value={classId}
                onChange={(e) => {
                  const next = e.target.value;
                  const sections = schClasses.find((c) => c.classID._id === next)?.sectionID ?? [];
                  setClassId(next);
                  setSectionId(sections.length === 1 ? sections[0]._id : "");
                  setScope("SECTION");
                  resetForNewTarget();
                }}
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
                onChange={(e) => {
                  setSectionId(e.target.value);
                  resetForNewTarget();
                }}
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

      {!ready && !setupLoading && schClasses.length > 0 && (
        <div className="rounded-lg border border-dashed border-line bg-white px-5 py-10 text-center">
          <CalendarDays size={28} className="mx-auto text-marigold-dark" />
          <p className="mt-3 font-display text-lg text-ink">Pick a class and section</p>
          <p className="mt-1 text-sm text-ink-soft">
            Its calendar for {sessionName} will appear here. You can then copy any change to the whole class or school.
          </p>
        </div>
      )}

      {ready && (
        <>
          <div ref={cardRef} className="scroll-mt-20">
            <SectionCard title={`Calendar ${sessionName}`} icon={CalendarDays}>
              <div className="space-y-4">
                {/* Navigator */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Previous months"
                      disabled={startIdx === 0}
                      onClick={() => setStartIdx(clampStart(startIdx - pageSize))}
                      className={`${toolButton} !px-2`}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      aria-label="Next months"
                      disabled={startIdx + pageSize >= 12}
                      onClick={() => setStartIdx(clampStart(startIdx + pageSize))}
                      className={`${toolButton} !px-2`}
                    >
                      <ChevronRight size={16} />
                    </button>
                    <h3 aria-live="polite" className="font-display text-lg text-ink">{rangeLabel}</h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={jumpToToday} disabled={todayIdx === -1} className={toolButton}>
                      Today
                    </button>
                    <button
                      type="button"
                      aria-pressed={rangeMode}
                      onClick={() => setRangeMode((v) => !v)}
                      className={`${toolButton} ${rangeMode ? "!border-marigold-dark !bg-marigold !text-chalkboard" : ""}`}
                    >
                      <CalendarRange size={15} /> Range
                    </button>
                    <button type="button" onClick={selectAllSundays} className={toolButton}>
                      All Sundays
                    </button>
                  </div>
                </div>

                {/* Month strip */}
                <div role="group" aria-label="Jump to month" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
                  {months.map((mo, i) => {
                    const visible = i >= startIdx && i < startIdx + pageSize;
                    const ind = monthIndicators.get(`${mo.y}-${String(mo.m + 1).padStart(2, "0")}`);
                    return (
                      <button
                        key={`${mo.y}-${mo.m}`}
                        type="button"
                        aria-current={visible ? "true" : undefined}
                        onClick={() => setStartIdx(clampStart(i))}
                        className={`relative shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition ${
                          visible
                            ? "border-chalkboard bg-chalkboard text-chalk"
                            : "border-line bg-paper text-ink hover:bg-chalk"
                        }`}
                      >
                        {MONTHS_SHORT[mo.m]}
                        {ind?.holidays ? (
                          <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                        ) : null}
                        {ind?.picked ? (
                          <span aria-hidden="true" className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-marigold ring-2 ring-white" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-ink-soft">
                  {(Object.keys(MARK_STYLE) as CalendarMark[]).map((k) => (
                    <span key={k} className="flex items-center gap-1.5">
                      <i className={`h-2.5 w-2.5 rounded-full ${MARK_STYLE[k].dot}`} />
                      {MARK_STYLE[k].label} ({totals[k]})
                    </span>
                  ))}
                  <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-marigold" /> Selected</span>
                  <span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-marigold-dark" /> Today</span>
                  {calLoading && (
                    <span className="flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Loading calendar…</span>
                  )}
                </div>

                {/* Messages */}
                {message && (
                  <div
                    role={message.type === "err" ? "alert" : "status"}
                    className={`flex items-start justify-between gap-3 rounded-md px-3 py-2 text-sm ${
                      message.type === "ok"
                        ? "bg-emerald-50 text-emerald-800"
                        : message.type === "warn"
                          ? "bg-amber-50 text-amber-800"
                          : "bg-red-50 text-red-700"
                    }`}
                  >
                    <span className="flex items-start gap-1.5">
                      {message.type === "ok" ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" /> : <AlertCircle size={15} className="mt-0.5 shrink-0" />}
                      {message.text}
                    </span>
                    <button type="button" aria-label="Dismiss message" onClick={() => setMessage(null)} className="shrink-0 opacity-70 hover:opacity-100">
                      <X size={14} />
                    </button>
                  </div>
                )}
                {calError && (
                  <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                    <span className="flex items-center gap-1.5"><AlertCircle size={15} /> {calError}</span>
                    <button type="button" onClick={() => calKey && void refetch(calKey)} className="font-medium underline">
                      Try again
                    </button>
                  </div>
                )}
                {!calLoading && !calError && totals.S === 0 && (
                  <div className="flex flex-wrap items-center gap-3 rounded-md bg-marigold/10 px-3 py-2 text-sm text-ink">
                    <Info size={15} className="shrink-0 text-marigold-dark" />
                    <span>Sundays are not marked automatically. Select them all, then choose Weekly off.</span>
                    <button type="button" onClick={selectAllSundays} className="font-medium text-marigold-dark underline">
                      Select all Sundays
                    </button>
                  </div>
                )}

                {/* Day details */}
                <div aria-live="polite" className="flex min-h-9 flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-paper px-3 py-2 text-sm">
                  {activeDate ? (
                    <>
                      <span className="font-medium text-ink">{weekdayName(activeDate)}, {prettyDate(activeDate)}</span>
                      {activeEntry ? (
                        <>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${MARK_STYLE[activeEntry.markas].cell}`}>
                            {MARK_STYLE[activeEntry.markas].label}
                          </span>
                          {activeEntry.res && <span className="text-ink-soft">{activeEntry.res}</span>}
                        </>
                      ) : (
                        <span className="text-ink-soft">Regular day, nothing marked</span>
                      )}
                    </>
                  ) : (
                    <span className="text-ink-soft">
                      Click or drag across dates to select them. Hold Shift to pick a range, or turn on Range for touch screens.
                      {rangeMode && anchorDate ? ` Now choose the last date after ${prettyDate(anchorDate)}.` : ""}
                    </span>
                  )}
                </div>

                {/* Months */}
                <div
                  ref={gridRef}
                  className={`grid select-none gap-4 transition-opacity ${pageSize === 3 ? "grid-cols-3" : pageSize === 2 ? "grid-cols-2" : "grid-cols-1"} ${
                    calLoading ? "opacity-60" : ""
                  }`}
                >
                  {calLoading && !cal
                    ? visibleMonths.map((mo) => <MonthSkeleton key={`${mo.y}-${mo.m}`} />)
                    : visibleMonths.map(({ y, m }) => (
                        <MonthGrid
                          key={`${y}-${m}`}
                          y={y}
                          m={m}
                          marks={marks}
                          selected={selected}
                          today={today}
                          activeDate={activeDate}
                          tabbableDate={tabbableDate}
                          onDayPointerDown={onDayPointerDown}
                          onDayEnter={onDayEnter}
                          onDayClick={onDayClick}
                          onDayKeyDown={onDayKeyDown}
                          onSelectWeekday={selectWeekdayInMonth}
                          onClearMonth={clearMonth}
                        />
                      ))}
                </div>
              </div>
            </SectionCard>
          </div>

          <SectionCard title={`Holidays${holidayGroups.length ? ` (${totals.H} day${totals.H === 1 ? "" : "s"})` : ""}`} icon={CalendarDays}>
            {holidayGroups.length === 0 ? (
              <p className="text-sm text-ink-soft">
                {calLoading ? "Loading holidays…" : "No holidays marked for this section yet. Select dates above and choose Holiday."}
              </p>
            ) : (
              <ul className="grid gap-2 md:grid-cols-2">
                {holidayGroups.map((g) => (
                  <li key={g.start} className="flex items-stretch overflow-hidden rounded-md border border-line bg-white">
                    <span aria-hidden="true" className="w-1 shrink-0 bg-red-400" />
                    <button
                      type="button"
                      onClick={() => jumpToGroup(g)}
                      className="min-w-0 flex-1 px-3 py-2 text-left transition hover:bg-chalk focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-marigold-dark"
                    >
                      <span className="block truncate text-sm font-medium text-ink">{g.reason || "Holiday"}</span>
                      <span className="block text-xs text-ink-soft">
                        {prettyRange(g.start, g.end)}
                        {g.dates.length > 1 ? `, ${g.dates.length} days` : ""}
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove holiday ${g.reason || prettyRange(g.start, g.end)}`}
                      disabled={busy}
                      onClick={() => requestApply("REMOVE", g.dates, { scope: "SECTION", forceConfirm: true })}
                      className="px-3 text-ink-soft transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-400 disabled:opacity-40"
                    >
                      <Trash2 size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </>
      )}

      {/* Action bar: appears as soon as dates are selected */}
      {ready && selected.size > 0 && (
        <div className="sticky bottom-3 z-30 animate-rise motion-reduce:animate-none">
          <div className="space-y-3 rounded-xl border border-chalkboard-light bg-chalkboard p-4 text-chalk shadow-xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display text-base">
                {selected.size} date{selected.size === 1 ? "" : "s"} selected
              </span>
              {selectedRanges.slice(0, 3).map(([a, b]) => (
                <span key={a} className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs">{prettyRange(a, b)}</span>
              ))}
              {selectedRanges.length > 3 && (
                <span className="text-xs text-chalk/70">+{selectedRanges.length - 3} more</span>
              )}
              <button
                type="button"
                onClick={clearSelection}
                className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-chalk/80 transition hover:bg-white/10 hover:text-chalk"
              >
                <X size={13} /> Clear selection
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div role="radiogroup" aria-label="Apply to" className="inline-flex overflow-hidden rounded-md border border-white/15">
                {(
                  [
                    ["SECTION", "This section"],
                    ["CLASS", `All of ${className || "class"}`],
                    ["ALL", "Whole school"],
                  ] as [CalendarScope, string][]
                ).map(([value, text]) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={scope === value}
                    disabled={busy}
                    onClick={() => setScope(value)}
                    className={`px-3 py-2 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-marigold ${
                      scope === value ? "bg-marigold font-medium text-chalkboard" : "text-chalk/85 hover:bg-white/10"
                    }`}
                  >
                    {text}
                  </button>
                ))}
              </div>
              <input
                ref={reasonRef}
                aria-label="Holiday reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Holiday reason, e.g. Diwali"
                disabled={busy}
                className={`${barInput} min-w-[12rem] flex-1`}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={() => requestApply("H", selectedList)} className={`${actionButton} bg-red-500 text-white hover:bg-red-600`}>
                {applyingAction === "H" && <Loader2 size={14} className="animate-spin" />} Mark holiday
              </button>
              <button type="button" disabled={busy} onClick={() => requestApply("S", selectedList)} className={`${actionButton} bg-slate-500 text-white hover:bg-slate-600`}>
                {applyingAction === "S" && <Loader2 size={14} className="animate-spin" />} Weekly off
              </button>
              <button type="button" disabled={busy} onClick={() => requestApply("W", selectedList)} className={`${actionButton} bg-emerald-600 text-white hover:bg-emerald-700`}>
                {applyingAction === "W" && <Loader2 size={14} className="animate-spin" />} Working day
              </button>
              <button type="button" disabled={busy} onClick={() => requestApply("REMOVE", selectedList)} className={`${actionButton} border border-white/25 text-chalk hover:bg-white/10`}>
                {applyingAction === "REMOVE" && <Loader2 size={14} className="animate-spin" />} Remove marks
              </button>
            </div>
          </div>
        </div>
      )}

      {pending && (
        <ConfirmDialog
          title={ACTION_COPY[pending.action].title}
          confirmLabel={ACTION_COPY[pending.action].confirm}
          tone={ACTION_COPY[pending.action].tone}
          busy={busy}
          onConfirm={() => void execute(pending)}
          onCancel={() => setPending(null)}
        >
          <p>
            {pending.dates.length} date{pending.dates.length === 1 ? "" : "s"} (
            {compressRanges(pending.dates)
              .slice(0, 3)
              .map(([a, b]) => prettyRange(a, b))
              .join(", ")}
            {compressRanges(pending.dates).length > 3 ? " and more" : ""}) will be {ACTION_COPY[pending.action].verb} for{" "}
            <strong className="text-ink">{scopeText(pending.scope)}</strong>.
          </p>
          {pending.action === "H" && (
            <p>
              Reason: <strong className="text-ink">{pending.reason}</strong>
            </p>
          )}
          {pending.scope !== "SECTION" && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-amber-800">
              {pending.action === "REMOVE"
                ? "Marks on these dates will be cleared in every one of those sections."
                : "Any mark already on these dates in those sections will be replaced."}
            </p>
          )}
        </ConfirmDialog>
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
        <CalendarContent
          key={`${selectedSchool.id}:${selectedSession.id}`}
          schId={selectedSchool.id}
          sessionName={selectedSession.name}
        />
      ) : (
        <div className="rounded-lg border border-dashed border-line bg-white px-5 py-10 text-center">
          <AlertCircle size={28} className="mx-auto text-marigold-dark" />
          <p className="mt-3 font-display text-lg text-ink">
            {selectedSchool ? "No session selected" : "No school selected"}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            Use the settings icon at the top right to select a school and session first.
          </p>
        </div>
      )}
    </div>
  );
}

export default SchoolCalendarPage;
