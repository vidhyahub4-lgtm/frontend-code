import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { GraduationCap } from "lucide-react";
import { SectionCard } from "../../components/common/SectionCard";
import { EntityTable } from "../../components/common/EntityTable";
import { useTeachers, useSchoolClasses } from "../../hooks/useTeacherData";
import { teacherService } from "../../services/teacher.service";
import { ApiError } from "../../types/api.types";
import { TeacherPageShell } from "./TeacherPageShell";
import {
  classLabel,
  inputClasses,
  labelClasses,
  primaryButtonClasses,
  refId,
  sectionLabel,
} from "./teacherUtils";

interface ClassTeacherRow {
  key: string;
  teacherName: string;
  email: string;
  phone: string;
  classId: string;
  className: string;
  sectionName: string;
}

interface ClassTeacherContentProps {
  schId: string;
  sessionId: string;
}

function ClassTeacherContent({ schId, sessionId }: ClassTeacherContentProps) {
  const teachersState = useTeachers(schId, sessionId);
  const classesState = useSchoolClasses(schId);

  const [rows, setRows] = useState<ClassTeacherRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState("");

  const [teacherId, setTeacherId] = useState("");
  const [classDocId, setClassDocId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchRows = useCallback(
    () =>
      teacherService
        .getClassTeachers(schId, sessionId)
        .then((res) => {
          // One row per (teacher, class-section) so a teacher with several classes shows each.
          setRows(
            (res.data ?? []).flatMap((t) =>
              (t.classTeacherOf ?? []).map((c) => ({
                key: `${t._id}:${refId(c.classID)}:${refId(c.sectionID)}`,
                teacherName: t.name,
                email: t.email,
                phone: t.phone ?? "",
                classId: refId(c.classID),
                className: classLabel(c.classID),
                sectionName: sectionLabel(c.sectionID),
              }))
            )
          );
          setListError(null);
        })
        .catch((err) =>
          setListError(err instanceof ApiError ? err.message : "Could not load class teachers.")
        )
        .finally(() => setListLoading(false)),
    [schId, sessionId]
  );

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const selectedClass = classesState.schClasses.find((c) => c._id === classDocId) ?? null;
  const sections = selectedClass?.sectionID ?? [];
  const classId = selectedClass?.classID._id ?? "";

  const visibleRows = useMemo(
    () => (classFilter ? rows.filter((r) => r.classId === classFilter) : rows),
    [rows, classFilter]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!teacherId || !classId || !sectionId) {
      setError("Select a teacher, class and section.");
      return;
    }

    setIsSaving(true);
    try {
      await teacherService.makeClassTeacher(teacherId, {
        schId,
        session: sessionId,
        classID: classId,
        sectionID: sectionId,
      });
      setSuccess("Class teacher assigned.");
      setSectionId("");
      setListLoading(true);
      fetchRows();
      teachersState.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <SectionCard title="Make Class Teacher" icon={GraduationCap}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <label htmlFor="ct-teacher" className={labelClasses}>
                Teacher
              </label>
              <select
                id="ct-teacher"
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
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
              <label htmlFor="ct-class" className={labelClasses}>
                Class
              </label>
              <select
                id="ct-class"
                value={classDocId}
                onChange={(e) => {
                  setClassDocId(e.target.value);
                  setSectionId("");
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
              <label htmlFor="ct-section" className={labelClasses}>
                Section
              </label>
              <select
                id="ct-section"
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                disabled={!classDocId || sections.length === 0}
                className={inputClasses}
              >
                <option value="">{!classDocId ? "Select a class first" : "Select a section"}</option>
                {sections.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.sectionName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(teachersState.error || classesState.error) && (
            <p role="alert" className="rounded-md bg-red-50 px-3.5 py-2 text-sm text-red-600">
              {teachersState.error ?? classesState.error}
            </p>
          )}
          {error && (
            <p role="alert" className="rounded-md bg-red-50 px-3.5 py-2 text-sm text-red-600">
              {error}
            </p>
          )}
          {success && (
            <p role="status" className="rounded-md bg-green-50 px-3.5 py-2 text-sm text-green-700">
              {success}
            </p>
          )}

          <button type="submit" disabled={isSaving} className={primaryButtonClasses}>
            {isSaving ? "Saving…" : "Make Class Teacher"}
          </button>
        </form>
      </SectionCard>

      <SectionCard title="Class Teachers" icon={GraduationCap}>
        <div className="mb-4 space-y-1 sm:max-w-xs">
          <label htmlFor="ct-filter" className={labelClasses}>
            Filter by class
          </label>
          <select
            id="ct-filter"
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className={inputClasses}
          >
            <option value="">All classes</option>
            {classesState.schClasses.map((c) => (
              <option key={c._id} value={c.classID._id}>
                {c.classID.className} ({c.classID.classInWord})
              </option>
            ))}
          </select>
        </div>

        <EntityTable<ClassTeacherRow>
          items={visibleRows}
          isLoading={listLoading}
          error={listError}
          emptyLabel="No class teachers assigned yet."
          getRowKey={(r) => r.key}
          columns={[
            { header: "Class", render: (r) => r.className },
            { header: "Section", render: (r) => r.sectionName },
            { header: "Class Teacher", render: (r) => <span className="font-medium">{r.teacherName}</span> },
            { header: "Email", render: (r) => r.email },
            { header: "Phone", render: (r) => r.phone || "—" },
          ]}
        />
      </SectionCard>
    </div>
  );
}

function ClassTeacherPage() {
  return (
    <TeacherPageShell title="Class Teacher">
      {({ school, session }) => <ClassTeacherContent schId={school.id} sessionId={session.id} />}
    </TeacherPageShell>
  );
}

export default ClassTeacherPage;
