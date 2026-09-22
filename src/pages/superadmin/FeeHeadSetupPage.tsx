import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ListChecks, Plus, School } from "lucide-react";
import { SectionCard } from "../../components/common/SectionCard";
import { EntityTable } from "../../components/common/EntityTable";
import { useEntityCrud } from "../../hooks/useEntityCrud";
import { useSelectedSchool } from "../../hooks/useSelectedSchool";
import { useSelectedSession } from "../../hooks/useSelectedSession";
import { superAdminService } from "../../services/superadmin.service";
import { FEE_HEAD_TYPES } from "../../types/superadmin.types";
import type {
  CreateFeeHeadSetupRequest,
  FeeHeadSetup,
  FeeHeadType,
  FeePlanType,
} from "../../types/superadmin.types";

const inputClasses =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-marigold/40";
const labelClasses = "text-sm font-medium text-ink-soft";

interface FeeHeadRow {
  key: string;
  feehead: string;
  headtype: FeeHeadType;
  session: string;
}

/**
 * Everything that depends on the selected school. Rendered with key={schId}
 * by the page below, so switching school remounts it and refetches
 * (useEntityCrud only fetches once on mount).
 */
function FeeHeadSetupContent({
  schId,
  sessionName,
}: {
  schId: string;
  sessionName: string;
}) {
  const {
    items: feeHeadDocs,
    isLoading,
    loadError,
    isCreating,
    createError,
    createEntity,
  } = useEntityCrud<FeeHeadSetup, CreateFeeHeadSetupRequest>({
    fetchList: () => superAdminService.getFeeHeadSetups(schId).then((res) => res.feeHeads ?? []),
    create: (payload) => superAdminService.createFeeHeadSetup(payload),
  });

  // Backend stores one document per (headtype + session) with a `feehead`
  // array — flatten to one table row per fee head.
  const rows = useMemo<FeeHeadRow[]>(
    () =>
      feeHeadDocs.flatMap((doc) =>
        doc.feehead.map((name) => ({
          key: `${doc._id}-${name}`,
          feehead: name,
          headtype: doc.headtype,
          session: doc.session,
        }))
      ),
    [feeHeadDocs]
  );

  // The Fee Head dropdown offers the plans created for this school on the
  // Fee Plan Type page (same API, same per-school `plan` array).
  const {
    items: feePlanDocs,
    isLoading: plansLoading,
    loadError: plansError,
  } = useEntityCrud<FeePlanType, never>({
    fetchList: () => superAdminService.getFeePlanTypes(schId).then((res) => res.feePlans ?? []),
    create: () => Promise.resolve(),
  });

  const planNames = useMemo(
    () => Array.from(new Set(feePlanDocs.flatMap((doc) => doc.plan))),
    [feePlanDocs]
  );

  const [headtype, setHeadtype] = useState<FeeHeadType | "">("");
  const [feehead, setFeehead] = useState("");

  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  // Hide plans already added for the chosen head type + session, so a
  // duplicate can't even be picked.
  const availablePlans = useMemo(() => {
    if (!headtype || !sessionName) return planNames;
    const used = new Set(
      rows
        .filter((row) => row.headtype === headtype && row.session === sessionName)
        .map((row) => row.feehead.toLowerCase())
    );
    return planNames.filter((name) => !used.has(name.toLowerCase()));
  }, [planNames, rows, headtype, sessionName]);

  const canAdd = Boolean(headtype && sessionName && feehead.trim());

  const feeHeadPlaceholder = plansLoading
    ? "Loading plans…"
    : plansError
    ? "Could not load plans"
    : planNames.length === 0
    ? "No fee plans found"
    : availablePlans.length === 0
    ? "All plans already added"
    : "Select a fee head";

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = feehead.trim();
    if (!headtype || !sessionName || !name) return;

    // The backend silently ignores duplicates (returns 201 with no change),
    // so we check here to give the user real feedback.
    const isDuplicate = rows.some(
      (row) =>
        row.headtype === headtype &&
        row.session === sessionName &&
        row.feehead.toLowerCase() === name.toLowerCase()
    );
    if (isDuplicate) {
      setDuplicateError(`"${name}" already exists for ${headtype} · ${sessionName}.`);
      return;
    }

    setDuplicateError(null);
    const ok = await createEntity({ headtype, session: sessionName, feehead: name, schId });
    if (ok) setFeehead("");
  }

  const formError = duplicateError ?? createError;

  return (
    <SectionCard title="Fee Head Setup" icon={ListChecks}>
      <form onSubmit={handleAdd} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <label htmlFor="fh-head-type" className={labelClasses}>
              Head Type
            </label>
            <select
              id="fh-head-type"
              value={headtype}
              onChange={(e) => {
                setHeadtype(e.target.value as FeeHeadType);
                setFeehead("");
                setDuplicateError(null);
              }}
              className={inputClasses}
            >
              <option value="">Select head type</option>
              {FEE_HEAD_TYPES.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className={labelClasses}>Session</label>
            <div className={`${inputClasses} cursor-not-allowed bg-chalk/60 text-ink`}>{sessionName}</div>
          </div>

          <div className="space-y-1">
            <label htmlFor="fh-fee-head" className={labelClasses}>
              Fee Head
            </label>
            <select
              id="fh-fee-head"
              value={feehead}
              onChange={(e) => {
                setFeehead(e.target.value);
                setDuplicateError(null);
              }}
              className={inputClasses}
              disabled={plansLoading || Boolean(plansError) || availablePlans.length === 0}
            >
              <option value="">{feeHeadPlaceholder}</option>
              {availablePlans.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            {!plansLoading && !plansError && planNames.length === 0 && (
              <p className="text-xs text-ink-soft">
                Add plans first from{" "}
                <Link
                  to="/superadmin/fee-setting/fee-plan-type"
                  className="font-medium text-marigold-dark hover:underline"
                >
                  Fee Plan Type
                </Link>
                .
              </p>
            )}
          </div>
        </div>

        {formError && (
          <p role="alert" className="rounded-md bg-red-50 px-3.5 py-2 text-sm text-red-600">
            {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={!canAdd || isCreating}
          className="flex items-center justify-center gap-1.5 rounded-md bg-marigold px-4 py-2 text-sm font-medium text-chalkboard transition hover:bg-marigold-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus size={15} />
          {isCreating ? "Adding…" : "Add Head"}
        </button>
      </form>

      <div className="mt-5 border-t border-line pt-4">
        <EntityTable<FeeHeadRow>
          items={rows}
          isLoading={isLoading}
          error={loadError}
          emptyLabel="No fee heads added yet."
          getRowKey={(item) => item.key}
          columns={[
            { header: "Fee Head", render: (item) => <span className="font-medium">{item.feehead}</span> },
            { header: "Head Type", render: (item) => item.headtype },
            { header: "Session", render: (item) => item.session },
          ]}
        />
      </div>
    </SectionCard>
  );
}

function FeeHeadSetupPage() {
  const { selectedSchool } = useSelectedSchool();
  const { selectedSession } = useSelectedSession();

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-medium text-marigold-dark">Super Admin · Fee Setting</p>
        <h1 className="mt-1 font-display text-2xl text-ink">Fee Head Setup</h1>
        {selectedSchool && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
            <School size={14} className="text-marigold-dark" />
            {selectedSchool.name}
            {selectedSession && <span className="text-line">·</span>}
            {selectedSession && selectedSession.name}
          </p>
        )}
      </div>

      {selectedSchool && selectedSession ? (
        <FeeHeadSetupContent
          key={`${selectedSchool.id}:${selectedSession.id}`}
          schId={selectedSchool.id}
          sessionName={selectedSession.name}
        />
      ) : (
        <div className="rounded-lg border border-dashed border-line bg-white px-5 py-10 text-center">
          <School size={28} className="mx-auto text-marigold-dark" />
          <p className="mt-3 font-display text-lg text-ink">
            {!selectedSchool ? "No school selected" : "No session selected"}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            Use the settings icon at the top right to select a school and session first.
          </p>
        </div>
      )}
    </div>
  );
}

export default FeeHeadSetupPage;
