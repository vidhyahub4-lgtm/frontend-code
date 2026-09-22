import { useEffect, useMemo, useState } from "react";
import { FileText, Save, School as SchoolIcon } from "lucide-react";
import { SectionCard } from "../../components/common/SectionCard";
import { useEntityCrud } from "../../hooks/useEntityCrud";
import { useSelectedSchool } from "../../hooks/useSelectedSchool";
import { useSelectedSession } from "../../hooks/useSelectedSession";
import { superAdminService } from "../../services/superadmin.service";
import { schoolSettingService } from "../../services/schoolSetting.service";
import { ApiError } from "../../types/api.types";
import type {
  CreateFeePlanSetupClassEntry,
  FeeHeadSetup,
  FeePlanHeadType,
  FeePlanSetup,
  SchoolClass,
} from "../../types/superadmin.types";

const inputClasses =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-marigold/40";
const labelClasses = "text-sm font-medium text-ink-soft";
const readOnlyChipClasses = `${inputClasses} cursor-not-allowed bg-chalk/60 text-ink`;

/**
 * Everything here depends on the selected school + session, so it is
 * rendered with key={`${schId}:${sessionId}`} by the page below — switching
 * either one remounts it and refetches.
 */
function FeePlanEditor({
  schId,
  schoolName,
  sessionId,
  sessionName,
}: {
  schId: string;
  schoolName: string;
  sessionId: string;
  sessionName: string;
}) {
  const { items: classes, isLoading: classesLoading } = useEntityCrud<SchoolClass, never>({
    fetchList: () => superAdminService.getClasses().then((res) => res.classes ?? []),
    create: () => Promise.resolve(),
  });

  const [feeHeadDocs, setFeeHeadDocs] = useState<FeeHeadSetup[]>([]);
  const [existingPlans, setExistingPlans] = useState<FeePlanSetup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      superAdminService.getFeeHeadSetups(schId),
      schoolSettingService.getFeePlanSetups(schId),
    ])
      .then(([heads, plans]) => {
        if (cancelled) return;
        setFeeHeadDocs(heads.feeHeads ?? []);
        setExistingPlans(plans.data ?? []);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : "Could not load fee plan data.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [schId]);

  // Head types available to pick from: whatever has fee heads set up for this session.
  const headTypeOptions = useMemo(
    () =>
      Array.from(
        new Set(
          feeHeadDocs.filter((doc) => doc.session === sessionName).map((doc) => doc.headtype)
        )
      ) as FeePlanHeadType[],
    [feeHeadDocs, sessionName]
  );

  const [headType, setHeadType] = useState<FeePlanHeadType | "">("");
  useEffect(() => {
    // Keep the picked head type valid as the options change; default to the first one.
    if (headType && headTypeOptions.includes(headType)) return;
    setHeadType(headTypeOptions[0] ?? "");
  }, [headTypeOptions, headType]);

  // Rows = the fee heads under the selected head type (e.g. "admission", "smart erp").
  const feetypes = useMemo(
    () =>
      Array.from(
        new Set(
          feeHeadDocs
            .filter((doc) => doc.session === sessionName && doc.headtype === headType)
            .flatMap((doc) => doc.feehead)
        )
      ),
    [feeHeadDocs, sessionName, headType]
  );

  // The plan already saved for this school+session+headType, if any.
  const existingPlan = useMemo(
    () => existingPlans.find((p) => p.session._id === sessionId && p.headType === headType),
    [existingPlans, sessionId, headType]
  );

  // amounts[feetype][classId] = amount (string, for controlled inputs)
  const [amounts, setAmounts] = useState<Record<string, Record<string, string>>>({});

  useEffect(() => {
    const next: Record<string, Record<string, string>> = {};
    existingPlan?.classes.forEach((cls) => {
      cls.heads.forEach((head) => {
        next[head.feetype] ??= {};
        next[head.feetype][cls.classID._id] = String(head.amount);
      });
    });
    setAmounts(next);
  }, [existingPlan]);

  function setAmount(feetype: string, classId: string, value: string) {
    setAmounts((prev) => ({ ...prev, [feetype]: { ...prev[feetype], [classId]: value } }));
  }
  function amountFor(feetype: string, classId: string): string {
    return amounts[feetype]?.[classId] ?? "";
  }
  const classTotal = (classId: string) =>
    feetypes.reduce((sum, feetype) => sum + (Number(amountFor(feetype, classId)) || 0), 0);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  async function handleSave() {
    if (!headType || feetypes.length === 0 || classes.length === 0) return;
    setIsSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    try {
      const classesPayload: CreateFeePlanSetupClassEntry[] = classes.map((c) => ({
        classID: c._id,
        heads: feetypes.map((feetype) => ({
          feetype,
          amount: Number(amountFor(feetype, c._id)) || 0,
        })),
      }));

      if (existingPlan) {
        await schoolSettingService.updateFeePlanSetup(existingPlan._id, {
          headType,
          schId,
          classes: classesPayload,
        });
      } else {
        await schoolSettingService.createFeePlanSetup({
          schId,
          session: sessionId,
          headType,
          classes: classesPayload,
        });
        // Refresh so the next save for this headType updates instead of re-creating.
        const plans = await schoolSettingService.getFeePlanSetups(schId);
        setExistingPlans(plans.data ?? []);
      }
      setSaveMessage("Fee plan saved.");
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Could not save fee plan.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1">
          <label className={labelClasses}>Select School</label>
          <div className={readOnlyChipClasses}>{schoolName}</div>
        </div>
        <div className="space-y-1">
          <label htmlFor="fps-head-type" className={labelClasses}>
            Select Head Type
          </label>
          <select
            id="fps-head-type"
            value={headType}
            onChange={(e) => setHeadType(e.target.value as FeePlanHeadType)}
            className={inputClasses}
            disabled={isLoading || headTypeOptions.length === 0}
          >
            {headTypeOptions.length === 0 ? (
              <option value="">
                {isLoading ? "Loading…" : "No fee heads set up — add some from Fee Head Setup"}
              </option>
            ) : (
              headTypeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))
            )}
          </select>
        </div>
        <div className="space-y-1">
          <label className={labelClasses}>Session</label>
          <div className={readOnlyChipClasses}>{sessionName}</div>
        </div>
      </div>

      {isLoading || classesLoading ? (
        <p className="px-1 py-6 text-center text-sm text-ink-soft">Loading fee plan…</p>
      ) : loadError ? (
        <p className="px-1 py-6 text-center text-sm text-red-600">{loadError}</p>
      ) : classes.length === 0 ? (
        <p className="px-1 py-6 text-center text-sm text-ink-soft">
          No classes found — add one from Essential Setting.
        </p>
      ) : !headType ? null : feetypes.length === 0 ? (
        <p className="px-1 py-6 text-center text-sm text-ink-soft">
          No fee heads under "{headType}" for this session.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border border-line">
            <table className="w-full min-w-max text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-cream/40 text-xs uppercase tracking-wide text-ink-soft">
                  <th className="py-2 px-3 font-medium">SlNo</th>
                  <th className="py-2 px-3 font-medium">Head Name</th>
                  {classes.map((c) => (
                    <th key={c._id} className="py-2 px-3 text-center font-medium">
                      {c.className}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {feetypes.map((feetype, idx) => (
                  <tr key={feetype}>
                    <td className="py-2 px-3 text-ink-soft">{idx + 1}</td>
                    <td className="py-2 px-3 font-medium capitalize">{feetype}</td>
                    {classes.map((c) => (
                      <td key={c._id} className="py-1.5 px-2">
                        <input
                          type="number"
                          min={0}
                          value={amountFor(feetype, c._id)}
                          onChange={(e) => setAmount(feetype, c._id, e.target.value)}
                          placeholder="0"
                          className={`${inputClasses} w-24`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="bg-cream/40 font-medium">
                  <td className="py-2 px-3" colSpan={2}>
                    Total
                  </td>
                  {classes.map((c) => (
                    <td key={c._id} className="py-2 px-3 text-center">
                      {classTotal(c._id)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {saveError && (
            <p role="alert" className="rounded-md bg-red-50 px-3.5 py-2 text-sm text-red-600">
              {saveError}
            </p>
          )}
          {saveMessage && (
            <p role="status" className="rounded-md bg-green-50 px-3.5 py-2 text-sm text-green-700">
              {saveMessage}
            </p>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center justify-center gap-1.5 rounded-md bg-marigold px-4 py-2 text-sm font-medium text-chalkboard transition hover:bg-marigold-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={15} />
            {isSaving ? "Saving…" : "Save Fee Plan"}
          </button>
        </>
      )}
    </div>
  );
}

function FeePlanSetupPage() {
  const { selectedSchool } = useSelectedSchool();
  const { selectedSession } = useSelectedSession();

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-medium text-marigold-dark">School Setting · Fee Setting</p>
        <h1 className="mt-1 font-display text-2xl text-ink">Fee Plan Setup</h1>
      </div>

      {!selectedSchool || !selectedSession ? (
        <div className="rounded-lg border border-dashed border-line bg-white px-5 py-10 text-center">
          <SchoolIcon size={28} className="mx-auto text-marigold-dark" />
          <p className="mt-3 font-display text-lg text-ink">
            {!selectedSchool ? "No school selected" : "No session selected"}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            Use the settings icon at the top right to select a school and session first.
          </p>
        </div>
      ) : (
        <SectionCard title="Fee Plan Setup" icon={FileText}>
          <FeePlanEditor
            key={`${selectedSchool.id}:${selectedSession.id}`}
            schId={selectedSchool.id}
            schoolName={selectedSchool.name}
            sessionId={selectedSession.id}
            sessionName={selectedSession.name}
          />
        </SectionCard>
      )}
    </div>
  );
}

export default FeePlanSetupPage;
