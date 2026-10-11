import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft, ChevronLeft, ChevronRight, Pencil, Search, UserSearch, X } from "lucide-react";
import { env } from "../../config/env";
import { useSelectedSchool } from "../../hooks/useSelectedSchool";
import { useSelectedSession } from "../../hooks/useSelectedSession";
import { schoolSettingService } from "../../services/schoolSetting.service";
import { ApiError } from "../../types/api.types";
import type { EnrolledStudentRow } from "../../types/studentList.types";
import type { SchClass } from "../../types/superadmin.types";

const inputClasses =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-marigold/40 disabled:opacity-60";
const labelClasses = "text-xs font-medium text-ink-soft";

const SAVED_KEY = "vidyahub:quick-student-filter";

/** The class/section picked last time, so reopening the popup lands on the same list. */
function readSaved(schId: string): { classId: string; sectionId: string } {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVED_KEY) ?? "null");
    if (parsed && parsed.schId === schId) {
      return { classId: String(parsed.classId ?? ""), sectionId: String(parsed.sectionId ?? "") };
    }
  } catch {
    /* storage unavailable or corrupt: start empty */
  }
  return { classId: "", sectionId: "" };
}

function writeSaved(schId: string, classId: string, sectionId: string) {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify({ schId, classId, sectionId }));
  } catch {
    /* ignore */
  }
}

function photoUrl(image?: string): string | null {
  return image ? `${env.apiBaseUrl}/uploads/studentImage/${encodeURIComponent(image)}` : null;
}

/** dob is an ISO string for new registrations but can be a long Date string on older edited records. */
function formatDob(value?: string): string {
  if (!value) return "—";
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [y, m, d] = value.slice(0, 10).split("-");
    return `${d}-${m}-${y}`;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-GB").replaceAll("/", "-");
}

const capitalize = (value?: string) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : "");

/** 0, null and "" all mean "no roll number assigned". */
const rollLabel = (roll: EnrolledStudentRow["rollNo"]) => (roll && Number(roll) !== 0 ? String(roll) : "");

function Avatar({ name, image, size }: { name: string; image?: string; size: "sm" | "lg" }) {
  const [failed, setFailed] = useState(false);
  const url = failed ? null : photoUrl(image);
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "?";
  const dim = size === "lg" ? "h-16 w-16 text-lg" : "h-9 w-9 text-xs";

  return url ? (
    <img src={url} alt="" onError={() => setFailed(true)} className={`${dim} shrink-0 rounded-full object-cover`} />
  ) : (
    <span className={`${dim} flex shrink-0 items-center justify-center rounded-full bg-chalkboard font-semibold text-chalk`}>
      {initials}
    </span>
  );
}

function Field({ label, value, href }: { label: string; value?: string | number | null; href?: string }) {
  const text = value === undefined || value === null || value === "" ? "" : String(value);
  return (
    <div className="min-w-0">
      <dt className="text-xs text-ink-soft">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-ink">
        {text ? (
          href ? (
            <a href={href} className="text-marigold-dark hover:underline">{text}</a>
          ) : (
            text
          )
        ) : (
          "—"
        )}
      </dd>
    </div>
  );
}

function ProfileGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-line p-4">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">{children}</dl>
    </section>
  );
}

function StudentProfile({ row, classLabel }: { row: EnrolledStudentRow; classLabel: string }) {
  const reg = row.studentId?.regno;
  const roll = rollLabel(row.rollNo);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 rounded-lg bg-chalk p-4">
        <Avatar name={reg?.sname ?? ""} image={reg?.Image} size="lg" />
        <div className="min-w-0">
          <h2 className="truncate font-display text-xl text-ink">{reg?.sname || "Unnamed student"}</h2>
          <p className="text-sm text-ink-soft">{classLabel}</p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
            <span className="rounded-full bg-white px-2 py-0.5 text-ink">Roll {roll || "—"}</span>
            <span className="rounded-full bg-white px-2 py-0.5 text-ink">Adm {row.studentId?.admno || "—"}</span>
            {row.house && <span className="rounded-full bg-white px-2 py-0.5 text-ink">{row.house} house</span>}
          </div>
        </div>
      </div>

      <ProfileGroup title="Personal">
        <Field label="Date of Birth" value={formatDob(reg?.dob) === "—" ? "" : formatDob(reg?.dob)} />
        <Field label="Age" value={reg?.age} />
        <Field label="Gender" value={capitalize(reg?.gender)} />
        <Field label="Category" value={reg?.category} />
        <Field label="Religion" value={reg?.religion} />
        <Field label="Nationality" value={reg?.nationality} />
        <Field label="Mother Tongue" value={reg?.mothertongue} />
        <Field label="Second Language" value={reg?.secLang} />
      </ProfileGroup>

      <ProfileGroup title="Parents / Guardian">
        <Field label="Father" value={reg?.fname} />
        <Field label="Mother" value={reg?.mname} />
        <Field label="Guardian" value={reg?.gname} />
      </ProfileGroup>

      <ProfileGroup title="Contact">
        <Field label="Mobile 1" value={reg?.mob1} href={reg?.mob1 ? `tel:${reg.mob1}` : undefined} />
        <Field label="Mobile 2" value={reg?.mob2} href={reg?.mob2 ? `tel:${reg.mob2}` : undefined} />
        <Field label="WhatsApp" value={reg?.whatAppno} href={reg?.whatAppno ? `tel:${reg.whatAppno}` : undefined} />
        <Field label="Email" value={reg?.email} href={reg?.email ? `mailto:${reg.email}` : undefined} />
      </ProfileGroup>

      <ProfileGroup title="Previous School">
        <Field label="School" value={reg?.lsch} />
        <Field label="Last Class" value={reg?.lclass} />
        <Field label="Percentage" value={reg?.lper} />
        <Field label="Board" value={reg?.lboard} />
      </ProfileGroup>

      <ProfileGroup title="IDs">
        <Field label="Registration No" value={reg?.regno} />
        <Field label="Admission No" value={row.studentId?.admno} />
        <Field label="Aadhaar" value={reg?.adharId} />
        <Field label="PEN" value={reg?.penno} />
      </ProfileGroup>
    </div>
  );
}

function QuickViewBody({ schId, sessionId, onClose }: { schId: string; sessionId: string; onClose: () => void }) {
  const navigate = useNavigate();

  const [schClasses, setSchClasses] = useState<SchClass[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [classesError, setClassesError] = useState<string | null>(null);

  const [classId, setClassId] = useState(() => readSaved(schId).classId);
  const [sectionId, setSectionId] = useState(() => readSaved(schId).sectionId);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    schoolSettingService
      .getSchClasses(schId)
      .then((res) => {
        if (!cancelled) setSchClasses(res.schClasses ?? []);
      })
      .catch((err) => {
        if (!cancelled) setClassesError(err instanceof ApiError ? err.message : "Could not load classes.");
      })
      .finally(() => {
        if (!cancelled) setClassesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [schId]);

  // A remembered class/section only counts if it still exists for this school.
  const activeClass = schClasses.find((c) => c.classID._id === classId);
  const sectionOptions = activeClass?.sectionID ?? [];
  const activeSection = sectionOptions.find((s) => s._id === sectionId);
  const fetchKey = activeClass && activeSection ? `${schId}|${sessionId}|${classId}|${sectionId}` : "";

  const [result, setResult] = useState<{ key: string; rows: EnrolledStudentRow[]; error: string | null } | null>(null);

  useEffect(() => {
    if (!fetchKey) return;
    let cancelled = false;
    schoolSettingService
      .getEnrolledStudentsOfClass({ schId, session: sessionId, classID: classId, sectionId })
      .then((res) => {
        if (!cancelled) setResult({ key: fetchKey, rows: res.data ?? [], error: null });
      })
      .catch((err) => {
        if (!cancelled) {
          setResult({
            key: fetchKey,
            rows: [],
            error: err instanceof ApiError ? err.message : "Could not load students.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [fetchKey, schId, sessionId, classId, sectionId]);

  const isLoadingStudents = Boolean(fetchKey) && result?.key !== fetchKey;
  const students = useMemo(() => (result?.key === fetchKey ? result.rows : []), [result, fetchKey]);
  const studentsError = result?.key === fetchKey ? result.error : null;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (r) =>
        (r.studentId?.regno?.sname ?? "").toLowerCase().includes(q) ||
        (r.studentId?.admno ?? "").toLowerCase().includes(q) ||
        (r.studentId?.regno?.fname ?? "").toLowerCase().includes(q) ||
        rollLabel(r.rollNo) === q,
    );
  }, [students, query]);

  const selected = students.find((r) => r._id === selectedId) ?? null;
  const selectedIndex = selected ? visible.findIndex((r) => r._id === selected._id) : -1;
  const classLabel = [activeClass?.classID.className, activeSection?.sectionName].filter(Boolean).join(" - ");

  function handleClassChange(value: string) {
    setClassId(value);
    setSectionId("");
    setSelectedId(null);
    setQuery("");
    writeSaved(schId, value, "");
  }

  function handleSectionChange(value: string) {
    setSectionId(value);
    setSelectedId(null);
    setQuery("");
    writeSaved(schId, classId, value);
  }

  function handleEdit() {
    onClose();
    navigate("/student-management/manage-update/student-update", { state: { classId, sectionId } });
  }

  // ---- Profile view ----
  if (selected) {
    return (
      <>
        <div className="flex items-center justify-between gap-2 border-b border-line px-5 py-3">
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink hover:text-marigold-dark"
          >
            <ArrowLeft size={15} /> Back to list
          </button>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Previous student"
              disabled={selectedIndex <= 0}
              onClick={() => setSelectedId(visible[selectedIndex - 1]._id)}
              className="rounded-md border border-line p-1.5 text-ink transition hover:bg-chalk disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-1 text-xs text-ink-soft">
              {selectedIndex + 1} / {visible.length}
            </span>
            <button
              type="button"
              aria-label="Next student"
              disabled={selectedIndex < 0 || selectedIndex >= visible.length - 1}
              onClick={() => setSelectedId(visible[selectedIndex + 1]._id)}
              className="rounded-md border border-line p-1.5 text-ink transition hover:bg-chalk disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <StudentProfile row={selected} classLabel={classLabel} />
        </div>
        <div className="flex justify-end border-t border-line px-5 py-3">
          <button
            type="button"
            onClick={handleEdit}
            className="inline-flex items-center gap-1.5 rounded-md bg-marigold px-4 py-2 text-sm font-medium text-chalkboard transition hover:bg-marigold-dark"
          >
            <Pencil size={14} /> Edit student
          </button>
        </div>
      </>
    );
  }

  // ---- List view ----
  return (
    <>
      <div className="space-y-3 border-b border-line px-5 py-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="qs-class" className={labelClasses}>Class</label>
            <select
              id="qs-class"
              value={activeClass ? classId : ""}
              disabled={classesLoading}
              onChange={(e) => handleClassChange(e.target.value)}
              className={inputClasses}
            >
              <option value="">{classesLoading ? "Loading…" : "Select class"}</option>
              {schClasses.map((c) => (
                <option key={c._id} value={c.classID._id}>{c.classID.className}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="qs-section" className={labelClasses}>Section</label>
            <select
              id="qs-section"
              value={activeSection ? sectionId : ""}
              disabled={!activeClass}
              onChange={(e) => handleSectionChange(e.target.value)}
              className={inputClasses}
            >
              <option value="">
                {!activeClass ? "Select class first" : sectionOptions.length === 0 ? "No sections" : "Select section"}
              </option>
              {sectionOptions.map((s) => (
                <option key={s._id} value={s._id}>{s.sectionName}</option>
              ))}
            </select>
          </div>
        </div>
        {fetchKey && (
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, roll no or admission no"
              aria-label="Search students"
              className={`${inputClasses} pl-9`}
            />
          </div>
        )}
        {classesError && (
          <p role="alert" className="flex items-center gap-1.5 text-xs text-red-600">
            <AlertCircle size={13} /> {classesError}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {!fetchKey ? (
          <p className="px-5 py-10 text-center text-sm text-ink-soft">
            Choose a class and section to see its students.
          </p>
        ) : isLoadingStudents ? (
          <p className="px-5 py-10 text-center text-sm text-ink-soft">Loading students…</p>
        ) : studentsError ? (
          <p role="alert" className="px-5 py-10 text-center text-sm text-red-600">{studentsError}</p>
        ) : visible.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-ink-soft">
            {students.length === 0 ? "No students enrolled in this class and section." : "No student matches your search."}
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {visible.map((r) => {
              const reg = r.studentId?.regno;
              const roll = rollLabel(r.rollNo);
              return (
                <li key={r._id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(r._id)}
                    className="flex w-full items-center gap-3 px-5 py-2.5 text-left transition hover:bg-chalk"
                  >
                    <span className="w-8 shrink-0 text-center text-xs font-medium text-ink-soft">{roll || "—"}</span>
                    <Avatar name={reg?.sname ?? ""} image={reg?.Image} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{reg?.sname || "Unnamed student"}</span>
                      <span className="block truncate text-xs text-ink-soft">
                        {[r.studentId?.admno && `Adm ${r.studentId.admno}`, reg?.fname && `S/o ${reg.fname}`]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <ChevronRight size={15} className="shrink-0 text-ink-soft" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {fetchKey && !isLoadingStudents && !studentsError && students.length > 0 && (
        <p className="border-t border-line px-5 py-2 text-xs text-ink-soft">
          {visible.length === students.length
            ? `${students.length} student${students.length === 1 ? "" : "s"}`
            : `${visible.length} of ${students.length} students`}
        </p>
      )}
    </>
  );
}

function QuickViewModal({ onClose }: { onClose: () => void }) {
  const { selectedSchool } = useSelectedSchool();
  const { selectedSession } = useSelectedSession();
  const schId = selectedSchool?.id ?? "";
  const sessionId = selectedSession?.id ?? "";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div className="print:hidden fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4" role="presentation">
      <div className="absolute inset-0 bg-chalkboard/60" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="qs-title"
        className="relative flex h-[92vh] w-full flex-col rounded-t-xl border border-line bg-white shadow-xl animate-rise motion-reduce:animate-none sm:h-[80vh] sm:max-w-2xl sm:rounded-lg"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-marigold/15 text-marigold-dark">
              <UserSearch size={16} />
            </span>
            <div className="leading-tight">
              <h2 id="qs-title" className="font-display text-lg text-ink">Student Profile</h2>
              {selectedSchool && (
                <p className="text-xs text-ink-soft">
                  {selectedSchool.name}
                  {selectedSession && ` · ${selectedSession.name}`}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-ink-soft transition hover:bg-chalk hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        {schId && sessionId ? (
          <QuickViewBody key={`${schId}:${sessionId}`} schId={schId} sessionId={sessionId} onClose={onClose} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <AlertCircle size={28} className="text-marigold-dark" />
            <p className="mt-3 font-display text-lg text-ink">
              {schId ? "No session selected" : "No school selected"}
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              Select a {schId ? "session" : "school"} first, then open this again.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Navbar button that opens a popup to look up any enrolled student:
 * pick class + section, tap a student, see their profile. Works for superAdmin
 * and school admin (both already have a selected school and session).
 */
export function StudentQuickView() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Student profile"
        title="Student profile"
        aria-haspopup="dialog"
        className="relative flex h-9 w-9 items-center justify-center rounded-md border border-line bg-white text-ink transition hover:bg-chalk"
      >
        <UserSearch size={17} />
      </button>
      {isOpen && createPortal(<QuickViewModal onClose={() => setIsOpen(false)} />, document.body)}
    </>
  );
}
