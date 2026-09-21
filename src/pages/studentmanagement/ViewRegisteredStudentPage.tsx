import { useEffect, useMemo, useState } from "react";
import { Download, Eraser, Eye as EyeIcon, Printer, School, Search, User } from "lucide-react";
import { SectionCard } from "../../components/common/SectionCard";
import { EntityTable } from "../../components/common/EntityTable";
import { env } from "../../config/env";
import { useSelectedSchool } from "../../hooks/useSelectedSchool";
import { useSelectedSession } from "../../hooks/useSelectedSession";
import { schoolSettingService } from "../../services/schoolSetting.service";
import { superAdminService } from "../../services/superadmin.service";
import { ApiError } from "../../types/api.types";
import type { RegisteredStudent } from "../../types/studentRegistration.types";
import type { Session, SchClass } from "../../types/superadmin.types";

const inputClasses =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-marigold/40";
const labelClasses = "text-sm font-medium text-ink-soft";
const secondaryButtonClasses =
  "flex items-center justify-center gap-1.5 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-ink transition hover:bg-chalk disabled:cursor-not-allowed disabled:opacity-60";

const ALL_SESSIONS = "all";

type SearchKey = "name" | "fname" | "mname" | "mobile" | "aadhaar";

const SEARCH_KEYS: { value: SearchKey; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "fname", label: "Father Name" },
  { value: "mname", label: "Mother Name" },
  { value: "mobile", label: "Mobile No" },
  { value: "aadhaar", label: "Aadhaar No" },
];

/** yyyy-mm-dd part of an ISO date string, or "" */
function dateOnly(value?: string): string {
  return value ? value.slice(0, 10) : "";
}

function formatDate(value?: string): string {
  const d = dateOnly(value);
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}-${m}-${y}`;
}

function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
}

function photoUrl(image?: string): string | null {
  return image ? `${env.apiBaseUrl}/uploads/studentImage/${encodeURIComponent(image)}` : null;
}

function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

/**
 * Everything here depends on the selected school. Rendered with key={schId}
 * by the page below, so switching school remounts it and refetches.
 */
function RegisteredStudentsContent({ schId }: { schId: string }) {
  const { selectedSession } = useSelectedSession();
  const globalSessionId = selectedSession?.id ?? "";

  const [students, setStudents] = useState<RegisteredStudent[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  // classApplyfor on a registration is now a Class ObjectId (not a readable
  // name — the backend's getAlNewReg doesn't populate it), so we resolve it
  // ourselves against this school's assigned classes.
  const [schClasses, setSchClasses] = useState<SchClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      schoolSettingService.getAllNewRegistrations(schId),
      superAdminService.getSessions(),
      schoolSettingService.getSchClasses(schId),
    ])
      .then(([registrations, sessionRes, schClassRes]) => {
        if (cancelled) return;
        setStudents(registrations.data ?? []);
        setSessions(sessionRes.sessions ?? []);
        setSchClasses(schClassRes.schClasses ?? []);
      })
      .catch((err) => {
        if (!cancelled)
          setLoadError(err instanceof ApiError ? err.message : "Could not load registered students.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [schId]);

  // ---- Filters (all applied client-side; the API returns the whole school) ----
  // Session filter starts as the global selected session (or "all"), and the
  // user may override it. The override remembers which global session it was
  // made against, so it follows a new global selection (same idea as the
  // registration form).
  const [sessionOverride, setSessionOverride] = useState<{ forGlobalId: string; value: string } | null>(null);
  const sessionFilter =
    sessionOverride && sessionOverride.forGlobalId === globalSessionId
      ? sessionOverride.value
      : globalSessionId || ALL_SESSIONS;

  const [regNo, setRegNo] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchKey, setSearchKey] = useState<SearchKey>("name");
  const [searchValue, setSearchValue] = useState("");
  const [keyword, setKeyword] = useState("");

  const sessionNames = useMemo(
    () => new Map(sessions.map((session) => [session._id, session.session])),
    [sessions]
  );
  const sessionName = (id: string) => sessionNames.get(id) ?? "—";

  const classNames = useMemo(
    () => new Map(schClasses.map((sc) => [sc.classID._id, sc.classID.className])),
    [schClasses]
  );
  const className = (id?: string) => (id ? classNames.get(id) ?? "—" : "—");

  const filtered = useMemo(() => {
    const regQuery = regNo.trim();
    const valueQuery = searchValue.trim().toLowerCase();
    const keywordQuery = keyword.trim().toLowerCase();

    return students
      .filter((s) => {
        if (sessionFilter !== ALL_SESSIONS && s.session !== sessionFilter) return false;
        if (regQuery && String(s.regno) !== regQuery) return false;

        const regDate = dateOnly(s.registrationdate);
        if (fromDate && (!regDate || regDate < fromDate)) return false;
        if (toDate && (!regDate || regDate > toDate)) return false;

        if (valueQuery) {
          const haystacks: Record<SearchKey, (string | undefined)[]> = {
            name: [s.sname],
            fname: [s.fname],
            mname: [s.mname],
            mobile: [s.mob1, s.mob2, s.whatAppno],
            aadhaar: [s.adharId],
          };
          if (!haystacks[searchKey].some((v) => v?.toLowerCase().includes(valueQuery))) return false;
        }

        if (keywordQuery) {
          const text = [
            s.regno,
            s.sname,
            s.fname,
            s.mname,
            s.gname,
            s.mob1,
            s.mob2,
            s.whatAppno,
            s.adharId,
            s.email,
            s.classApplyfor ? classNames.get(s.classApplyfor) ?? "" : "",
            s.religion,
            s.category,
            sessionNames.get(s.session) ?? "",
          ]
            .join(" ")
            .toLowerCase();
          if (!text.includes(keywordQuery)) return false;
        }
        return true;
      })
      .sort((a, b) => b.regno - a.regno); // newest registration first
  }, [students, sessionFilter, regNo, fromDate, toDate, searchKey, searchValue, keyword, sessionNames, classNames]);

  function handleClearAll() {
    setSessionOverride({ forGlobalId: globalSessionId, value: ALL_SESSIONS });
    setRegNo("");
    setFromDate("");
    setToDate("");
    setSearchValue("");
    setKeyword("");
  }

  function handleExport() {
    const header = [
      "Reg No", "Reg Date", "Session", "Name", "Father Name", "Mother Name", "Guardian Name",
      "Gender", "Category", "DOB", "Age", "Mobile 1", "Mobile 2", "WhatsApp", "Email",
      "Aadhaar", "Class Applying For",
    ];
    const rows = filtered.map((s) => [
      s.regno, formatDate(s.registrationdate), sessionName(s.session), s.sname, s.fname, s.mname,
      s.gname, capitalize(s.gender), s.category.toUpperCase(), s.dob ?? "", s.age, s.mob1,
      s.mob2 ?? "", s.whatAppno, s.email ?? "", s.adharId ?? "", className(s.classApplyfor),
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");

    // "\uFEFF" (BOM) makes Excel read the file as UTF-8.
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `registered-students-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="print:hidden">
        <SectionCard title="Search Registered Student" icon={Search}>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <label htmlFor="vr-session" className={labelClasses}>Session</label>
                <select
                  id="vr-session"
                  value={sessionFilter}
                  onChange={(e) => setSessionOverride({ forGlobalId: globalSessionId, value: e.target.value })}
                  className={inputClasses}
                >
                  <option value={ALL_SESSIONS}>All sessions</option>
                  {sessions.map((session) => (
                    <option key={session._id} value={session._id}>
                      {session.session}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="vr-regno" className={labelClasses}>Registration No</label>
                <input
                  id="vr-regno"
                  inputMode="numeric"
                  value={regNo}
                  onChange={(e) => setRegNo(e.target.value.replace(/\D/g, ""))}
                  placeholder="Enter reg no"
                  className={inputClasses}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="vr-from" className={labelClasses}>Registered From</label>
                <input id="vr-from" type="date" value={fromDate} max={toDate || undefined} onChange={(e) => setFromDate(e.target.value)} className={inputClasses} />
              </div>
              <div className="space-y-1">
                <label htmlFor="vr-to" className={labelClasses}>To</label>
                <input id="vr-to" type="date" value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)} className={inputClasses} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
              <div className="space-y-1">
                <label htmlFor="vr-key" className={labelClasses}>Search By</label>
                <select id="vr-key" value={searchKey} onChange={(e) => setSearchKey(e.target.value as SearchKey)} className={inputClasses}>
                  {SEARCH_KEYS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="vr-value" className={labelClasses}>Search Value</label>
                <input
                  id="vr-value"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder={`Type ${SEARCH_KEYS.find((k) => k.value === searchKey)?.label.toLowerCase()}…`}
                  className={inputClasses}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleClearAll}
              className="flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-100"
            >
              <Eraser size={14} /> Clear All
            </button>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Registered Students" icon={EyeIcon}>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <button type="button" onClick={() => setKeyword("")} className={secondaryButtonClasses}>
              <Eraser size={14} /> Clear
            </button>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search keyword"
              className={`${inputClasses} max-w-xs`}
            />
            <button type="button" onClick={handleExport} disabled={filtered.length === 0} className={secondaryButtonClasses}>
              <Download size={14} /> Export CSV
            </button>
            <button type="button" onClick={() => window.print()} disabled={filtered.length === 0} className={secondaryButtonClasses}>
              <Printer size={14} /> Print View
            </button>
          </div>

          <EntityTable<RegisteredStudent>
            items={filtered}
            isLoading={isLoading}
            error={loadError}
            emptyLabel={
              students.length === 0 ? "No students registered yet." : "No students match your filters."
            }
            getRowKey={(item) => item._id}
            columns={[
              { header: "Reg No", render: (item) => item.regno },
              { header: "Reg Date", render: (item) => formatDate(item.registrationdate) },
              { header: "Session", render: (item) => sessionName(item.session) },
              {
                header: "Photo",
                render: (item) => {
                  const url = photoUrl(item.Image);
                  return url ? (
                    <img src={url} alt="" loading="lazy" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-chalk text-ink-soft">
                      <User size={15} />
                    </span>
                  );
                },
              },
              { header: "Name", render: (item) => <span className="font-medium">{item.sname}</span> },
              { header: "Father Name", render: (item) => item.fname },
              { header: "Mother Name", render: (item) => item.mname },
              { header: "Gender", render: (item) => capitalize(item.gender) },
              { header: "DOB", render: (item) => formatDate(item.dob) },
              { header: "Mobile", render: (item) => item.mob1 },
              { header: "Class Applying", render: (item) => className(item.classApplyfor) },
            ]}
          />

          <p className="text-sm text-ink-soft">
            Total No of Students Found: {filtered.length}
            {filtered.length !== students.length && ` (of ${students.length})`}
          </p>
        </div>
      </SectionCard>
    </>
  );
}

function ViewRegisteredStudentPage() {
  const { selectedSchool } = useSelectedSchool();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-marigold-dark print:hidden">
          Student Management · Registration
        </p>
        <h1 className="mt-1 font-display text-2xl text-ink">View Registered Student</h1>
        {selectedSchool && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
            <School size={14} className="text-marigold-dark" />
            {selectedSchool.name}
          </p>
        )}
      </div>

      {selectedSchool ? (
        <RegisteredStudentsContent key={selectedSchool.id} schId={selectedSchool.id} />
      ) : (
        <div className="rounded-lg border border-dashed border-line bg-white px-5 py-10 text-center print:hidden">
          <School size={28} className="mx-auto text-marigold-dark" />
          <p className="mt-3 font-display text-lg text-ink">No school selected</p>
          <p className="mt-1 text-sm text-ink-soft">
            Use the settings icon at the top right to select a school first.
          </p>
        </div>
      )}
    </div>
  );
}

export default ViewRegisteredStudentPage;
