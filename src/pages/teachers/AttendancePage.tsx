import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, ClipboardCheck, School } from "lucide-react";
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

const todayISO = () => new Date().toISOString().slice(0, 10);

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
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

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
    setError(null);
    setSaveError(null);
    setSaveMessage(null);
  }

  async function handleDateChange(value: string) {
    setDate(value);
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
      });
      setSaveMessage(`Attendance saved for ${date}.`);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Could not save attendance.");
    } finally {
      setIsSaving(false);
    }
  }

  const presentCount = (students ?? []).filter((r) => (marks[r._id] ?? "present") === "present").length;

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
                </div>
                <p className="text-xs text-ink-soft">
                  {students.length} student(s) · {presentCount} present · {students.length - presentCount} not present
                </p>
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
