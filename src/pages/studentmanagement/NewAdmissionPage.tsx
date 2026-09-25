import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Bus,
  CheckCircle2,
  GraduationCap,
  Loader2,
  Mail,
  MessageSquare,
  Save,
  School,
  Search,
  UserCircle,
  Wallet,
} from "lucide-react";
import { SectionCard } from "../../components/common/SectionCard";
import { useSelectedSchool } from "../../hooks/useSelectedSchool";
import { useSelectedSession } from "../../hooks/useSelectedSession";
import { schoolSettingService } from "../../services/schoolSetting.service";
import { superAdminService } from "../../services/superadmin.service";
import { ApiError } from "../../types/api.types";
import type { RegisteredStudent } from "../../types/studentRegistration.types";
import type { SchClass } from "../../types/superadmin.types";

const inputClasses =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-marigold/40 disabled:cursor-not-allowed disabled:opacity-60";
const readonlyInputClasses = `${inputClasses} cursor-not-allowed bg-chalk/60 text-ink-soft`;
const labelClasses = "text-sm font-medium text-ink-soft";
const requiredLabelClasses = `${labelClasses} after:ml-0.5 after:text-marigold-dark after:content-['*']`;
const secondaryButtonClasses =
  "flex items-center justify-center gap-1.5 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-ink transition hover:bg-chalk disabled:cursor-not-allowed disabled:opacity-60";
const primaryButtonClasses =
  "flex items-center justify-center gap-1.5 rounded-md bg-marigold px-3 py-2 text-sm font-medium text-chalkboard transition hover:bg-marigold-dark disabled:cursor-not-allowed disabled:opacity-60";

interface FeeHeadRow {
  id: number;
  headName: string;
  amount: string;
  exempt: boolean;
  concession: string;
}

const EMPTY_FEE_ROWS: FeeHeadRow[] = [
  { id: 1, headName: "Admission Fee", amount: "0", exempt: false, concession: "0" },
  { id: 2, headName: "Monthly Tuition Fee", amount: "0", exempt: false, concession: "0" },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

/**
 * Everything here depends on the selected school + session, so it's rendered
 * with key={`${schId}:${sessionId}`} by the page below — switching either one
 * remounts it and resets the form instead of leaving stale data on screen.
 */
function NewAdmissionContent({ schId, sessionId }: { schId: string; sessionId: string }) {
  // ---- Find Registered Student ----
  const [regNo, setRegNo] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [foundRegistration, setFoundRegistration] = useState<RegisteredStudent | null>(null);

  async function handleSearch() {
    const trimmed = regNo.trim();
    if (!trimmed) {
      setSearchError("Enter a registration number first.");
      return;
    }
    setSearching(true);
    setSearchError(null);
    setFoundRegistration(null);
    try {
      const res = await schoolSettingService.getRegisteredStudentById(trimmed, schId);
      if (res.data) {
        setFoundRegistration(res.data);
      } else {
        setSearchError(res.message || `No registered student found with regno ${trimmed}.`);
      }
    } catch (err) {
      setSearchError(errorMessage(err, "Could not search for this student. Please try again."));
    } finally {
      setSearching(false);
    }
  }

  // ---- Class & Section (loaded from this school's assigned classes) ----
  const [schClasses, setSchClasses] = useState<SchClass[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [classesError, setClassesError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setClassesLoading(true);
    setClassesError(null);
    schoolSettingService
      .getSchClasses(schId)
      .then((res) => {
        if (!cancelled) setSchClasses(res.schClasses ?? []);
      })
      .catch((err) => {
        if (!cancelled) setClassesError(errorMessage(err, "Could not load classes for this school."));
      })
      .finally(() => {
        if (!cancelled) setClassesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [schId]);

  const [selectedClassID, setSelectedClassID] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [roll, setRoll] = useState("");
  const [admno, setAdmno] = useState("");
  const [admissionDate, setAdmissionDate] = useState(todayISO());

  const selectedSchClass = useMemo(
    () => schClasses.find((c) => c.classID._id === selectedClassID),
    [schClasses, selectedClassID]
  );

  function handleClassChange(classID: string) {
    setSelectedClassID(classID);
    setSelectedSectionId(""); // section list depends on the class, so reset it
  }

  // Fields that only exist as UI placeholders for now — the admission API
  // doesn't take these yet, so they aren't sent anywhere.
  const [stream, setStream] = useState("NA");
  const [group, setGroup] = useState("NA");

  // Fee Type and House both have real backend list endpoints (used elsewhere
  // in the app), so these are wired for real — just not sent by admitStudent.
  const [feeType, setFeeType] = useState("");
  const [feeTypeOptions, setFeeTypeOptions] = useState<string[]>([]);
  const [house, setHouse] = useState("");
  const [houseOptions, setHouseOptions] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    superAdminService
      .getFeePlanTypes(schId)
      .then((res) => {
        if (!cancelled) setFeeTypeOptions(res.feePlans.flatMap((p) => p.plan));
      })
      .catch(() => {
        /* non-critical for admission itself; leave the dropdown empty */
      });
    schoolSettingService
      .getSchHouse()
      .then((res) => {
        if (!cancelled) setHouseOptions([...new Set(res.schHouse.flatMap((h) => h.house))]);
      })
      .catch(() => {
        /* non-critical for admission itself; leave the dropdown empty */
      });
    return () => {
      cancelled = true;
    };
  }, [schId]);

  const [enableTransport, setEnableTransport] = useState(false);
  const [enableHostel, setEnableHostel] = useState(false);

  const [feeRows] = useState<FeeHeadRow[]>(EMPTY_FEE_ROWS);

  const totals = useMemo(() => {
    const admissionFee = Number(feeRows.find((r) => r.headName === "Admission Fee")?.amount || 0);
    const monthlyFee = feeRows
      .filter((r) => r.headName !== "Admission Fee")
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const totalConcession = feeRows.reduce((sum, r) => sum + Number(r.concession || 0), 0);
    const exempted = feeRows
      .filter((r) => r.exempt)
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);
    return { admissionFee, monthlyFee, totalConcession, exempted };
  }, [feeRows]);

  // ---- Save Admission ----
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const alreadyAdmitted = foundRegistration?.status === "admitted";
  const canSubmit = Boolean(foundRegistration) && !alreadyAdmitted;

  async function handleSaveAdmission() {
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!foundRegistration) {
      setSubmitError("Search and select a registered student first.");
      return;
    }
    if (!admno.trim()) {
      setSubmitError("Admission No is required.");
      return;
    }
    if (!selectedClassID || !selectedSectionId) {
      setSubmitError("Select both class and section.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await schoolSettingService.admitStudent({
        schId,
        regno: foundRegistration._id,
        admno: admno.trim(),
        session: sessionId,
        classID: selectedClassID,
        sectionId: selectedSectionId,
        rollNo: roll.trim() || undefined,
        admissionDate,
      });
      setSubmitSuccess(res.message || "Student admitted successfully.");
      setFoundRegistration({ ...foundRegistration, status: "admitted" as RegisteredStudent["status"] });
    } catch (err) {
      setSubmitError(errorMessage(err, "Could not save this admission. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <SectionCard title="Find Registered Student" icon={Search}>
        <div className="grid gap-3 sm:grid-cols-[2fr_auto]">
          <div className="space-y-1">
            <label htmlFor="regNo" className={labelClasses}>Registration No</label>
            <input
              id="regNo"
              value={regNo}
              onChange={(e) => setRegNo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Ex: 10071"
              className={inputClasses}
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={handleSearch}
              disabled={searching}
              className={`flex-1 sm:flex-none ${primaryButtonClasses}`}
            >
              {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              Search Student
            </button>
          </div>
        </div>

        {searchError && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-red-600">
            <AlertCircle size={13} /> {searchError}
          </p>
        )}
        {foundRegistration && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-emerald-700">
            <CheckCircle2 size={13} />
            Found {foundRegistration.sname} (regno {foundRegistration.regno}).
            {alreadyAdmitted && " This registration is already admitted."}
          </p>
        )}
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Student Details" icon={UserCircle}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className={labelClasses}>Student Name</label>
              <input readOnly value={foundRegistration?.sname ?? ""} placeholder="—" className={readonlyInputClasses} />
            </div>
            <div className="space-y-1">
              <label className={labelClasses}>Contact No</label>
              <input readOnly value={foundRegistration?.mob1 ?? ""} placeholder="—" className={readonlyInputClasses} />
            </div>
            <div className="space-y-1">
              <label className={labelClasses}>DOB</label>
              <input readOnly value={foundRegistration?.dob ?? ""} placeholder="—" className={readonlyInputClasses} />
            </div>
            <div className="space-y-1">
              <label className={labelClasses}>Email</label>
              <input readOnly value={foundRegistration?.email ?? ""} placeholder="—" className={readonlyInputClasses} />
            </div>
            <div className="space-y-1">
              <label className={labelClasses}>Father's Name</label>
              <input readOnly value={foundRegistration?.fname ?? ""} placeholder="—" className={readonlyInputClasses} />
            </div>
            <div className="space-y-1">
              <label className={labelClasses}>Mother's Name</label>
              <input readOnly value={foundRegistration?.mname ?? ""} placeholder="—" className={readonlyInputClasses} />
            </div>
            <div className="col-span-2 space-y-1">
              <label className={labelClasses}>Registration Date</label>
              <input
                readOnly
                value={foundRegistration?.registrationdate?.slice(0, 10) ?? ""}
                placeholder="—"
                className={readonlyInputClasses}
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Admission Class & Fee Type Selection" icon={GraduationCap}>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label htmlFor="admClass" className={requiredLabelClasses}>Class</label>
                <select
                  id="admClass"
                  value={selectedClassID}
                  onChange={(e) => handleClassChange(e.target.value)}
                  disabled={classesLoading}
                  className={inputClasses}
                >
                  <option value="">{classesLoading ? "Loading…" : "Select class"}</option>
                  {schClasses.map((c) => (
                    <option key={c.classID._id} value={c.classID._id}>
                      {c.classID.className}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="admSection" className={requiredLabelClasses}>Sec</label>
                <select
                  id="admSection"
                  value={selectedSectionId}
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                  disabled={!selectedSchClass}
                  className={inputClasses}
                >
                  <option value="">Select section</option>
                  {selectedSchClass?.sectionID.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.sectionName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="admRoll" className={labelClasses}>Roll</label>
                <input id="admRoll" value={roll} onChange={(e) => setRoll(e.target.value)} className={inputClasses} />
              </div>
            </div>
            {classesError && (
              <p className="flex items-center gap-1.5 text-xs text-red-600">
                <AlertCircle size={13} /> {classesError}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="admno" className={requiredLabelClasses}>Admission No</label>
                <input id="admno" value={admno} onChange={(e) => setAdmno(e.target.value)} placeholder="Ex: 2451" className={inputClasses} />
              </div>
              <div className="space-y-1">
                <label htmlFor="admDate" className={requiredLabelClasses}>Admission Date</label>
                <input id="admDate" type="date" value={admissionDate} onChange={(e) => setAdmissionDate(e.target.value)} className={inputClasses} />
              </div>
            </div>

            <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-3">
              <div className="space-y-1">
                <label htmlFor="feeType" className={labelClasses}>Fee Type</label>
                <select id="feeType" value={feeType} onChange={(e) => setFeeType(e.target.value)} className={inputClasses}>
                  <option value="">Select fee type</option>
                  {feeTypeOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="stream" className={labelClasses}>Stream</label>
                <select id="stream" value={stream} onChange={(e) => setStream(e.target.value)} className={inputClasses}>
                  <option value="NA">NA</option>
                  <option value="science">Science</option>
                  <option value="commerce">Commerce</option>
                  <option value="arts">Arts</option>
                </select>
              </div>
              <button type="button" className={secondaryButtonClasses} disabled>
                Add Subjects
              </button>
            </div>

            <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-3">
              <div className="space-y-1">
                <label htmlFor="house" className={labelClasses}>House</label>
                <select id="house" value={house} onChange={(e) => setHouse(e.target.value)} className={inputClasses}>
                  <option value="">Select house</option>
                  {houseOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="group" className={labelClasses}>Group</label>
                <select id="group" value={group} onChange={(e) => setGroup(e.target.value)} className={inputClasses}>
                  <option value="NA">NA</option>
                </select>
              </div>
              <button type="button" className={secondaryButtonClasses} disabled>
                Add Siblings
              </button>
            </div>
            <p className="text-xs text-ink-soft">
              Stream, Group and the buttons above aren't backed by an API yet — left as placeholders
              until those endpoints exist.
            </p>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Transport or Hostel Allotment" icon={Bus}>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-1.5 text-sm text-ink">
            <input type="checkbox" checked={enableTransport} onChange={(e) => setEnableTransport(e.target.checked)} className="h-3.5 w-3.5 accent-marigold" />
            Enable Transport
          </label>
          <label className="flex items-center gap-1.5 text-sm text-ink">
            <input type="checkbox" checked={enableHostel} onChange={(e) => setEnableHostel(e.target.checked)} className="h-3.5 w-3.5 accent-marigold" />
            Enable Hostel
          </label>
        </div>
        <p className="mt-3 text-xs text-ink-soft">Not backed by an API yet — left as a placeholder.</p>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <SectionCard title="Admission Fee Head / Monthly Fee Head" icon={Wallet}>
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
                    <th className="py-2 pr-3 font-medium">SNo</th>
                    <th className="py-2 pr-3 font-medium">Head Name</th>
                    <th className="py-2 pr-3 font-medium">Amount</th>
                    <th className="py-2 pr-3 font-medium">Exempt</th>
                    <th className="py-2 pr-3 font-medium">Cons.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {feeRows.map((row, index) => (
                    <tr key={row.id}>
                      <td className="py-2 pr-3">{index + 1}</td>
                      <td className="py-2 pr-3">{row.headName}</td>
                      <td className="py-2 pr-3">{row.amount}</td>
                      <td className="py-2 pr-3">{row.exempt ? "Yes" : "No"}</td>
                      <td className="py-2 pr-3">{row.concession}</td>
                    </tr>
                  ))}
                  <tr className="font-medium text-ink">
                    <td className="py-2 pr-3" colSpan={2}>Total</td>
                    <td className="py-2 pr-3">{totals.admissionFee + totals.monthlyFee}</td>
                    <td className="py-2 pr-3">{totals.exempted}</td>
                    <td className="py-2 pr-3">{totals.totalConcession}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="border-t border-line pt-3 text-xs text-ink-soft">
              Fee heads and amounts are generated automatically from the class's fee plan once admission is
              saved — this table is a read-only preview, not something submitted from here.
            </p>
          </div>
        </SectionCard>

        <SectionCard title="Final Payment Amount & Payment Modes" icon={Wallet}>
          <div className="space-y-4">
            <p className="text-xs text-ink-soft">
              Fee collection happens as a separate step after admission (via Fee Collection), so payment
              details aren't collected on this screen yet.
            </p>
            <div className="grid grid-cols-2 gap-3 opacity-60">
              <div className="space-y-1">
                <label className={labelClasses}>Payment Mode</label>
                <select disabled className={inputClasses}>
                  <option>By Cash</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className={labelClasses}>Ref No.</label>
                <input disabled placeholder="—" className={inputClasses} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-5 border-t border-line pt-3 opacity-60">
              <label className="flex items-center gap-1.5 text-sm text-ink-soft">
                <input type="checkbox" disabled className="h-3.5 w-3.5 accent-marigold" />
                <MessageSquare size={14} /> SMS
              </label>
              <label className="flex items-center gap-1.5 text-sm text-ink-soft">
                <input type="checkbox" disabled className="h-3.5 w-3.5 accent-marigold" />
                WhatsApp
              </label>
              <label className="flex items-center gap-1.5 text-sm text-ink-soft">
                <input type="checkbox" disabled className="h-3.5 w-3.5 accent-marigold" />
                <Mail size={14} /> Email
              </label>
            </div>

            <button
              type="button"
              onClick={handleSaveAdmission}
              disabled={!canSubmit || submitting}
              className={primaryButtonClasses}
            >
              {submitting ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Save Admission
            </button>

            {submitError && (
              <p className="flex items-center gap-1.5 text-xs text-red-600">
                <AlertCircle size={13} /> {submitError}
              </p>
            )}
            {submitSuccess && (
              <p className="flex items-center gap-1.5 text-xs text-emerald-700">
                <CheckCircle2 size={13} /> {submitSuccess}
              </p>
            )}
            {!foundRegistration && !submitError && (
              <p className="text-xs text-ink-soft">
                Search and find a registered student above before saving an admission.
              </p>
            )}
            {alreadyAdmitted && !submitError && (
              <p className="flex items-center gap-1.5 text-xs text-amber-700">
                <AlertCircle size={13} /> This student is already admitted — search a different, pending registration to admit them.
              </p>
            )}
          </div>
        </SectionCard>
      </div>
    </>
  );
}

function NewAdmissionPage() {
  const { selectedSchool } = useSelectedSchool();
  const { selectedSession } = useSelectedSession();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-marigold-dark">Student Management · Admission</p>
        <h1 className="mt-1 font-display text-2xl text-ink">New Admission</h1>
        {selectedSchool && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
            <School size={14} className="text-marigold-dark" />
            {selectedSchool.name}
          </p>
        )}
      </div>

      {selectedSchool && selectedSession ? (
        <NewAdmissionContent
          key={`${selectedSchool.id}:${selectedSession.id}`}
          schId={selectedSchool.id}
          sessionId={selectedSession.id}
        />
      ) : (
        <div className="rounded-lg border border-dashed border-line bg-white px-5 py-10 text-center">
          <School size={28} className="mx-auto text-marigold-dark" />
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

export default NewAdmissionPage;
