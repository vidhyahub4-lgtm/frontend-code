import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, History } from "lucide-react";
import { SectionCard } from "../../components/common/SectionCard";
import { EntityTable } from "../../components/common/EntityTable";
import { SchoolSessionGate } from "../../components/common/SchoolSessionGate";
import { attendanceService } from "../../services/attendance.service";
import { schoolSettingService } from "../../services/schoolSetting.service";
import { ApiError } from "../../types/api.types";
import type { AttendanceAuditLog, AttendanceStatus } from "../../types/attendance.types";
import type { SchoolClass, Section } from "../../types/superadmin.types";

const PAGE_SIZE = 25;

const inputClasses =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-marigold/40 disabled:opacity-60";
const labelClasses = "text-sm font-medium text-ink-soft";

const STATUS_STYLES: Record<AttendanceStatus, string> = {
  present: "bg-green-50 text-green-700",
  absent: "bg-red-50 text-red-600",
  late: "bg-amber-50 text-amber-700",
  leave: "bg-sky-50 text-sky-700",
};

function StatusBadge({ status, emptyLabel }: { status: AttendanceStatus | null; emptyLabel: string }) {
  if (!status) {
    return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-ink-soft">{emptyLabel}</span>;
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[status]}`}>{status}</span>
  );
}

/** The day that was edited. Shown in IST so it matches the day the teacher picked. */
const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

/** When the change was saved (server time). */
const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });

const roleLabel = (role: string) => (role === "superAdmin" ? "Super Admin" : role === "admin" ? "Admin" : role);

function AttendanceLogContent({ schId, sessionId }: { schId: string; sessionId: string }) {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [sections, setSections] = useState<Section[]>([]);

  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  // The result remembers which query produced it, so "loading" is simply
  // "the stored result is not for the current filters yet".
  const queryKey = JSON.stringify([schId, sessionId, classId, sectionId, from, to, page]);
  const [result, setResult] = useState<{
    key: string;
    logs: AttendanceAuditLog[];
    total: number;
    error: string | null;
  } | null>(null);
  const isLoading = result?.key !== queryKey;
  const logs = result?.logs ?? [];
  const total = result?.total ?? 0;
  const error = isLoading ? null : (result?.error ?? null);

  // Class / section lists are only used for the filters and to turn ids into names.
  useEffect(() => {
    let cancelled = false;
    // Only this school's classes/sections (not the global lists).
    schoolSettingService
      .getSchClasses(schId)
      .then((res) => {
        if (cancelled) return;
        const rows = res.schClasses ?? [];
        const classMap = new Map<string, SchoolClass>();
        const sectionMap = new Map<string, Section>();
        rows.forEach((sc) => {
          classMap.set(sc.classID._id, {
            _id: sc.classID._id,
            className: sc.classID.className,
            classInWord: sc.classID.classInWord,
          });
          sc.sectionID.forEach((sec) =>
            sectionMap.set(sec._id, {
              _id: sec._id,
              sectionName: sec.sectionName,
              Maxlimit: sec.Maxlimit,
              classId: { _id: sc.classID._id, className: sc.classID.className },
            })
          );
        });
        setClasses(Array.from(classMap.values()));
        setSections(Array.from(sectionMap.values()));
      })
      .catch(() => {
        /* names fall back to "—"; the log itself still loads */
      });
    return () => {
      cancelled = true;
    };
  }, [schId]);

  useEffect(() => {
    let cancelled = false;
    attendanceService
      .getAttendanceLogs({
        schId,
        session: sessionId,
        class: classId,
        section: sectionId,
        from,
        to,
        page,
        limit: PAGE_SIZE,
      })
      .then((res) => {
        if (!cancelled) setResult({ key: queryKey, logs: res.data ?? [], total: res.total ?? 0, error: null });
      })
      .catch((err) => {
        if (!cancelled) {
          setResult({
            key: queryKey,
            logs: [],
            total: 0,
            error: err instanceof ApiError ? err.message : "Could not load the attendance log.",
          });
        }
      });
    return () => {
      cancelled = true; // a newer filter change replaced this request
    };
  }, [schId, sessionId, classId, sectionId, from, to, page, queryKey]);

  const className = useMemo(() => new Map(classes.map((c) => [c._id, c.className])), [classes]);
  const sectionName = useMemo(() => new Map(sections.map((s) => [s._id, s.sectionName])), [sections]);
  const sectionsOfClass = useMemo(() => sections.filter((s) => s.classId?._id === classId), [sections, classId]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = Boolean(classId || sectionId || from || to);

  function changeFilter(update: () => void) {
    update();
    setPage(1);
  }

  function resetFilters() {
    setClassId("");
    setSectionId("");
    setFrom("");
    setTo("");
    setPage(1);
  }

  return (
    <SectionCard title="Past-date Attendance Changes" icon={History}>
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <label htmlFor="al-class" className={labelClasses}>Class</label>
            <select
              id="al-class"
              value={classId}
              onChange={(e) =>
                changeFilter(() => {
                  setClassId(e.target.value);
                  setSectionId("");
                })
              }
              className={inputClasses}
            >
              <option value="">All classes</option>
              {classes.map((c) => (
                <option key={c._id} value={c._id}>{c.className}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="al-section" className={labelClasses}>Section</label>
            <select
              id="al-section"
              value={sectionId}
              disabled={!classId}
              onChange={(e) => changeFilter(() => setSectionId(e.target.value))}
              className={inputClasses}
            >
              <option value="">All sections</option>
              {sectionsOfClass.map((s) => (
                <option key={s._id} value={s._id}>{s.sectionName}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="al-from" className={labelClasses}>Attendance date from</label>
            <input
              id="al-from"
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => changeFilter(() => setFrom(e.target.value))}
              className={inputClasses}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="al-to" className={labelClasses}>Attendance date to</label>
            <input
              id="al-to"
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => changeFilter(() => setTo(e.target.value))}
              className={inputClasses}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-ink-soft">
          <p>
            {isLoading ? "Loading…" : `${total} change${total === 1 ? "" : "s"} found`}
          </p>
          {hasFilters && (
            <button type="button" onClick={resetFilters} className="text-xs font-medium text-marigold-dark hover:underline">
              Reset filters
            </button>
          )}
        </div>

        <EntityTable
          items={logs}
          getRowKey={(l) => l._id}
          isLoading={isLoading}
          error={error}
          emptyLabel="No past-date attendance changes found."
          columns={[
            {
              header: "Changed At",
              render: (l) => <span className="whitespace-nowrap">{formatDateTime(l.changedAt)}</span>,
            },
            {
              header: "Changed By",
              render: (l) => (
                <div>
                  <p className="font-medium text-ink">{l.changedByName || "—"}</p>
                  <p className="text-xs text-ink-soft">{roleLabel(l.changedByRole)}</p>
                </div>
              ),
            },
            {
              header: "Student",
              render: (l) => (
                <div>
                  <p className="font-medium text-ink">{l.studentName || "—"}</p>
                  <p className="text-xs text-ink-soft">
                    {[l.admno && `Adm ${l.admno}`, l.rollNo > 0 && `Roll ${l.rollNo}`].filter(Boolean).join(" · ")}
                  </p>
                </div>
              ),
            },
            {
              header: "Class",
              render: (l) =>
                [className.get(l.class), sectionName.get(l.section)].filter(Boolean).join(" - ") || "—",
            },
            {
              header: "Attendance Date",
              render: (l) => (
                <div className="whitespace-nowrap">
                  <p>{formatDay(l.attendanceDate)}</p>
                  <p className="text-xs text-ink-soft">{l.daysBack} day{l.daysBack === 1 ? "" : "s"} back</p>
                </div>
              ),
            },
            {
              header: "Change",
              render: (l) => (
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <StatusBadge status={l.oldStatus} emptyLabel="Not marked" />
                  <span className="text-ink-soft">→</span>
                  <StatusBadge status={l.newStatus} emptyLabel="Removed" />
                </div>
              ),
            },
            {
              header: "Reason",
              render: (l) => <span className="text-ink-soft">{l.reason || "—"}</span>,
            },
          ]}
        />

        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-line pt-4 text-sm text-ink-soft">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoading}
                className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-3 py-1.5 text-ink transition hover:border-marigold disabled:opacity-50"
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isLoading}
                className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-3 py-1.5 text-ink transition hover:border-marigold disabled:opacity-50"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function AttendanceLogPage() {
  return (
    <SchoolSessionGate eyebrow="Super Admin" title="Attendance Log">
      {({ schId, sessionId }) => <AttendanceLogContent schId={schId} sessionId={sessionId} />}
    </SchoolSessionGate>
  );
}

export default AttendanceLogPage;
