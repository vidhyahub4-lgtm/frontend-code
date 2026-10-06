import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  GraduationCap,
  Loader2,
  Save,
  School,
  Search,
  UserCircle,
  Wallet,
} from "lucide-react";
import { SectionCard } from "../../components/common/SectionCard";
import { AdmissionFeeCollectionCard } from "../../components/studentmanagement/AdmissionFeeCollectionCard";
import { useSelectedSchool } from "../../hooks/useSelectedSchool";
import { useSelectedSession } from "../../hooks/useSelectedSession";
import { feeService } from "../../services/fee.service";
import { schoolSettingService } from "../../services/schoolSetting.service";
import { ApiError } from "../../types/api.types";
import { getClassApplyforId, getSectionApplyforId } from "../../lib/classApplyfor";
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
    setSelectedClassID("");
    setSelectedSectionId("");
    try {
      const res = await schoolSettingService.getRegisteredStudentById(trimmed, schId);
      if (res.data) {
        setFoundRegistration(res.data);
        // Pre-fill class/section chosen at registration (still editable).
        setSelectedClassID(getClassApplyforId(res.data.classApplyfor));
        setSelectedSectionId(getSectionApplyforId(res.data.classApplyfor));
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
  const [admissionDate, setAdmissionDate] = useState(todayISO());

  const selectedSchClass = useMemo(
    () => schClasses.find((c) => c.classID._id === selectedClassID),
    [schClasses, selectedClassID]
  );

  function handleClassChange(classID: string) {
    setSelectedClassID(classID);
    setSelectedSectionId(""); // section list depends on the class, so reset it
  }

  // ---- Save Admission ----
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Admission No is generated as "<current year>/<registration no>"
  // (regno 9 in 2026 -> "2026/9"). Not editable.
  const admno = foundRegistration
    ? `${new Date().getFullYear()}/${foundRegistration.regno}`
    : "";
  const alreadyAdmitted = foundRegistration?.status === "admitted";
  const canSubmit = Boolean(foundRegistration) && !alreadyAdmitted;

  // ---- Admission fee (shown once we know which StudentAdmission to collect
  // against — either straight from a fresh admit, or resolved below when the
  // registration turns out to already be admitted). ----
  const [feeStudentId, setFeeStudentId] = useState<string | null>(null);
  const [resolvingFeeStudent, setResolvingFeeStudent] = useState(false);
  const [resolveFeeError, setResolveFeeError] = useState<string | null>(null);

  // Any admission failure (409 already-admitted, network error, etc.) offers
  // this button so the front desk can still get to fee collection instead of
  // being stuck — most commonly the "already admitted, payment pending" case.
  async function handleGetAdmissionFee() {
    if (!foundRegistration) return;
    setResolveFeeError(null);
    setResolvingFeeStudent(true);
    try {
      const res = await feeService.getEnrollmentList(schId, sessionId);
      const match = res.data.find((row) => {
        const regnoId = typeof row.studentId.regno === "string" ? row.studentId.regno : row.studentId.regno?._id;
        return regnoId === foundRegistration._id;
      });
      if (!match) {
        setResolveFeeError(
          "This student's admission record wasn't found for the selected session. They may be admitted under a different session."
        );
        return;
      }
      setFeeStudentId(match.studentId._id);
    } catch (err) {
      setResolveFeeError(errorMessage(err, "Could not look up this student's admission record."));
    } finally {
      setResolvingFeeStudent(false);
    }
  }

  async function handleSaveAdmission() {
    setSubmitError(null);
    setSubmitSuccess(null);
    setFeeStudentId(null);
    setResolveFeeError(null);

    if (!foundRegistration) {
      setSubmitError("Search and select a registered student first.");
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
        admno,
        session: sessionId,
        classID: selectedClassID,
        sectionId: selectedSectionId,
        admissionDate,
      });
      setSubmitSuccess(res.message || "Student admitted successfully.");
      setFoundRegistration({ ...foundRegistration, status: "admitted" as RegisteredStudent["status"] });
      // The admit response already has the StudentAdmission _id — no need to
      // look it up separately for a fresh admission.
      if (res.data?.student?._id) setFeeStudentId(res.data.student._id);
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

        <SectionCard title="Admission Class Selection" icon={GraduationCap}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
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
            </div>
            {classesError && (
              <p className="flex items-center gap-1.5 text-xs text-red-600">
                <AlertCircle size={13} /> {classesError}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="admno" className={requiredLabelClasses}>Admission No</label>
                <input id="admno" value={admno} readOnly placeholder="Auto-generated after search" className={readonlyInputClasses} />
              </div>
              <div className="space-y-1">
                <label htmlFor="admDate" className={requiredLabelClasses}>Admission Date</label>
                <input id="admDate" type="date" value={admissionDate} onChange={(e) => setAdmissionDate(e.target.value)} className={inputClasses} />
              </div>
            </div>

          </div>
        </SectionCard>
      </div>

      <SectionCard title="Save Admission" icon={Save}>
        <div className="space-y-3">
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
              <div className="space-y-2">
                <p className="flex items-center gap-1.5 text-xs text-red-600">
                  <AlertCircle size={13} /> {submitError}
                </p>
                <button
                  type="button"
                  onClick={handleGetAdmissionFee}
                  disabled={resolvingFeeStudent}
                  className={secondaryButtonClasses}
                >
                  {resolvingFeeStudent ? <Loader2 size={14} className="animate-spin" /> : <Wallet size={14} />}
                  Get Admission Fee
                </button>
                {resolveFeeError && (
                  <p className="flex items-center gap-1.5 text-xs text-red-600">
                    <AlertCircle size={13} /> {resolveFeeError}
                  </p>
                )}
              </div>
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
              <div className="space-y-2">
                <p className="flex items-center gap-1.5 text-xs text-amber-700">
                  <AlertCircle size={13} /> This student is already admitted. If their admission fee is still pending, collect it below.
                </p>
                {!feeStudentId && (
                  <button
                    type="button"
                    onClick={handleGetAdmissionFee}
                    disabled={resolvingFeeStudent}
                    className={secondaryButtonClasses}
                  >
                    {resolvingFeeStudent ? <Loader2 size={14} className="animate-spin" /> : <Wallet size={14} />}
                    Get Admission Fee
                  </button>
                )}
                {resolveFeeError && (
                  <p className="flex items-center gap-1.5 text-xs text-red-600">
                    <AlertCircle size={13} /> {resolveFeeError}
                  </p>
                )}
              </div>
            )}
          </div>
        </SectionCard>

      {feeStudentId && (
        <AdmissionFeeCollectionCard
          studentId={feeStudentId}
          schId={schId}
          sessionId={sessionId}
          studentName={foundRegistration?.sname}
        />
      )}
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
