import { useEffect, useMemo, useState } from "react";
import { AlertCircle, GraduationCap, School } from "lucide-react";
import { SectionCard } from "../../components/common/SectionCard";
import { EntityTable } from "../../components/common/EntityTable";
import { useSelectedSchool } from "../../hooks/useSelectedSchool";
import { useSelectedSession } from "../../hooks/useSelectedSession";
import { feeService } from "../../services/fee.service";
import { ApiError } from "../../types/api.types";
import type { EnrollmentRow } from "../../types/fee.types";

const inputClasses =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-marigold/40";
const labelClasses = "text-sm font-medium text-ink-soft";

const FEE_STATUS: Record<string, { label: string; classes: string }> = {
  pending: { label: "Fee pending", classes: "bg-amber-100 text-amber-800" },
  done: { label: "Fee paid", classes: "bg-green-100 text-green-800" },
  reject: { label: "Rejected", classes: "bg-red-100 text-red-700" },
};

// The enrollment API populates these, but the types allow plain ids too.
function className(row: EnrollmentRow): string {
  return typeof row.classID === "string" ? "" : (row.classID.className ?? "");
}
function sectionName(row: EnrollmentRow): string {
  return typeof row.sectionId === "string" ? "" : (row.sectionId.sectionName ?? "");
}
function studentName(row: EnrollmentRow): string {
  const reg = row.studentId.regno;
  return typeof reg === "string" ? "" : (reg?.sname ?? "");
}
function regNo(row: EnrollmentRow): string {
  const reg = row.studentId.regno;
  return typeof reg === "string" ? "" : String(reg?.regno ?? "");
}

/** Keyed by school + session by the page below, so switching either remounts it. */
function AdmittedStudentsContent({ schId, sessionId }: { schId: string; sessionId: string }) {
  const [rows, setRows] = useState<EnrollmentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [classFilter, setClassFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    feeService
      .getEnrollmentList(schId, sessionId)
      .then((res) => {
        if (!cancelled) setRows(res.data ?? []);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof ApiError ? err.message : "Could not load admitted students.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [schId, sessionId]);

  const classOptions = useMemo(
    () => [...new Set(rows.map(className).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [rows]
  );
  // Sections offered depend on the class filter.
  const sectionOptions = useMemo(
    () =>
      [
        ...new Set(
          rows
            .filter((r) => !classFilter || className(r) === classFilter)
            .map(sectionName)
            .filter(Boolean)
        ),
      ].sort(),
    [rows, classFilter]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (classFilter && className(r) !== classFilter) return false;
      if (sectionFilter && sectionName(r) !== sectionFilter) return false;
      if (!q) return true;
      return [studentName(r), r.studentId.admno, regNo(r)].some((v) =>
        String(v ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, classFilter, sectionFilter, search]);

  return (
    <SectionCard title="Admitted Students" icon={GraduationCap}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <label htmlFor="as-class" className={labelClasses}>Class</label>
            <select
              id="as-class"
              value={classFilter}
              onChange={(e) => {
                setClassFilter(e.target.value);
                setSectionFilter(""); // section list depends on the class
              }}
              className={inputClasses}
            >
              <option value="">All classes</option>
              {classOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="as-section" className={labelClasses}>Section</label>
            <select
              id="as-section"
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className={inputClasses}
            >
              <option value="">All sections</option>
              {sectionOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="as-search" className={labelClasses}>Search</label>
            <input
              id="as-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, admission no or reg no"
              className={inputClasses}
            />
          </div>
        </div>

        {!isLoading && !error && (
          <p className="text-xs text-ink-soft">
            Showing {filtered.length} of {rows.length} students
          </p>
        )}

        <EntityTable
          items={filtered}
          isLoading={isLoading}
          error={error}
          emptyLabel={rows.length === 0 ? "No admitted students for this session yet." : "No students match the filters."}
          getRowKey={(r) => r._id}
          columns={[
            { header: "Adm No", render: (r) => r.studentId.admno },
            { header: "Reg No", render: (r) => regNo(r) || "—" },
            { header: "Student Name", render: (r) => studentName(r) || "—" },
            { header: "Class", render: (r) => className(r) || "—" },
            { header: "Section", render: (r) => sectionName(r) || "—" },
            {
              header: "Admission Fee",
              render: (r) => {
                const s = r.studentId.pystatus ? FEE_STATUS[r.studentId.pystatus] : undefined;
                return s ? (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.classes}`}>{s.label}</span>
                ) : (
                  "—"
                );
              },
            },
          ]}
        />
      </div>
    </SectionCard>
  );
}

function AdmittedStudentsPage() {
  const { selectedSchool } = useSelectedSchool();
  const { selectedSession } = useSelectedSession();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-marigold-dark">Student Management · Admission</p>
        <h1 className="mt-1 font-display text-2xl text-ink">Admitted Students</h1>
        {selectedSchool && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
            <School size={14} className="text-marigold-dark" />
            {selectedSchool.name}
            {selectedSession && ` · ${selectedSession.name}`}
          </p>
        )}
      </div>

      {selectedSchool && selectedSession ? (
        <AdmittedStudentsContent
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

export default AdmittedStudentsPage;
