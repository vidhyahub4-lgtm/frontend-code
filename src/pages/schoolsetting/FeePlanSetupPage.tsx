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
    // Only the classes THIS school has selected (not the global class list).
    fetchList: () =>
      schoolSettingService.getSchClasses(schId).then((res) => {
        const byId = new Map<string, SchoolClass>();
        (res.schClasses ?? []).forEach((sc) => {
          if (!byId.has(sc.classID._id)) {
            byId.set(sc.classID._id, {
              _id: sc.classID._id,
              className: sc.classID.className,
              classInWord: sc.classID.classInWord,
            });
          }
        });
        return Array.from(byId.values());
      }),
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
        // A plan already exists for this school+session+headType. Call POST
        // first: it's safe to call again on an existing plan — it syncs in
        // any class or fee head added *after* the plan was created (e.g. a
        // new class) instead of erroring, which the PATCH below does not
        // handle on its own. Then PATCH pushes the amounts actually edited
        // in this save.
        const synced = await schoolSettingService.createFeePlanSetup({
          schId,
          session: sessionId,
          headType,
          classes: classesPayload,
        });
        await schoolSettingService.updateFeePlanSetup(synced.data._id, {
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
      }
      // Refresh so a newly-created plan's next save updates instead of
      // re-creating, and so newly-synced classes show up immediately.
      const plans = await schoolSettingService.getFeePlanSetups(schId);
      setExistingPlans(plans.data ?? []);
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
          <div className="overflow-hidden rounded-lg border border-line shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-max border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-marigold/10 text-xs font-semibold uppercase tracking-wide text-marigold-dark">
                    <th className="py-3 px-4 whitespace-nowrap">Sl No</th>
                    <th className="py-3 px-4 whitespace-nowrap">Head Name</th>
                    {classes.map((c) => (
                      <th key={c._id} className="py-3 px-4 text-center whitespace-nowrap" title={c.classInWord}>
                        Class {c.className}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {feetypes.map((feetype, idx) => (
                    <tr
                      key={feetype}
                      className={idx % 2 === 1 ? "bg-cream/30" : "bg-white"}
                    >
                      <td className="py-2.5 px-4 text-ink-soft">{idx + 1}</td>
                      <td className="py-2.5 px-4 font-medium capitalize text-ink">{feetype}</td>
                      {classes.map((c) => (
                        <td key={c._id} className="py-2 px-2.5">
                          <input
                            type="number"
                            min={0}
                            value={amountFor(feetype, c._id)}
                            onChange={(e) => setAmount(feetype, c._id, e.target.value)}
                            placeholder="0"
                            className="w-24 rounded-md border border-line bg-white px-2.5 py-1.5 text-center text-sm text-ink transition focus:outline-none focus:ring-2 focus:ring-marigold/40 mx-auto block"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-marigold/30 bg-marigold/10 font-semibold text-ink">
                    <td className="py-3 px-4" colSpan={2}>
                      Total
                    </td>
                    {classes.map((c) => (
                      <td key={c._id} className="py-3 px-4 text-center text-marigold-dark">
                        ₹{classTotal(c._id)}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
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
