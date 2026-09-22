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
  "w-full rounded-md border border-line bg-white px-2 py-1.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-marigold/40";

/** One table row: a single fee head (e.g. "admission") under a head type (e.g. "admission"). */
interface HeadRow {
  key: string;
  headType: FeePlanHeadType;
  feetype: string;
}

/**
 * All of this depends on the selected school + session, so it is rendered
 * with key={`${schId}:${sessionId}`} by the page below — switching either
 * one remounts it and refetches.
 */
function FeePlanMatrix({
  schId,
  sessionId,
  sessionName,
}: {
  schId: string;
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

  // Rows = every fee head created (Fee Head Setup page) for this session,
  // grouped in the order they were added. This is what makes a new fee head
  // show up here automatically.
  const rows = useMemo<HeadRow[]>(() => {
    const seen = new Set<string>();
    const list: HeadRow[] = [];
    feeHeadDocs
      .filter((doc) => doc.session === sessionName)
      .forEach((doc) => {
        doc.feehead.forEach((name) => {
          const key = `${doc.headtype}::${name}`;
          if (!seen.has(key)) {
            seen.add(key);
            list.push({ key, headType: doc.headtype as FeePlanHeadType, feetype: name });
          }
        });
      });
    return list;
  }, [feeHeadDocs, sessionName]);

  // amounts[rowKey][classId] = amount (as a string, for controlled inputs)
  const [amounts, setAmounts] = useState<Record<string, Record<string, string>>>({});

  // Seed amounts from what's already saved, whenever the loaded data changes.
  useEffect(() => {
    const next: Record<string, Record<string, string>> = {};
    existingPlans
      .filter((plan) => plan.session._id === sessionId)
      .forEach((plan) => {
        plan.classes.forEach((cls) => {
          cls.heads.forEach((head) => {
            const key = `${plan.headType}::${head.feetype}`;
            next[key] ??= {};
            next[key][cls.classID._id] = String(head.amount);
          });
        });
      });
    setAmounts(next);
  }, [existingPlans, sessionId]);

  function setAmount(rowKey: string, classId: string, value: string) {
    setAmounts((prev) => ({ ...prev, [rowKey]: { ...prev[rowKey], [classId]: value } }));
  }

  function amountFor(rowKey: string, classId: string): string {
    return amounts[rowKey]?.[classId] ?? "";
  }

  const classTotal = (classId: string) =>
    rows.reduce((sum, row) => sum + (Number(amountFor(row.key, classId)) || 0), 0);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  async function handleSaveAll() {
    if (rows.length === 0 || classes.length === 0) return;
    setIsSaving(true);
    setSaveError(null);
    setSaveMessage(null);

    // The API takes one headType per call, so group the rows and fire one
    // request per head type. Every class is sent (even with 0 amounts) so
    // saved data always reflects the full grid. A head type already saved
    // for this school+session is PATCHed instead of re-created.
    const headTypes = Array.from(new Set(rows.map((r) => r.headType)));
    const existingByHeadType = new Map(
      existingPlans.filter((p) => p.session._id === sessionId).map((p) => [p.headType, p._id])
    );
    try {
      for (const headType of headTypes) {
        const rowsForType = rows.filter((r) => r.headType === headType);
        const classesPayload: CreateFeePlanSetupClassEntry[] = classes.map((c) => ({
          classID: c._id,
          heads: rowsForType.map((row) => ({
            feetype: row.feetype,
            amount: Number(amountFor(row.key, c._id)) || 0,
          })),
        }));
        const existingPlanId = existingByHeadType.get(headType);
        if (existingPlanId) {
          await schoolSettingService.updateFeePlanSetup(existingPlanId, {
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
      }
      setSaveMessage("Fee plan saved.");
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Could not save fee plan.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading || classesLoading) {
    return <p className="px-1 py-6 text-center text-sm text-ink-soft">Loading fee plan…</p>;
  }
  if (loadError) {
    return <p className="px-1 py-6 text-center text-sm text-red-600">{loadError}</p>;
  }
  if (rows.length === 0) {
    return (
      <p className="px-1 py-6 text-center text-sm text-ink-soft">
        No fee heads set up for this session yet. Add some from Fee Head Setup first.
      </p>
    );
  }
  if (classes.length === 0) {
    return (
      <p className="px-1 py-6 text-center text-sm text-ink-soft">
        No classes found — add one from Essential Setting.
      </p>
    );
  }

  return (
    <div className="space-y-4">
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
            {rows.map((row, idx) => (
              <tr key={row.key}>
                <td className="py-2 px-3 text-ink-soft">{idx + 1}</td>
                <td className="py-2 px-3 font-medium capitalize">{row.feetype}</td>
                {classes.map((c) => (
                  <td key={c._id} className="py-1.5 px-2">
                    <input
                      type="number"
                      min={0}
                      value={amountFor(row.key, c._id)}
                      onChange={(e) => setAmount(row.key, c._id, e.target.value)}
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
        onClick={handleSaveAll}
        disabled={isSaving}
        className="flex items-center justify-center gap-1.5 rounded-md bg-marigold px-4 py-2 text-sm font-medium text-chalkboard transition hover:bg-marigold-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Save size={15} />
        {isSaving ? "Saving…" : "Save Fee Plan"}
      </button>
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
        {selectedSchool && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
            <SchoolIcon size={14} className="text-marigold-dark" />
            {selectedSchool.name}
            {selectedSession && <span className="text-line">·</span>}
            {selectedSession && selectedSession.name}
          </p>
        )}
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
          <FeePlanMatrix
            key={`${selectedSchool.id}:${selectedSession.id}`}
            schId={selectedSchool.id}
            sessionId={selectedSession.id}
            sessionName={selectedSession.name}
          />
        </SectionCard>
      )}
    </div>
  );
}

export default FeePlanSetupPage;
