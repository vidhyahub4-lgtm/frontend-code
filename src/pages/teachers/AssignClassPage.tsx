import { useState, type FormEvent } from "react";
import { BookOpen } from "lucide-react";
import { SectionCard } from "../../components/common/SectionCard";
import { EntityTable } from "../../components/common/EntityTable";
import { useTeachers, useSchoolClasses, useSchoolSubjects } from "../../hooks/useTeacherData";
import { teacherService } from "../../services/teacher.service";
import { ApiError } from "../../types/api.types";
import type { AssignedClass } from "../../types/teacher.types";
import { TeacherPageShell } from "./TeacherPageShell";
import {
  classLabel,
  inputClasses,
  labelClasses,
  primaryButtonClasses,
  refId,
  sectionLabel,
} from "./teacherUtils";

interface AssignClassFormProps {
  schId: string;
  sessionId: string;
}

function AssignClassForm({ schId, sessionId }: AssignClassFormProps) {
  const teachersState = useTeachers(schId, sessionId);
  const classesState = useSchoolClasses(schId);
  const subjectsState = useSchoolSubjects(schId, sessionId);

  const [teacherId, setTeacherId] = useState("");
  const [classDocId, setClassDocId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [timing, setTiming] = useState("");
  const [pickedCodes, setPickedCodes] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const selectedTeacher = teachersState.teachers.find((t) => t._id === teacherId) ?? null;
  const selectedClass = classesState.schClasses.find((c) => c._id === classDocId) ?? null;
  const sections = selectedClass?.sectionID ?? [];
  const classId = selectedClass?.classID._id ?? "";

  // What this teacher already has for the chosen class + section.
  const existing =
    selectedTeacher?.assignedClasses.find(
      (a) => refId(a.classID) === classId && refId(a.sectionID) === sectionId
    ) ?? null;
  const existingCodes = new Set(
    (existing?.subjects ?? []).map((s) => (s.subCode ?? "").toUpperCase())
  );

  function clearMessages() {
    setError(null);
    setSuccess(null);
    setWarning(null);
  }

  function togglePicked(code: string) {
    setPickedCodes((current) =>
      current.includes(code) ? current.filter((c) => c !== code) : [...current, code]
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessages();

    if (!teacherId || !classId || !sectionId) {
      setError("Select a teacher, class and section.");
      return;
    }
    if (!subjectsState.subjectDocId) {
      setError("No subjects exist for this session yet. Add them in Subject Setup first.");
      return;
    }

    const newSubjects = subjectsState.subjects.filter(
      (s) =>
        pickedCodes.includes(s.subCode.toUpperCase()) && !existingCodes.has(s.subCode.toUpperCase())
    );
    if (newSubjects.length === 0 && !(existing && timing.trim())) {
      setError("Select at least one new subject.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await teacherService.assignClass(teacherId, {
        schId,
        classes: [
          {
            classID: classId,
            sectionID: sectionId,
            ...(timing.trim() ? { timing: timing.trim() } : {}),
            subjects: newSubjects.map((s) => ({
              subId: subjectsState.subjectDocId as string,
              subCode: s.subCode,
              subName: s.subjectName,
            })),
          },
        ],
      });

      // The backend silently skips subjects for a class-section that already has
      // subjects, so check what was really saved instead of trusting the 200.
      const saved = res.data.assignedClasses.find(
        (a: AssignedClass) => refId(a.classID) === classId && refId(a.sectionID) === sectionId
      );
      const savedCodes = new Set((saved?.subjects ?? []).map((s) => (s.subCode ?? "").toUpperCase()));
      const missing = newSubjects.filter((s) => !savedCodes.has(s.subCode.toUpperCase()));

      if (missing.length > 0) {
        setWarning(
          `Not saved by the server: ${missing.map((s) => s.subCode).join(", ")}. ` +
            "The backend skips extra subjects for a class-section that already has subjects."
        );
      } else {
        setSuccess("Class assigned to teacher.");
      }
      setPickedCodes([]);
      setTiming("");
      teachersState.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <SectionCard title="Assign Class & Subjects" icon={BookOpen}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <label htmlFor="ac-teacher" className={labelClasses}>
                Teacher
              </label>
              <select
                id="ac-teacher"
                value={teacherId}
                onChange={(e) => {
                  setTeacherId(e.target.value);
                  setPickedCodes([]);
                  clearMessages();
                }}
                disabled={teachersState.isLoading}
                className={inputClasses}
              >
                <option value="">
                  {teachersState.isLoading ? "Loading teachers…" : "Select a teacher"}
                </option>
                {teachersState.teachers.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name} ({t.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="ac-class" className={labelClasses}>
                Class
              </label>
              <select
                id="ac-class"
                value={classDocId}
                onChange={(e) => {
                  setClassDocId(e.target.value);
                  setSectionId("");
                  setPickedCodes([]);
                  clearMessages();
                }}
                disabled={classesState.isLoading}
                className={inputClasses}
              >
                <option value="">
                  {classesState.isLoading ? "Loading classes…" : "Select a class"}
                </option>
                {classesState.schClasses.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.classID.className} ({c.classID.classInWord})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="ac-section" className={labelClasses}>
                Section
              </label>
              <select
                id="ac-section"
                value={sectionId}
                onChange={(e) => {
                  setSectionId(e.target.value);
                  setPickedCodes([]);
                  clearMessages();
                }}
                disabled={!classDocId || sections.length === 0}
                className={inputClasses}
              >
                <option value="">
                  {!classDocId ? "Select a class first" : "Select a section"}
                </option>
                {sections.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.sectionName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <span className={labelClasses}>Subjects</span>
            {subjectsState.isLoading ? (
              <p className="text-sm text-ink-soft">Loading subjects…</p>
            ) : subjectsState.error ? (
              <p className="text-sm text-red-600">{subjectsState.error}</p>
            ) : subjectsState.subjects.length === 0 ? (
              <p className="text-sm text-ink-soft">
                No subjects for this session yet. Add them in Subject Setup first.
              </p>
            ) : (
              <div className="grid gap-2 rounded-md border border-line p-3 sm:grid-cols-2 lg:grid-cols-3">
                {subjectsState.subjects.map((s) => {
                  const code = s.subCode.toUpperCase();
                  const already = existingCodes.has(code);
                  return (
                    <label key={code} className="flex items-center gap-2 text-sm text-ink">
                      <input
                        type="checkbox"
                        checked={already || pickedCodes.includes(code)}
                        disabled={already}
                        onChange={() => togglePicked(code)}
                      />
                      <span>
                        {s.subjectName} <span className="text-ink-soft">({s.subCode})</span>
                        {already && <span className="ml-1 text-xs text-ink-soft">· already assigned</span>}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
            <p className="text-xs text-ink-soft">
              Tip: pick all subjects of a class-section in one go.
            </p>
          </div>

          <div className="space-y-1 sm:max-w-xs">
            <label htmlFor="ac-timing" className={labelClasses}>
              Timing (optional)
            </label>
            <input
              id="ac-timing"
              value={timing}
              onChange={(e) => setTiming(e.target.value)}
              placeholder="e.g. 9:00 AM - 9:45 AM"
              className={inputClasses}
            />
          </div>

          {teachersState.error && (
            <p role="alert" className="rounded-md bg-red-50 px-3.5 py-2 text-sm text-red-600">
              {teachersState.error}
            </p>
          )}
          {classesState.error && (
            <p role="alert" className="rounded-md bg-red-50 px-3.5 py-2 text-sm text-red-600">
              {classesState.error}
            </p>
          )}
          {error && (
            <p role="alert" className="rounded-md bg-red-50 px-3.5 py-2 text-sm text-red-600">
              {error}
            </p>
          )}
          {warning && (
            <p role="status" className="rounded-md bg-amber-50 px-3.5 py-2 text-sm text-amber-800">
              {warning}
            </p>
          )}
          {success && (
            <p role="status" className="rounded-md bg-green-50 px-3.5 py-2 text-sm text-green-700">
              {success}
            </p>
          )}

          <button type="submit" disabled={isSaving} className={primaryButtonClasses}>
            {isSaving ? "Saving…" : "Assign"}
          </button>
        </form>
      </SectionCard>

      {selectedTeacher && (
        <SectionCard title={`Current assignments · ${selectedTeacher.name}`} icon={BookOpen}>
          <EntityTable<AssignedClass>
            items={selectedTeacher.assignedClasses}
            isLoading={teachersState.isLoading}
            error={null}
            emptyLabel="No classes assigned to this teacher yet."
            getRowKey={(a) => `${refId(a.classID)}:${refId(a.sectionID)}`}
            columns={[
              { header: "Class", render: (a) => classLabel(a.classID) },
              { header: "Section", render: (a) => sectionLabel(a.sectionID) },
              {
                header: "Subjects",
                render: (a) =>
                  a.subjects.length === 0 ? (
                    "—"
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {a.subjects.map((s) => (
                        <span
                          key={s.subCode}
                          className="rounded-full bg-marigold/15 px-2.5 py-0.5 text-xs font-medium text-ink"
                        >
                          {s.subName ?? s.subCode}
                        </span>
                      ))}
                    </div>
                  ),
              },
              { header: "Timing", render: (a) => a.timing || "—" },
            ]}
          />
        </SectionCard>
      )}
    </div>
  );
}

function AssignClassPage() {
  return (
    <TeacherPageShell title="Assign Class & Subjects">
      {({ school, session }) => <AssignClassForm schId={school.id} sessionId={session.id} />}
    </TeacherPageShell>
  );
}

export default AssignClassPage;
