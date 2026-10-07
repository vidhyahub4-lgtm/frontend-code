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
