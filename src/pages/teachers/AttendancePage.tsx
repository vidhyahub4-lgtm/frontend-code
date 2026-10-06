import { useEffect, useState } from "react";
import { AlertCircle, ClipboardCheck, School } from "lucide-react";
import { SectionCard } from "../../components/common/SectionCard";
import { EntityTable } from "../../components/common/EntityTable";
import { useSelectedSchool } from "../../hooks/useSelectedSchool";
import { useSelectedSession } from "../../hooks/useSelectedSession";
import { teacherService } from "../../services/teacher.service";
import { ApiError } from "../../types/api.types";
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

function AttendanceContent({ schId, sessionId }: { schId: string; sessionId: string }) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(true);
  const [teachersError, setTeachersError] = useState<string | null>(null);

  const [teacherId, setTeacherId] = useState("");
  const [students, setStudents] = useState<ClassStudentRow[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  function handleTeacherChange(value: string) {
    setTeacherId(value);
    setStudents(null); // the old list belongs to the previous teacher's class
    setError(null);
  }

  async function handleShow() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await teacherService.getClassStudentList(teacherId);
      setStudents(res.data ?? []);
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
            {students && <p className="text-xs text-ink-soft">{students.length} student(s)</p>}
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
