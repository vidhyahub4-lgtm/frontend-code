import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, IndianRupee, Loader2, School as SchoolIcon } from "lucide-react";
import { useSelectedSchool } from "../../hooks/useSelectedSchool";
import { useSelectedSession } from "../../hooks/useSelectedSession";
import { SectionCard } from "../../components/common/SectionCard";
import { feeService } from "../../services/fee.service";
import { superAdminService } from "../../services/superadmin.service";
import { ApiError } from "../../types/api.types";
import type { GenerateMonthlyDemandsData } from "../../types/fee.types";
import type { PayModeInstallment } from "../../types/superadmin.types";

const inputClasses =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-marigold/40";
const labelClasses = "text-sm font-medium text-ink-soft";
const ALL = "all";

interface ClassOption {
  id: string;
  name: string;
  installments: PayModeInstallment[];
}

interface FeeDemandContentProps {
  schId: string;
  sessionId: string;
  sessionName: string;
}

/** Keyed by school + session by the page below, so switching either remounts and refetches. */
function FeeDemandContent({ schId, sessionId, sessionName }: FeeDemandContentProps) {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [classId, setClassId] = useState("");
  const [monthNo, setMonthNo] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateMonthlyDemandsData | null>(null);
  // Synchronous lock against double clicks (state only updates after a re-render).
  const lock = useRef(false);

  useEffect(() => {
    superAdminService
      .getSchoolPayMode(schId, sessionName)
      .then((res) => {
        const byId = new Map<string, ClassOption>();
        (res.feeStructure ?? [])
          .filter((setup) => (typeof setup.schId === "string" ? setup.schId : setup.schId?._id) === schId)
          .flatMap((setup) => setup.feeStructure ?? [])
          .forEach((entry) => {
            if (!entry.class?._id) return;
            byId.set(entry.class._id, {
              id: entry.class._id,
              name: entry.class.className,
              installments: entry.installment ?? [],
            });
          });
        setClasses([...byId.values()]);
        setLoadError(null);
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Could not load classes."))
      .finally(() => setLoading(false));
  }, [schId, sessionName]);

  const classNameById = useMemo(() => new Map(classes.map((c) => [c.id, c.name])), [classes]);

  // Instalments of the chosen class; for "All Classes" the union of every class's months.
  const installments = useMemo(() => {
    const source = classId === ALL ? classes.flatMap((c) => c.installments) : (classes.find((c) => c.id === classId)?.installments ?? []);
    const byNo = new Map<number, PayModeInstallment>();
    source.forEach((i) => byNo.set(i.id, i));
    return [...byNo.values()].sort((a, b) => a.id - b.id);
  }, [classes, classId]);

  const selectedMonth = installments.find((i) => i.id === monthNo);
  const classLabel = classId === ALL ? "all classes" : (classNameById.get(classId) ?? "");

  function handleClassChange(value: string) {
    setClassId(value);
    setMonthNo(null);
    setResult(null);
    setError(null);
  }

  async function handleGenerate() {
    if (lock.current) return;
    if (!classId || monthNo === null) {
      setError("Select a class and an instalment.");
      return;
    }
    lock.current = true;
    setIsGenerating(true);
    setError(null);
    setResult(null);
    try {
      const res = await feeService.generateMonthlyDemands({
        schId,
        session: sessionId,
        ...(classId !== ALL ? { classID: classId } : {}),
        installmentMonthNo: monthNo,
      });
      setResult(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not generate demands. Please try again.");
    } finally {
      lock.current = false;
      setIsGenerating(false);
    }
  }

  const statClasses = "rounded-md border border-line bg-paper px-3 py-2";

  return (
    <SectionCard title="Generate Fee Demand" icon={IndianRupee}>
      {loading ? (
        <p className="flex items-center gap-1.5 text-sm text-ink-soft">
          <Loader2 size={14} className="animate-spin" /> Loading classes…
        </p>
      ) : loadError ? (
        <p role="alert" className="rounded-md bg-red-50 px-3.5 py-2 text-sm text-red-600">
          {loadError}
        </p>
      ) : classes.length === 0 ? (
        <p className="text-sm text-ink-soft">
          No class instalments are set up for session {sessionName}. Add them in Class PayMode Setup first.
        </p>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="fd-head" className={labelClasses}>Head Type</label>
              <select id="fd-head" value="monthly" disabled className={inputClasses}>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="fd-class" className={labelClasses}>Class</label>
              <select id="fd-class" value={classId} onChange={(e) => handleClassChange(e.target.value)} className={inputClasses}>
                <option value="">Select a class</option>
                <option value={ALL}>All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {classId && (
            <div className="space-y-2">
              <p className={labelClasses}>Installment</p>
              {installments.length === 0 ? (
                <p className="text-sm text-ink-soft">No instalments configured for this class.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                  {installments.map((i) => {
                    const active = monthNo === i.id;
                    return (
                      <button
                        key={i.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => {
                          setMonthNo(i.id);
                          setResult(null);
                          setError(null);
                        }}
                        className={`rounded-md border px-2 py-2 text-sm transition ${
                          active
                            ? "border-marigold bg-marigold/20 font-medium text-ink ring-2 ring-marigold/40"
                            : "border-line bg-white text-ink hover:border-marigold"
                        }`}
                      >
                        {i.installment}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {error && (
            <p role="alert" className="flex items-center gap-1.5 rounded-md bg-red-50 px-3.5 py-2 text-sm text-red-600">
              <AlertCircle size={14} /> {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || !classId || monthNo === null}
            aria-busy={isGenerating}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-marigold px-4 py-2 text-sm font-medium text-chalkboard transition hover:bg-marigold-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGenerating && <Loader2 size={14} className="animate-spin" />}
            {isGenerating
              ? "Generating…"
              : selectedMonth
                ? `Generate ${selectedMonth.installment} Demand`
                : "Generate Demand"}
          </button>
          {selectedMonth && !isGenerating && !result && (
            <p className="text-xs text-ink-soft">
              Creates {selectedMonth.installment} fee demands for every active student of {classLabel}. Demands that
              already exist are skipped, so running it again is safe.
            </p>
          )}

          {result && (
            <div role="status" className="space-y-3 rounded-lg border border-line bg-white p-4">
              <p className="flex items-center gap-1.5 text-sm font-medium text-green-700">
                <CheckCircle2 size={16} />
                {result.created > 0
                  ? "Fee demands generated."
                  : "Nothing new to create — demands were already generated."}
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <div className={statClasses}>
                  <p className="text-xs text-ink-soft">Active Students</p>
                  <p className="font-semibold text-ink">{result.students}</p>
                </div>
                <div className={statClasses}>
                  <p className="text-xs text-ink-soft">New Demands Created</p>
                  <p className="font-semibold text-ink">{result.created}</p>
                </div>
                <div className={statClasses}>
                  <p className="text-xs text-ink-soft">Skipped (No Fee Plan)</p>
                  <p className="font-semibold text-ink">{result.skippedNoFeePlan}</p>
                </div>
              </div>
              {result.skippedClasses.length > 0 && (
                <p className="text-xs text-amber-700">
                  No monthly fee plan for:{" "}
                  {result.skippedClasses.map((id) => classNameById.get(id) ?? id).join(", ")}
                </p>
              )}
              {result.notConfiguredForThisMonth.length > 0 && (
                <p className="text-xs text-amber-700">
                  This instalment is not configured for:{" "}
                  {result.notConfiguredForThisMonth.map((id) => classNameById.get(id) ?? id).join(", ")}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}

function FeeDemandPage() {
  const { selectedSchool } = useSelectedSchool();
  const { selectedSession } = useSelectedSession();

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-medium text-marigold-dark">School Setting · Fee Setting</p>
        <h1 className="mt-1 font-display text-2xl text-ink">Generate Fee Demand</h1>
        {selectedSchool && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
            <SchoolIcon size={14} className="text-marigold-dark" />
            {selectedSchool.name}
            {selectedSession && ` · Session ${selectedSession.name}`}
          </p>
        )}
      </div>

      {selectedSchool && selectedSession ? (
        <FeeDemandContent
          key={`${selectedSchool.id}:${selectedSession.id}`}
          schId={selectedSchool.id}
          sessionId={selectedSession.id}
          sessionName={selectedSession.name}
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

export default FeeDemandPage;
