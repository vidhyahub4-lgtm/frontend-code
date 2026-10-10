import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, ClipboardCheck, MessageSquare, Percent, School, Send, UserCheck, UserX, Users, X } from "lucide-react";
import { SectionCard } from "../../components/common/SectionCard";
import { EntityTable } from "../../components/common/EntityTable";
import { useSelectedSchool } from "../../hooks/useSelectedSchool";
import { useSelectedSession } from "../../hooks/useSelectedSession";
import { attendanceService } from "../../services/attendance.service";
import { teacherService } from "../../services/teacher.service";
import { ApiError } from "../../types/api.types";
import type { AttendanceStatus } from "../../types/attendance.types";
import type { Teacher } from "../../types/teacher.types";
import type { ClassStudentRow } from "../../types/studentList.types";

const inputClasses =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-marigold/40 disabled:opacity-60";
const labelClasses = "text-sm font-medium text-ink-soft";

/** "Class 5 - A" for the teacher's class-teacher assignment (list API populates these). */
function classLabel(teacher: Teacher): string {
  // The student-list API only looks at the first class-teacher assignment.
  const first = teacher.classTeacherOf[0];
  if (!first) return "";
  const cls = typeof first.classID === "string" ? "" : (first.classID?.className ?? "");
  const sec = typeof first.sectionID === "string" ? "" : (first.sectionID?.sectionName ?? "");
  return [cls, sec].filter(Boolean).join(" - ");
}

/** Today as yyyy-mm-dd in the user's local time (toISOString would give the UTC date). */
const todayISO = () => new Date().toLocaleDateString("en-CA");

/** `_id` of a populated reference (or the id itself). */
function refId(ref: { _id: string } | string | null | undefined): string {
  return typeof ref === "string" ? ref : (ref?._id ?? "");
}

/** Class and section ids of the teacher's (first) class-teacher assignment. */
function teacherClassIds(teacher: Teacher | undefined): { classId: string; sectionId: string } {
  const first = teacher?.classTeacherOf[0];
  return { classId: refId(first?.classID), sectionId: refId(first?.sectionID) };
}

/** On = present. Anything else (absent, late, leave) shows as off with its own label. */
function AttendanceToggle({
  status,
  name,
  onToggle,
}: {
  status: AttendanceStatus;
  name: string;
  onToggle: () => void;
}) {
  const on = status === "present";
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={`Attendance for ${name}`}
        onClick={onToggle}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-marigold/40 ${
          on ? "bg-emerald-500" : "bg-red-400"
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            on ? "translate-x-5" : ""
          }`}
        />
      </button>
      <span className={`w-14 text-xs font-medium ${on ? "text-emerald-700" : "text-red-600"}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    </div>
  );
}

/** Dashboard-style summary: counts, attendance rate and a present/absent bar. */
function AttendanceSummary({ total, present }: { total: number; present: number }) {
  const absent = total - present;
  const rate = total === 0 ? 0 : Math.round((present / total) * 100);
  const cards = [
    { label: "Total Students", value: total, icon: Users, tone: "bg-chalk text-ink" },
    { label: "Present", value: present, icon: UserCheck, tone: "bg-emerald-50 text-emerald-700" },
    { label: "Absent", value: absent, icon: UserX, tone: "bg-red-50 text-red-600" },
    { label: "Attendance", value: `${rate}%`, icon: Percent, tone: "bg-marigold/15 text-marigold-dark" },
  ];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="flex items-center gap-3 rounded-lg border border-line bg-white px-4 py-3 shadow-sm">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tone}`}>
              <Icon size={18} />
            </span>
            <div>
              <p className="font-display text-xl leading-none text-ink">{value}</p>
              <p className="mt-1 text-xs text-ink-soft">{label}</p>
            </div>
          </div>
        ))}
      </div>
      <div
        className="flex h-2 overflow-hidden rounded-full bg-red-200"
        role="img"
        aria-label={`${present} of ${total} students present`}
      >
        <div className="bg-emerald-500 transition-all duration-300" style={{ width: `${rate}%` }} />
      </div>
    </div>
  );
}

const SMS_TEMPLATES = {
  absent: "Dear Parent, {student} was absent on {date}. Please contact the school if needed.",
  present: "Dear Parent, {student} was present at school on {date}.",
  custom: "",
} as const;
type SmsTemplate = keyof typeof SMS_TEMPLATES;

/** UI only for now: composes a message for the selected students but does not send anything yet. */
function SmsDialog({
  recipients,
  date,
  onClose,
}: {
  recipients: { id: string; name: string; mobile: string }[];
  date: string;
  onClose: () => void;
}) {
  const [template, setTemplate] = useState<SmsTemplate>("absent");
  const [text, setText] = useState<string>(SMS_TEMPLATES.absent);
  const [notice, setNotice] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const withMobile = recipients.filter((r) => r.mobile);
  const first = recipients[0];
  const preview = text.replace(/\{student\}/g, first?.name ?? "Student").replace(/\{date\}/g, date);
  const parts = Math.max(1, Math.ceil(preview.length / 160));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-chalkboard/50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="sms-title" className="w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 id="sms-title" className="flex items-center gap-2 font-display text-lg text-ink">
            <MessageSquare size={18} className="text-marigold-dark" /> Send SMS
          </h2>
          <button type="button" aria-label="Close" onClick={onClose} className="text-ink-soft hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div>
            <p className={labelClasses}>
              Recipients ({recipients.length})
              {withMobile.length < recipients.length && (
                <span className="ml-2 text-xs font-normal text-amber-700">
                  {recipients.length - withMobile.length} without mobile no.
                </span>
              )}
            </p>
            <div className="mt-1.5 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
              {recipients.map((r) => (
                <span
                  key={r.id}
                  className={`rounded-full border px-2.5 py-0.5 text-xs ${
                    r.mobile ? "border-line bg-paper text-ink" : "border-amber-300 bg-amber-50 text-amber-800"
                  }`}
                >
                  {r.name}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="sms-template" className={labelClasses}>Template</label>
            <select
              id="sms-template"
              value={template}
              onChange={(e) => {
                const next = e.target.value as SmsTemplate;
                setTemplate(next);
                setText(SMS_TEMPLATES[next]);
                setNotice(false);
              }}
              className={inputClasses}
            >
              <option value="absent">Absent alert</option>
              <option value="present">Present confirmation</option>
              <option value="custom">Custom message</option>
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="sms-text" className={labelClasses}>Message</label>
            <textarea
              id="sms-text"
              rows={4}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setNotice(false);
              }}
              placeholder="Type your message. Use {student} and {date} to personalise."
              className={inputClasses}
            />
            <p className="text-xs text-ink-soft">
              {preview.length} characters · {parts} SMS · {"{student}"} and {"{date}"} are filled in for each student
            </p>
          </div>

          {preview && (
            <div className="rounded-md bg-paper px-3 py-2 text-sm text-ink">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-soft">Preview</p>
              {preview}
            </div>
          )}

          {notice && (
            <p role="status" className="flex items-center gap-1.5 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <AlertCircle size={14} /> SMS sending is not connected yet. This is a preview only.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-line bg-paper px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-md border border-line bg-white px-4 py-2 text-sm text-ink hover:bg-chalk">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => setNotice(true)}
            disabled={!text.trim() || withMobile.length === 0}
            className="inline-flex items-center gap-1.5 rounded-md bg-marigold px-4 py-2 text-sm font-medium text-ink hover:bg-marigold-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={14} /> Send to {withMobile.length}
          </button>
        </div>
      </div>
    </div>
  );
}

function AttendanceContent({ schId, sessionId }: { schId: string; sessionId: string }) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(true);
  const [teachersError, setTeachersError] = useState<string | null>(null);

  const [teacherId, setTeacherId] = useState("");
  const [students, setStudents] = useState<ClassStudentRow[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState(todayISO());
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [smsSelected, setSmsSelected] = useState<Set<string>>(new Set());
  const [smsOpen, setSmsOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    let cancelled = false;
    teacherService
      .getTeachers(schId, sessionId)
      .then((res) => {
        // Only class teachers have a class whose students can be listed.
        if (!cancelled) setTeachers((res.data ?? []).filter((t) => t.classTeacherOf.length > 0));
      })
      .catch((err) => {
        if (!cancelled)
          setTeachersError(err instanceof ApiError ? err.message : "Could not load teachers.");
      })
      .finally(() => {
        if (!cancelled) setTeachersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [schId, sessionId]);

  // Changes to a past date are recorded in the backend audit log (who, when, what).
  const isPastDate = Boolean(date) && date < todayISO();
  const selectedTeacher = teachers.find((t) => t._id === teacherId);
  const { classId, sectionId } = teacherClassIds(selectedTeacher);

  /** Everyone starts as present; anything already saved for that date is laid on top. */
  async function buildMarks(list: ClassStudentRow[], day: string): Promise<Record<string, AttendanceStatus>> {
    const result: Record<string, AttendanceStatus> = Object.fromEntries(list.map((r) => [r._id, "present"]));
    try {
      const saved = await attendanceService.getAttendance({
        schId,
        session: sessionId,
        class: classId,
        section: sectionId,
        date: day,
      });
      for (const record of saved.data ?? []) {
        const id = refId(record.student);
        if (id in result) result[id] = record.status;
      }
    } catch {
      // No saved attendance (or it could not be read): keep the defaults.
    }
    return result;
  }

  function handleTeacherChange(value: string) {
    setTeacherId(value);
    setStudents(null); // the old list belongs to the previous teacher's class
    setSmsSelected(new Set());
    setError(null);
    setSaveError(null);
    setSaveMessage(null);
  }

  async function handleDateChange(value: string) {
    setDate(value);
    setReason("");
    setSaveError(null);
    setSaveMessage(null);
    if (students && value) setMarks(await buildMarks(students, value));
  }

  function toggleMark(id: string) {
    setMarks((prev) => ({ ...prev, [id]: prev[id] === "present" ? "absent" : "present" }));
    setSaveMessage(null);
  }

  function markAll(status: AttendanceStatus) {
    setMarks(Object.fromEntries((students ?? []).map((r) => [r._id, status])));
    setSaveMessage(null);
  }

  async function handleSave() {
    if (!students) return;
    setIsSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    try {
      await attendanceService.markAttendance({
        schId,
        session: sessionId,
        class: classId,
        section: sectionId,
        date,
        teacherId,
        records: students.map((r) => ({ student: r._id, status: marks[r._id] ?? "present" })),
        ...(isPastDate && reason.trim() ? { reason: reason.trim() } : {}),
      });
      setSaveMessage(`Attendance saved for ${date}.${isPastDate ? " This past-date change has been logged." : ""}`);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Could not save attendance.");
    } finally {
      setIsSaving(false);
    }
  }

  const presentCount = (students ?? []).filter((r) => (marks[r._id] ?? "present") === "present").length;
  const absentCount = (students ?? []).length - presentCount;

  function selectByStatus(status: "present" | "absent" | "all") {
    setSmsSelected(
      new Set(
        (students ?? [])
          .filter((r) => status === "all" || ((marks[r._id] ?? "present") === "present") === (status === "present"))
          .map((r) => r._id)
      )
    );
  }
  function toggleSms(id: string) {
    setSmsSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  const smsRecipients = useMemo(
    () =>
      (students ?? [])
        .filter((r) => smsSelected.has(r._id))
        .map((r) => ({ id: r._id, name: r.studentId?.regno?.sname || "Student", mobile: r.studentId?.regno?.mob1 || "" })),
    [students, smsSelected]
  );

  async function handleShow() {
    setIsLoading(true);
    setError(null);
    setSaveError(null);
    setSaveMessage(null);
    try {
      const res = await teacherService.getClassStudentList(teacherId);
      const list = res.data ?? [];
      setMarks(await buildMarks(list, date));
      setStudents(list);
      setSmsSelected(new Set());
    } catch (err) {
      setStudents(null);
      setError(err instanceof ApiError ? err.message : "Could not load the student list.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SectionCard title="Class Student List" icon={ClipboardCheck}>
      <div className="space-y-4">
        {teachersError && (
          <p className="flex items-center gap-1.5 text-sm text-red-700">
            <AlertCircle size={14} /> {teachersError}
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-3 sm:items-end">
          <div className="space-y-1 sm:col-span-2">
            <label htmlFor="att-teacher" className={labelClasses}>Class Teacher</label>
            <select
              id="att-teacher"
              value={teacherId}
              onChange={(e) => handleTeacherChange(e.target.value)}
              disabled={teachersLoading}
              className={inputClasses}
            >
              <option value="">
                {teachersLoading
                  ? "Loading teachers…"
                  : teachers.length === 0
                    ? "No class teachers assigned yet"
                    : "Select a class teacher"}
              </option>
              {teachers.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name} — {classLabel(t)}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleShow}
            disabled={!teacherId || isLoading}
            className="rounded-md bg-marigold px-4 py-2 text-sm font-medium text-ink hover:bg-marigold-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Loading…" : "Show Students"}
          </button>
        </div>

        {(students !== null || isLoading || error) && (
          <>
            {students && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1">
                    <label htmlFor="att-date" className={labelClasses}>Date</label>
                    <input
                      id="att-date"
                      type="date"
                      value={date}
                      max={todayISO()}
                      onChange={(e) => handleDateChange(e.target.value)}
                      className={inputClasses}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => markAll("present")}
                    className="rounded-md border border-line bg-white px-3 py-2 text-sm text-ink hover:bg-paper"
                  >
                    All Present
                  </button>
                  <button
                    type="button"
                    onClick={() => markAll("absent")}
                    className="rounded-md border border-line bg-white px-3 py-2 text-sm text-ink hover:bg-paper"
                  >
                    All Absent
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving || students.length === 0 || !date || !classId || !sectionId}
                    className="rounded-md bg-marigold px-4 py-2 text-sm font-medium text-ink hover:bg-marigold-dark disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSaving ? "Saving…" : "Save Attendance"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSmsOpen(true)}
                    disabled={smsSelected.size === 0}
                    title={smsSelected.size === 0 ? "Select students for SMS first" : undefined}
                    className="inline-flex items-center gap-1.5 rounded-md border border-marigold bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-marigold/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <MessageSquare size={14} /> Send SMS{smsSelected.size > 0 ? ` (${smsSelected.size})` : ""}
                  </button>
                </div>
                {isPastDate && (
                  <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 px-3.5 py-3 text-sm text-amber-900">
                    <p className="flex items-center gap-1.5 font-medium">
                      <AlertCircle size={14} /> You are editing a past date ({date}).
                    </p>
                    <p className="text-xs">
                      Any change will be recorded in the attendance log with your name, the student and the time.
                    </p>
                    <div className="space-y-1">
                      <label htmlFor="att-reason" className="text-xs font-medium">Reason (optional)</label>
                      <input
                        id="att-reason"
                        type="text"
                        maxLength={300}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="e.g. Marked late by mistake"
                        className={inputClasses}
                      />
                    </div>
                  </div>
                )}
                <AttendanceSummary total={students.length} present={presentCount} />
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-ink-soft">Select for SMS:</span>
                  <button type="button" onClick={() => selectByStatus("absent")} className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-100">
                    Absent ({absentCount})
                  </button>
                  <button type="button" onClick={() => selectByStatus("present")} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100">
                    Present ({presentCount})
                  </button>
                  <button type="button" onClick={() => selectByStatus("all")} className="rounded-full border border-line bg-white px-3 py-1 text-xs font-medium text-ink hover:bg-paper">
                    All ({students.length})
                  </button>
                  {smsSelected.size > 0 && (
                    <button type="button" onClick={() => setSmsSelected(new Set())} className="text-xs font-medium text-marigold-dark hover:underline">
                      Clear ({smsSelected.size} selected)
                    </button>
                  )}
                </div>
                {saveError && (
                  <p className="flex items-center gap-1.5 text-sm text-red-700">
                    <AlertCircle size={14} /> {saveError}
                  </p>
                )}
                {saveMessage && (
                  <p className="flex items-center gap-1.5 text-sm text-emerald-700">
                    <CheckCircle2 size={14} /> {saveMessage}
                  </p>
                )}
              </div>
            )}
            <EntityTable
              items={students ?? []}
              isLoading={isLoading}
              error={error}
              emptyLabel="No students found for this class."
              getRowKey={(r) => r._id}
              columns={[
                {
                  header: "SMS",
                  render: (r) => (
                    <input
                      type="checkbox"
                      aria-label={`Select ${r.studentId?.regno?.sname ?? "student"} for SMS`}
                      checked={smsSelected.has(r._id)}
                      onChange={() => toggleSms(r._id)}
                    />
                  ),
                },
                { header: "Roll", render: (r) => r.rollNo || "—" },
                { header: "Adm No", render: (r) => r.studentId?.admno || "—" },
                { header: "Student Name", render: (r) => r.studentId?.regno?.sname || "—" },
                { header: "Father's Name", render: (r) => r.studentId?.regno?.fname || "—" },
                { header: "Gender", render: (r) => r.studentId?.regno?.gender || "—" },
                { header: "Mobile", render: (r) => r.studentId?.regno?.mob1 || "—" },
                {
                  header: "Attendance",
                  render: (r) => (
                    <AttendanceToggle
                      status={marks[r._id] ?? "present"}
                      name={r.studentId?.regno?.sname ?? "student"}
                      onToggle={() => toggleMark(r._id)}
                    />
                  ),
                },
              ]}
            />
          </>
        )}
      </div>
      {smsOpen && <SmsDialog recipients={smsRecipients} date={date} onClose={() => setSmsOpen(false)} />}
    </SectionCard>
  );
}

function AttendancePage() {
  const { selectedSchool } = useSelectedSchool();
  const { selectedSession } = useSelectedSession();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-marigold-dark">School Setting · Teachers Setting</p>
        <h1 className="mt-1 font-display text-2xl text-ink">Attendance</h1>
        {selectedSchool && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
            <School size={14} className="text-marigold-dark" />
            {selectedSchool.name}
            {selectedSession && ` · ${selectedSession.name}`}
          </p>
        )}
      </div>

      {selectedSchool && selectedSession ? (
        <AttendanceContent
          key={`${selectedSchool.id}:${selectedSession.id}`}
          schId={selectedSchool.id}
          sessionId={selectedSession.id}
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

export default AttendancePage;
