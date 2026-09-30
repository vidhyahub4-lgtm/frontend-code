import { useCallback, useEffect, useState, type FormEvent } from "react";
import { BookOpen, Plus, School as SchoolIcon, Trash2 } from "lucide-react";
import { useSelectedSchool } from "../../hooks/useSelectedSchool";
import { useSelectedSession } from "../../hooks/useSelectedSession";
import { SectionCard } from "../../components/common/SectionCard";
import { EntityTable } from "../../components/common/EntityTable";
import { schoolSettingService } from "../../services/schoolSetting.service";
import { ApiError } from "../../types/api.types";
import type { SubjectItem } from "../../types/subject.types";

const inputClasses =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-marigold/40";
const labelClasses = "text-sm font-medium text-ink-soft";
const secondaryButtonClasses =
  "flex items-center justify-center gap-1.5 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-ink transition hover:bg-chalk disabled:cursor-not-allowed disabled:opacity-60";

interface Row {
  id: string;
  subjectName: string;
  subCode: string;
}

function newRow(): Row {
  return { id: crypto.randomUUID(), subjectName: "", subCode: "" };
}

interface SubjectSetupContentProps {
  schId: string;
  schCode: string;
  sessionId: string;
}

/**
 * Depends on the selected school + session. Rendered with a key of both by the
 * page below, so switching either one remounts it and refetches.
 */
function SubjectSetupContent({ schId, schCode, sessionId }: SubjectSetupContentProps) {
  const [rows, setRows] = useState<Row[]>(() => [newRow()]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Only sets state in promise callbacks (never synchronously), so it is safe to
  // call from an effect. `listLoading` starts true for the first load; a manual
  // refresh (after saving) sets it to true itself before calling this.
  const fetchSubjects = useCallback(
    () =>
      schoolSettingService
        .getSubjects(schId, sessionId)
        .then((res) => {
          setSubjects((res.data ?? []).flatMap((doc) => doc.subjects ?? []));
          setListError(null);
        })
        .catch((err) => {
          setListError(err instanceof ApiError ? err.message : "Could not load subjects.");
        })
        .finally(() => setListLoading(false)),
    [schId, sessionId]
  );

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  function updateRow(id: string, patch: Partial<Omit<Row, "id">>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function removeRow(id: string) {
    setRows((current) => (current.length === 1 ? current : current.filter((row) => row.id !== id)));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    // Rows the user never touched are ignored; half-filled rows are an error.
    const filled = rows.filter((row) => row.subjectName.trim() || row.subCode.trim());
    if (filled.length === 0) {
      setFormError("Add at least one subject.");
      return;
    }
    if (filled.some((row) => !row.subjectName.trim() || !row.subCode.trim())) {
      setFormError("Every subject needs both a name and a code.");
      return;
    }

    const payloadSubjects: SubjectItem[] = filled.map((row) => ({
      subjectName: row.subjectName.trim(),
      subCode: row.subCode.trim().toUpperCase(),
    }));

    // Same checks the backend does, so the user gets the error without a round trip.
    const existingCodes = new Set(subjects.map((s) => s.subCode.toUpperCase()));
    const seen = new Set<string>();
    for (const subject of payloadSubjects) {
      if (seen.has(subject.subCode)) {
        setFormError(`Duplicate subject code: ${subject.subCode}`);
        return;
      }
      if (existingCodes.has(subject.subCode)) {
        setFormError(`Subject code ${subject.subCode} already exists`);
        return;
      }
      seen.add(subject.subCode);
    }

    setIsSaving(true);
    try {
      await schoolSettingService.createSubject({
        schId,
        schCode,
        session: sessionId,
        subjects: payloadSubjects,
      });
      setRows([newRow()]);
      setSuccessMessage(
        payloadSubjects.length === 1
          ? "1 subject added."
          : `${payloadSubjects.length} subjects added.`
      );
      setListLoading(true);
      fetchSubjects();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SectionCard title="Subject Setup" icon={BookOpen}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-3">
          {rows.map((row, index) => (
            <div key={row.id} className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1">
                <label htmlFor={`sub-name-${row.id}`} className={labelClasses}>
                  Subject Name{rows.length > 1 ? ` ${index + 1}` : ""}
                </label>
                <input
                  id={`sub-name-${row.id}`}
                  value={row.subjectName}
                  onChange={(e) => updateRow(row.id, { subjectName: e.target.value })}
                  placeholder="e.g. Mathematics"
                  className={inputClasses}
                />
              </div>
              <div className="space-y-1 sm:w-48">
                <label htmlFor={`sub-code-${row.id}`} className={labelClasses}>
                  Subject Code
                </label>
                <input
                  id={`sub-code-${row.id}`}
                  value={row.subCode}
                  onChange={(e) => updateRow(row.id, { subCode: e.target.value.toUpperCase() })}
                  placeholder="e.g. MATH"
                  className={inputClasses}
                />
              </div>
              <button
                type="button"
                onClick={() => removeRow(row.id)}
                disabled={rows.length === 1}
                aria-label={`Remove subject row ${index + 1}`}
                className={`${secondaryButtonClasses} sm:mb-0.5`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        {formError && (
          <p role="alert" className="rounded-md bg-red-50 px-3.5 py-2 text-sm text-red-600">
            {formError}
          </p>
        )}
        {successMessage && (
          <p role="status" className="rounded-md bg-green-50 px-3.5 py-2 text-sm text-green-700">
            {successMessage}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setRows((current) => [...current, newRow()])}
            className={secondaryButtonClasses}
          >
            <Plus size={14} /> Add Row
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center justify-center gap-1.5 rounded-md bg-marigold px-4 py-2 text-sm font-medium text-chalkboard transition hover:bg-marigold-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Saving…" : "Save Subjects"}
          </button>
        </div>
      </form>

      <div className="mt-5 border-t border-line pt-4">
        <EntityTable<SubjectItem>
          items={subjects}
          isLoading={listLoading}
          error={listError}
          emptyLabel="No subjects added for this session yet."
          getRowKey={(item) => item.subCode}
          columns={[
            { header: "Sr No", render: (item) => subjects.indexOf(item) + 1 },
            { header: "Subject Name", render: (item) => <span className="font-medium">{item.subjectName}</span> },
            { header: "Subject Code", render: (item) => item.subCode },
          ]}
        />
        {!listLoading && !listError && subjects.length > 0 && (
          <p className="mt-3 text-sm text-ink-soft">Total Subjects: {subjects.length}</p>
        )}
      </div>
    </SectionCard>
  );
}

function SubjectSetupPage() {
  const { selectedSchool } = useSelectedSchool();
  const { selectedSession } = useSelectedSession();

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-medium text-marigold-dark">School Setting · Essential Setting</p>
        <h1 className="mt-1 font-display text-2xl text-ink">Subject Setup</h1>
        {selectedSchool && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
            <SchoolIcon size={14} className="text-marigold-dark" />
            {selectedSchool.name}
            {selectedSession && ` · Session ${selectedSession.name}`}
          </p>
        )}
      </div>

      {selectedSchool && selectedSession ? (
        <SubjectSetupContent
          key={`${selectedSchool.id}:${selectedSession.id}`}
          schId={selectedSchool.id}
          schCode={selectedSchool.schoolCode}
          sessionId={selectedSession.id}
        />
      ) : (
        <div className="rounded-lg border border-dashed border-line bg-white px-5 py-10 text-center">
          <SchoolIcon size={28} className="mx-auto text-marigold-dark" />
          <p className="mt-3 font-display text-lg text-ink">
            {selectedSchool ? "No session selected" : "No school selected"}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            Use the settings icon at the top right to select a{selectedSchool ? " session" : " school"} first.
          </p>
        </div>
      )}
    </div>
  );
}

export default SubjectSetupPage;
