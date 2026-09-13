import { useState, type FormEvent } from "react";
import { FileText, Plus } from "lucide-react";
import { SectionCard } from "../../components/common/SectionCard";
import { EntityTable } from "../../components/common/EntityTable";
import { useEntityCrud } from "../../hooks/useEntityCrud";
import { superAdminService } from "../../services/superadmin.service";
import type { FeePlanType } from "../../types/superadmin.types";

const inputClasses =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-marigold/40";
const labelClasses = "text-sm font-medium text-ink-soft";

function FeePlanTypePage() {
  const {
    items: feePlans,
    isLoading,
    loadError,
    isCreating,
    createError,
    createEntity,
  } = useEntityCrud<FeePlanType, { plan: string }>({
    fetchList: () => superAdminService.getFeePlanTypes().then((res) => res.feePlans ?? []),
    create: (payload) => superAdminService.createFeePlanType(payload),
  });

  const [plan, setPlan] = useState("");

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!plan.trim()) return;
    const ok = await createEntity({ plan: plan.trim() });
    if (ok) setPlan("");
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-medium text-marigold-dark">Super Admin · Fee Setting</p>
        <h1 className="mt-1 font-display text-2xl text-ink">Fee Plan Type</h1>
      </div>

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
                onChange={(e) => setPlan(e.target.value)}
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
          {createError && (
            <p role="alert" className="rounded-md bg-red-50 px-3.5 py-2 text-sm text-red-600">
              {createError}
            </p>
          )}
        </form>

        <div className="mt-5 border-t border-line pt-4">
          <EntityTable<FeePlanType>
            items={feePlans}
            isLoading={isLoading}
            error={loadError}
            emptyLabel="No fee plan types added yet."
            getRowKey={(item) => item._id}
            columns={[{ header: "Plan", render: (item) => <span className="font-medium">{item.plan}</span> }]}
          />
        </div>
      </SectionCard>
    </div>
  );
}

export default FeePlanTypePage;
