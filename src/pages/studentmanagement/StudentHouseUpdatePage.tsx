import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Flag, Loader2, School, Shuffle } from "lucide-react";
import { SectionCard } from "../../components/common/SectionCard";
import { EntityTable } from "../../components/common/EntityTable";
import { useSelectedSchool } from "../../hooks/useSelectedSchool";
import { useSelectedSession } from "../../hooks/useSelectedSession";
import { houseColor, housesFromResponse } from "../../lib/houses";
import { schoolSettingService } from "../../services/schoolSetting.service";
import { ApiError } from "../../types/api.types";
import type { SchClass } from "../../types/superadmin.types";
import type { EnrolledStudentRow } from "../../types/studentList.types";

const inputClasses =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-marigold/40 disabled:opacity-60";
const labelClasses = "text-sm font-medium text-ink-soft";
const chipClasses = "rounded-full border px-3 py-1 text-xs font-medium transition";

function normalizeRoll(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  return text === "" || Number(text) === 0 ? "" : text;
}

function StudentHouseContent({ schId, sessionId }: { schId: string; sessionId: string }) {
  const [schClasses, setSchClasses] = useState<SchClass[]>([]);
  const [houses, setHouses] = useState<string[]>([]);
  const [setupLoading, setSetupLoading] = useState(true);
  const [setupError, setSetupError] = useState<string | null>(null);

  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [students, setStudents] = useState<EnrolledStudentRow[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Unsaved allotments keyed by enrollment id ("" = clear the house).
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkHouse, setBulkHouse] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([schoolSettingService.getSchClasses(schId), schoolSettingService.getSchHouses(schId)])
      .then(([classesRes, housesRes]) => {
        if (cancelled) return;
        setSchClasses(classesRes.schClasses ?? []);
        setHouses(housesFromResponse(housesRes, schId));
      })
      .catch((err) => {
        if (!cancelled) setSetupError(err instanceof ApiError ? err.message : "Could not load classes and houses.");
      })
      .finally(() => {
        if (!cancelled) setSetupLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [schId]);

  const sectionOptions = schClasses.find((c) => c.classID._id === classId)?.sectionID ?? [];
  const colorOf = (name: string) => houseColor(name, Math.max(houses.indexOf(name), 0));
  const houseOf = (r: EnrolledStudentRow) => edits[r._id] ?? r.house ?? "";

  function resetWork() {
    setEdits({});
    setSelected(new Set());
    setSaveError(null);
    setSaveMessage(null);
  }

  const rows = useMemo(() => students ?? [], [students]);
  const changedRows = rows.filter((r) => r._id in edits && (edits[r._id] || "") !== (r.house || ""));
  const unassigned = rows.filter((r) => !houseOf(r));
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => {
      const h = edits[r._id] ?? r.house ?? "";
      if (h) map.set(h, (map.get(h) ?? 0) + 1);
    });
    return map;
  }, [rows, edits]);

  function setHouseFor(ids: string[], house: string) {
    setEdits((prev) => {
      const next = { ...prev };
      ids.forEach((id) => {
        next[id] = house;
      });
      return next;
    });
    setSaveMessage(null);
  }

  function applyBulk() {
    if (selected.size === 0) return;
    setHouseFor([...selected], bulkHouse);
    setSelected(new Set());
  }

  // Spread the students without a house evenly across the houses (round-robin, least filled first).
  function autoDistribute() {
    if (houses.length === 0 || unassigned.length === 0) return;
    const load = new Map(houses.map((h) => [h, counts.get(h) ?? 0]));
    const next: Record<string, string> = {};
    unassigned.forEach((r) => {
      const [pick] = [...load.entries()].sort((a, b) => a[1] - b[1])[0];
      next[r._id] = pick;
      load.set(pick, (load.get(pick) ?? 0) + 1);
    });
    setEdits((prev) => ({ ...prev, ...next }));
    setSaveMessage(null);
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleShow() {
    setIsLoading(true);
    setError(null);
    resetWork();
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
      setError(err instanceof ApiError ? err.message : "Could not load students.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    if (isSaving || changedRows.length === 0) return;
    setIsSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    const payload = changedRows.map((r) => ({ enrollmentId: r._id, house: edits[r._id] || null }));
    try {
      const res = await schoolSettingService.updateStudentHouses({ schId, students: payload });
      const saved = new Map(payload.map((p) => [p.enrollmentId, p.house]));
      setStudents((prev) => (prev ? prev.map((r) => (saved.has(r._id) ? { ...r, house: saved.get(r._id) } : r)) : prev));
      setEdits({});
      setSaveMessage(res.message || "House allotment saved.");
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Could not save house allotment.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SectionCard title="Student House Update" icon={Flag}>
      <div className="space-y-4">
        {setupError && (
          <p className="flex items-center gap-1.5 text-sm text-red-700">
            <AlertCircle size={14} /> {setupError}
          </p>
        )}
        {!setupLoading && !setupError && houses.length === 0 && (
          <p className="rounded-md bg-amber-50 px-3.5 py-2 text-sm text-amber-800">
            No houses created for this school yet. Add them in School Setting → Essential Setting → House / Club Setup.
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-3 sm:items-end">
          <div className="space-y-1">
            <label htmlFor="sh-class" className={labelClasses}>Class</label>
            <select
              id="sh-class"
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                setSectionId("");
                setStudents(null);
                setError(null);
                resetWork();
              }}
              disabled={setupLoading}
              className={inputClasses}
            >
              <option value="">{setupLoading ? "Loading…" : "Select a class"}</option>
              {schClasses.map((c) => (
                <option key={c.classID._id} value={c.classID._id}>{c.classID.className}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="sh-section" className={labelClasses}>Section</label>
            <select
              id="sh-section"
              value={sectionId}
              onChange={(e) => {
                setSectionId(e.target.value);
                setStudents(null);
                resetWork();
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
          <button
            type="button"
            onClick={handleShow}
            disabled={!classId || !sectionId || isLoading}
            className="rounded-md bg-marigold px-4 py-2 text-sm font-medium text-ink hover:bg-marigold-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Loading…" : "Show Students"}
          </button>
        </div>

        {students && students.length > 0 && (
          <div className="space-y-3">
            {/* house distribution of this class-section */}
            <div className="flex flex-wrap gap-2">
              {houses.map((h) => (
                <span
                  key={h}
                  className="flex items-center gap-2 rounded-lg border bg-white px-3 py-1.5 text-sm text-ink"
                  style={{ borderColor: colorOf(h) }}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorOf(h) }} />
                  {h}
                  <span className="font-display text-base">{counts.get(h) ?? 0}</span>
                </span>
              ))}
              <span className="flex items-center gap-2 rounded-lg border border-dashed border-line bg-paper px-3 py-1.5 text-sm text-ink-soft">
                Not allotted <span className="font-display text-base text-ink">{unassigned.length}</span>
              </span>
            </div>

            {/* bulk tools */}
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-line bg-paper px-3 py-2 text-sm">
              <span className="text-ink-soft">Select:</span>
              <button type="button" onClick={() => setSelected(new Set(rows.map((r) => r._id)))} className={`${chipClasses} border-line bg-white text-ink hover:bg-chalk`}>
                All ({rows.length})
              </button>
              <button type="button" onClick={() => setSelected(new Set(unassigned.map((r) => r._id)))} className={`${chipClasses} border-line bg-white text-ink hover:bg-chalk`}>
                Not allotted ({unassigned.length})
              </button>
              {selected.size > 0 && (
                <button type="button" onClick={() => setSelected(new Set())} className="text-xs font-medium text-marigold-dark hover:underline">
                  Clear ({selected.size})
                </button>
              )}
              <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
              <select
                aria-label="House for selected students"
                value={bulkHouse}
                onChange={(e) => setBulkHouse(e.target.value)}
                className="rounded-md border border-line bg-white px-2 py-1.5 text-sm text-ink"
              >
                <option value="">Remove house</option>
                {houses.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={applyBulk}
                disabled={selected.size === 0}
                className="rounded-md border border-marigold bg-white px-3 py-1.5 text-sm font-medium text-ink hover:bg-marigold/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Apply to {selected.size || "selected"}
              </button>
              <button
                type="button"
                onClick={autoDistribute}
                disabled={houses.length === 0 || unassigned.length === 0}
                title="Spread students without a house evenly across all houses"
                className="inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-3 py-1.5 text-sm text-ink hover:bg-chalk disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Shuffle size={14} /> Auto-distribute
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-ink-soft">
                Changes are saved only when you press Save.
                {changedRows.length > 0 && ` ${changedRows.length} unsaved.`}
              </p>
              <button
                type="button"
                onClick={handleSave}
                disabled={changedRows.length === 0 || isSaving}
                aria-busy={isSaving}
                className="inline-flex items-center gap-1.5 rounded-md bg-marigold px-4 py-2 text-sm font-medium text-ink hover:bg-marigold-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving && <Loader2 size={14} className="animate-spin" />}
                {isSaving ? "Saving…" : `Save House Allotment${changedRows.length ? ` (${changedRows.length})` : ""}`}
              </button>
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

        {(students !== null || isLoading || error) && (
          <EntityTable
            items={rows}
            isLoading={isLoading}
            error={error}
            emptyLabel="No students enrolled in this class and section."
            getRowKey={(r) => r._id}
            columns={[
              {
                header: "Select",
                render: (r) => (
                  <input
                    type="checkbox"
                    aria-label={`Select ${r.studentId?.regno?.sname ?? "student"}`}
                    checked={selected.has(r._id)}
                    onChange={() => toggleSelected(r._id)}
                  />
                ),
              },
              { header: "Roll", render: (r) => normalizeRoll(r.rollNo) || "—" },
              { header: "Adm No", render: (r) => r.studentId?.admno || "—" },
              { header: "Student Name", render: (r) => r.studentId?.regno?.sname || "—" },
              { header: "Gender", render: (r) => r.studentId?.regno?.gender || "—" },
              {
                header: "House",
                render: (r) => {
                  const current = houseOf(r);
                  const dirty = r._id in edits && (edits[r._id] || "") !== (r.house || "");
                  return (
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: current ? colorOf(current) : "#cbd5e1" }}
                      />
                      <select
                        aria-label={`House for ${r.studentId?.regno?.sname ?? "student"}`}
                        value={current}
                        onChange={(e) => setHouseFor([r._id], e.target.value)}
                        className={`rounded-md border bg-white px-2 py-1 text-sm text-ink ${dirty ? "border-marigold ring-1 ring-marigold/40" : "border-line"}`}
                      >
                        <option value="">Not allotted</option>
                        {/* keep a stale/removed house visible instead of silently blanking it */}
                        {current && !houses.includes(current) && <option value={current}>{current}</option>}
                        {houses.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  );
                },
              },
            ]}
          />
        )}
      </div>
    </SectionCard>
  );
}

function StudentHouseUpdatePage() {
  const { selectedSchool } = useSelectedSchool();
  const { selectedSession } = useSelectedSession();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-marigold-dark">Student Management · Manage / Update</p>
        <h1 className="mt-1 font-display text-2xl text-ink">Student House Update</h1>
        {selectedSchool && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
            <School size={14} className="text-marigold-dark" />
            {selectedSchool.name}
            {selectedSession && ` · Session ${selectedSession.name}`}
          </p>
        )}
      </div>

      {selectedSchool && selectedSession ? (
        <StudentHouseContent
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

export default StudentHouseUpdatePage;
