import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Search } from "lucide-react";
import { SectionCard } from "../common/SectionCard";
import { feeService } from "../../services/fee.service";
import { ApiError } from "../../types/api.types";
import type { EnrollmentRow } from "../../types/fee.types";
import {
  enrollmentClassName,
  enrollmentLabel,
  enrollmentStudentName,
} from "../../lib/enrollmentDisplay";

const inputClasses =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-marigold/40 disabled:opacity-60";
const labelClasses = "text-sm font-medium text-ink-soft";

interface Props {
  schId: string;
  sessionId: string;
  /** Called with the chosen enrollment, or null when the selection is cleared. */
  onSelect: (row: EnrollmentRow | null) => void;
}

/** Find an enrolled student of the selected school + session by class and name / admission no. */
export function EnrolledStudentPicker({ schId, sessionId, onSelect }: Props) {
  const [rows, setRows] = useState<EnrollmentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [admNo, setAdmNo] = useState("");
  const [admError, setAdmError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    feeService
      .getEnrollmentList(schId, sessionId)
      .then((res) => {
        if (!cancelled) setRows(res.data ?? []);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof ApiError ? err.message : "Could not load students.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [schId, sessionId]);

  const classOptions = useMemo(
    () =>
      [...new Set(rows.map(enrollmentClassName).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true })
      ),
    [rows]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (classFilter && enrollmentClassName(r) !== classFilter) return false;
      if (!q) return true;
      return (
        enrollmentStudentName(r).toLowerCase().includes(q) ||
        String(r.studentId.admno ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, classFilter, search]);

  function handleGetDetails() {
    const q = admNo.trim().toLowerCase();
    if (!q) return;
    const row = rows.find((r) => String(r.studentId.admno ?? "").toLowerCase() === q);
    if (!row) {
      setAdmError("No enrolled student found with this admission no.");
      return;
    }
    setAdmError(null);
    // Clear the filters so the student is part of the dropdown below.
    setClassFilter("");
    setSearch("");
    setSelectedId(row._id);
    onSelect(row);
  }

  function clearSelection() {
    setSelectedId("");
    onSelect(null);
  }

  return (
    <SectionCard title="Select Student" icon={Search}>
      <div className="space-y-3">
        {error && (
          <p className="flex items-center gap-1.5 text-sm text-red-700">
            <AlertCircle size={14} /> {error}
          </p>
        )}
        <div className="space-y-1">
          <label htmlFor="pick-admno" className={labelClasses}>Admission No.</label>
          <div className="flex max-w-md gap-2">
            <input
              id="pick-admno"
              value={admNo}
              onChange={(e) => {
                setAdmNo(e.target.value);
                setAdmError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleGetDetails();
              }}
              placeholder="Ex: 2026/9"
              className={inputClasses}
            />
            <button
              type="button"
              onClick={handleGetDetails}
              disabled={isLoading || !admNo.trim()}
              className="shrink-0 rounded-md bg-marigold px-3 py-2 text-sm font-medium text-ink hover:bg-marigold-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              Get Details
            </button>
          </div>
          {admError && <p className="text-xs text-red-600">{admError}</p>}
        </div>
        <p className="text-xs text-ink-soft">Or find the student by class / name:</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <label htmlFor="pick-class" className={labelClasses}>Class</label>
            <select
              id="pick-class"
              value={classFilter}
              onChange={(e) => {
                setClassFilter(e.target.value);
                clearSelection();
              }}
              disabled={isLoading}
              className={inputClasses}
            >
              <option value="">All classes</option>
              {classOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="pick-search" className={labelClasses}>Search</label>
            <input
              id="pick-search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                clearSelection();
              }}
              placeholder="Name or admission no"
              className={inputClasses}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="pick-student" className={labelClasses}>
              Student {!isLoading && `(${filtered.length})`}
            </label>
            <select
              id="pick-student"
              value={selectedId}
              onChange={(e) => {
                setSelectedId(e.target.value);
                onSelect(filtered.find((r) => r._id === e.target.value) ?? null);
              }}
              disabled={isLoading}
              className={inputClasses}
            >
              <option value="">
                {isLoading
                  ? "Loading students…"
                  : filtered.length === 0
                    ? "No students found"
                    : "Select a student"}
              </option>
              {filtered.map((r) => (
                <option key={r._id} value={r._id}>
                  {enrollmentLabel(r)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
