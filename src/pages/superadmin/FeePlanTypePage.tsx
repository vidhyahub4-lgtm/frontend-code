import { useMemo, useState, type FormEvent } from "react";
import { FileText, Plus, School } from "lucide-react";
import { SectionCard } from "../../components/common/SectionCard";
import { EntityTable } from "../../components/common/EntityTable";
import { useEntityCrud } from "../../hooks/useEntityCrud";
import { useSelectedSchool } from "../../hooks/useSelectedSchool";
import { superAdminService } from "../../services/superadmin.service";
import type { CreateFeePlanTypeRequest, FeePlanType } from "../../types/superadmin.types";

const inputClasses =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-marigold/40";
const labelClasses = "text-sm font-medium text-ink-soft";

interface PlanRow {
  key: string;
  name: string;
}

/**
 * The list/create calls are scoped to one school, and useEntityCrud only
 * fetches once on mount. So this component is rendered with key={schId} by
 * the page below: switching school remounts it and triggers a fresh fetch.
 */
function FeePlanTypeContent({ schId }: { schId: string }) {
  const {
    items: feePlanDocs,
    isLoading,
    loadError,
    isCreating,
    createError,
    createEntity,
  } = useEntityCrud<FeePlanType, CreateFeePlanTypeRequest>({
    fetchList: () => superAdminService.getFeePlanTypes(schId).then((res) => res.feePlans ?? []),
    create: (payload) => superAdminService.createFeePlanType(payload),
  });

  const [plan, setPlan] = useState("");
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  // Backend stores one document per school with a `plan` array — flatten to rows.
  const rows = useMemo<PlanRow[]>(
    () =>
      feePlanDocs.flatMap((doc) =>
        doc.plan.map((name) => ({ key: `${doc._id}-${name}`, name }))
      ),
    [feePlanDocs]
  );

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = plan.trim();
    if (!name) return;

    // The backend silently ignores duplicates (returns 201 with no change),
    // so we check here to give the user real feedback.
    if (rows.some((row) => row.name.toLowerCase() === name.toLowerCase())) {
      setDuplicateError(`"${name}" already exists for this school.`);
      return;
    }

    setDuplicateError(null);
    const ok = await createEntity({ plan: name, schId });
    if (ok) setPlan("");
  }

  const formError = duplicateError ?? createError;

  return (
    <SectionCard title="Fee Plan Type" icon={FileText}>
      <form onSubmit={handleAdd} className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <label htmlFor="fp-plan" className={labelClasses}>
              Plan
            </label>
            <input
              id="fp-plan"
              value={plan}
              onChange={(e) => {
                setPlan(e.target.value);
                setDuplicateError(null);
              }}
              placeholder="e.g. Monthly Plan"
              className={inputClasses}
            />
          </div>
          <button
            type="submit"
            disabled={isCreating || !plan.trim()}
            className="flex items-center justify-center gap-1.5 rounded-md bg-marigold px-4 py-2 text-sm font-medium text-chalkboard transition hover:bg-marigold-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus size={15} />
            {isCreating ? "Adding…" : "Add"}
          </button>
        </div>
        {formError && (
          <p role="alert" className="rounded-md bg-red-50 px-3.5 py-2 text-sm text-red-600">
            {formError}
          </p>
        )}
      </form>

      <div className="mt-5 border-t border-line pt-4">
        <EntityTable<PlanRow>
          items={rows}
          isLoading={isLoading}
          error={loadError}
          emptyLabel="No fee plan types added yet."
          getRowKey={(item) => item.key}
          columns={[{ header: "Plan", render: (item) => <span className="font-medium">{item.name}</span> }]}
        />
      </div>
    </SectionCard>
  );
}

function FeePlanTypePage() {
  const { selectedSchool } = useSelectedSchool();

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-medium text-marigold-dark">Super Admin · Fee Setting</p>
        <h1 className="mt-1 font-display text-2xl text-ink">Fee Plan Type</h1>
        {selectedSchool && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
            <School size={14} className="text-marigold-dark" />
            {selectedSchool.name}
          </p>
        )}
      </div>

      {selectedSchool ? (
        <FeePlanTypeContent key={selectedSchool.id} schId={selectedSchool.id} />
      ) : (
        <div className="rounded-lg border border-dashed border-line bg-white px-5 py-10 text-center">
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

export default FeePlanTypePage;
