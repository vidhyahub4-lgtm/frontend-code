import { useEffect, useState } from "react";
import { AlertCircle, School, Users } from "lucide-react";
import { SectionCard } from "../../components/common/SectionCard";
import { EntityTable } from "../../components/common/EntityTable";
import { env } from "../../config/env";
import { useSelectedSchool } from "../../hooks/useSelectedSchool";
import { useSelectedSession } from "../../hooks/useSelectedSession";
import { schoolSettingService } from "../../services/schoolSetting.service";
import { ApiError } from "../../types/api.types";
import type { SchClass } from "../../types/superadmin.types";
import type { EnrolledStudentRow } from "../../types/studentList.types";

const inputClasses =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-marigold/40 disabled:opacity-60";
const labelClasses = "text-sm font-medium text-ink-soft";

function photoUrl(image?: string): string | null {
  return image ? `${env.apiBaseUrl}/uploads/studentImage/${encodeURIComponent(image)}` : null;
}

/** The API uses both 0 and null for "no roll number"; the UI shows both as empty. */
function normalizeRoll(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  return text === "" || Number(text) === 0 ? "" : text;
}

function EnrolledStudentsContent({ schId, sessionId }: { schId: string; sessionId: string }) {
  const [schClasses, setSchClasses] = useState<SchClass[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [classesError, setClassesError] = useState<string | null>(null);

  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");

  const [students, setStudents] = useState<EnrolledStudentRow[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Unsaved roll number edits, keyed by enrollment id.
  const [rollEdits, setRollEdits] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    schoolSettingService
      .getSchClasses(schId)
      .then((res) => {
        if (!cancelled) setSchClasses(res.schClasses ?? []);
      })
      .catch((err) => {
        if (!cancelled)
          setClassesError(err instanceof ApiError ? err.message : "Could not load classes.");
      })
      .finally(() => {
        if (!cancelled) setClassesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [schId]);

  const sectionOptions = schClasses.find((c) => c.classID._id === classId)?.sectionID ?? [];

  function clearRollState() {
    setRollEdits({});
    setSaveError(null);
    setSaveMessage(null);
  }

  function handleClassChange(value: string) {
    setClassId(value);
    setSectionId("");
    setStudents(null); // the old list belongs to the previous class
    setError(null);
    clearRollState();
  }

  const currentRoll = (r: EnrolledStudentRow) => normalizeRoll(rollEdits[r._id] ?? r.rollNo);
  const changedRows = (students ?? []).filter(
    (r) => r._id in rollEdits && normalizeRoll(rollEdits[r._id]) !== normalizeRoll(r.rollNo)
  );
  // Catch duplicates before the server does (roll numbers must be unique per class-section).
  const filledRolls = (students ?? []).map(currentRoll).filter(Boolean);
  const hasDuplicateRolls = new Set(filledRolls).size !== filledRolls.length;

  async function handleSaveRolls() {
    setIsSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    // An emptied (or 0) roll number is saved as null, never as 0, so it can
    // not clash with other students who also have no roll number.
    const payload = changedRows.map((r) => ({
      enrollmentId: r._id,
      rollNo: normalizeRoll(rollEdits[r._id]) || null,
    }));
    try {
      const res = await schoolSettingService.updateStudentRollNumbers({ students: payload });
      const saved = new Map(payload.map((p) => [p.enrollmentId, p.rollNo]));
      setStudents((prev) =>
        prev ? prev.map((r) => (saved.has(r._id) ? { ...r, rollNo: saved.get(r._id) } : r)) : prev
      );
      setRollEdits({});
      setSaveMessage(res.message || "Roll numbers saved.");
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Could not save roll numbers.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleShow() {
    setIsLoading(true);
    setError(null);
    clearRollState();
    try {
      const res = await schoolSettingService.getEnrolledStudentsOfClass({
        schId,
        session: sessionId,
        classID: classId,
        sectionId,
      });
      setStudents(res.data ?? []);
    } catch (err) {
      setStudents(null);
      setError(err instanceof ApiError ? err.message : "Could not load enrolled students.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SectionCard title="Enrolled Students" icon={Users}>
      <div className="space-y-4">
        {classesError && (
          <p className="flex items-center gap-1.5 text-sm text-red-700">
            <AlertCircle size={14} /> {classesError}
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-3 sm:items-end">
          <div className="space-y-1">
            <label htmlFor="es-class" className={labelClasses}>Class</label>
            <select
              id="es-class"
              value={classId}
              onChange={(e) => handleClassChange(e.target.value)}
              disabled={classesLoading}
              className={inputClasses}
            >
              <option value="">{classesLoading ? "Loading classes…" : "Select a class"}</option>
              {schClasses.map((c) => (
                <option key={c.classID._id} value={c.classID._id}>
                  {c.classID.className}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="es-section" className={labelClasses}>Section</label>
            <select
              id="es-section"
              value={sectionId}
              onChange={(e) => {
                setSectionId(e.target.value);
                setStudents(null);
                clearRollState();
              }}
              disabled={!classId || sectionOptions.length === 0}
              className={inputClasses}
            >
              <option value="">
                {!classId
                  ? "Select a class first"
                  : sectionOptions.length === 0
                    ? "No sections for this class"
                    : "Select a section"}
              </option>
              {sectionOptions.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.sectionName}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleShow}
            disabled={!classId || !sectionId || isLoading}
            className="rounded-md bg-marigold px-4 py-2 text-sm font-medium text-ink hover:bg-marigold-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Loading…" : "Show Students"}
          </button>
        </div>

        {(students !== null || isLoading || error) && (
          <>
            {students && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-ink-soft">{students.length} student(s) enrolled</p>
                {students.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSaveRolls}
                    disabled={changedRows.length === 0 || hasDuplicateRolls || isSaving}
                    className="rounded-md bg-marigold px-3 py-1.5 text-sm font-medium text-ink hover:bg-marigold-dark disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSaving
                      ? "Saving…"
                      : `Save Roll Numbers${changedRows.length ? ` (${changedRows.length})` : ""}`}
                  </button>
                )}
              </div>
            )}
            {hasDuplicateRolls && (
              <p className="text-sm text-red-700">
                Two or more students have the same roll number. Roll numbers must be unique.
              </p>
            )}
            {saveError && <p className="text-sm text-red-700">{saveError}</p>}
            {saveMessage && <p className="text-sm text-green-700">{saveMessage}</p>}
            <EntityTable
              items={students ?? []}
              isLoading={isLoading}
              error={error}
              emptyLabel="No students are enrolled in this class and section."
              getRowKey={(r) => r._id}
              columns={[
                {
                  header: "Roll No",
                  render: (r) => (
                    <input
                      aria-label={`Roll number for ${r.studentId?.regno?.sname ?? "student"}`}
                      value={rollEdits[r._id] ?? normalizeRoll(r.rollNo)}
                      inputMode="numeric"
                      placeholder="—"
                      onChange={(e) =>
                        setRollEdits((prev) => ({ ...prev, [r._id]: e.target.value.replace(/\D/g, "") }))
                      }
                      className="w-20 rounded-md border border-line bg-white px-2 py-1 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-marigold/40"
                    />
                  ),
                },
                {
                  header: "Photo",
                  render: (r) => {
                    const url = photoUrl(r.studentId?.regno?.Image);
                    return url ? (
                      <img src={url} alt="" className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      <span className="text-ink-soft">—</span>
                    );
                  },
                },
                { header: "Student Name", render: (r) => r.studentId?.regno?.sname || "—" },
                { header: "Father's Name", render: (r) => r.studentId?.regno?.fname || "—" },
                { header: "Gender", render: (r) => r.studentId?.regno?.gender || "—" },
                { header: "Category", render: (r) => r.studentId?.regno?.category || "—" },
                { header: "DOB", render: (r) => r.studentId?.regno?.dob?.slice(0, 10) || "—" },
                { header: "Mobile", render: (r) => r.studentId?.regno?.mob1 || "—" },
              ]}
            />
          </>
        )}
      </div>
    </SectionCard>
  );
}

function EnrolledStudentsPage() {
  const { selectedSchool } = useSelectedSchool();
  const { selectedSession } = useSelectedSession();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-marigold-dark">Student Management · Admission</p>
        <h1 className="mt-1 font-display text-2xl text-ink">Enrolled Students</h1>
        {selectedSchool && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
            <School size={14} className="text-marigold-dark" />
            {selectedSchool.name}
            {selectedSession && ` · ${selectedSession.name}`}
          </p>
        )}
      </div>

      {selectedSchool && selectedSession ? (
        <EnrolledStudentsContent
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

export default EnrolledStudentsPage;
