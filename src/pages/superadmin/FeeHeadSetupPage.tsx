import { useState, type FormEvent } from "react";
import { ListChecks, Plus } from "lucide-react";
import { SectionCard } from "../../components/common/SectionCard";
import { EntityTable } from "../../components/common/EntityTable";
import { useEntityCrud } from "../../hooks/useEntityCrud";
import { superAdminService } from "../../services/superadmin.service";
import { FEE_HEAD_TYPES } from "../../types/superadmin.types";
import type { FeeHeadSetup, FeeHeadType, Session } from "../../types/superadmin.types";

const inputClasses =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-marigold/40";
const labelClasses = "text-sm font-medium text-ink-soft";

function FeeHeadSetupPage() {
  const { items: sessions, isLoading: sessionsLoading } = useEntityCrud<Session, never>({
    fetchList: () => superAdminService.getSessions().then((res) => res.sessions ?? []),
    create: () => Promise.resolve(),
  });

  const {
    items: feeHeads,
    isLoading,
    loadError,
    isCreating,
    createError,
    createEntity,
  } = useEntityCrud<FeeHeadSetup, { headtype: FeeHeadType; session: string; feehead: string }>({
    fetchList: () => superAdminService.getFeeHeadSetups().then((res) => res.feeHeads ?? []),
    create: (payload) => superAdminService.createFeeHeadSetup(payload),
  });

  const [headtype, setHeadtype] = useState<FeeHeadType | "">("");
  const [session, setSession] = useState("");
  const [feehead, setFeehead] = useState("");

  const canAdd = Boolean(headtype && session && feehead.trim());

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!headtype || !session || !feehead.trim()) return;
    const ok = await createEntity({ headtype, session, feehead: feehead.trim() });
    if (ok) setFeehead("");
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-medium text-marigold-dark">Super Admin · Fee Setting</p>
        <h1 className="mt-1 font-display text-2xl text-ink">Fee Head Setup</h1>
      </div>

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
                onChange={(e) => setHeadtype(e.target.value as FeeHeadType)}
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
              <label htmlFor="fh-session" className={labelClasses}>
                Session
              </label>
              <select
                id="fh-session"
                value={session}
                onChange={(e) => setSession(e.target.value)}
                className={inputClasses}
                disabled={sessionsLoading || sessions.length === 0}
              >
                <option value="">
                  {sessionsLoading
                    ? "Loading sessions…"
                    : sessions.length === 0
                    ? "No sessions found — add one from Dashboard"
                    : "Select a session"}
                </option>
                {sessions.map((s) => (
                  <option key={s._id} value={s.session}>
                    {s.session}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="fh-fee-head" className={labelClasses}>
                Fee Head
              </label>
              <input
                id="fh-fee-head"
                value={feehead}
                onChange={(e) => setFeehead(e.target.value)}
                placeholder="e.g. Tuition Fee"
                className={inputClasses}
              />
            </div>
          </div>

          {createError && (
            <p role="alert" className="rounded-md bg-red-50 px-3.5 py-2 text-sm text-red-600">
              {createError}
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
          <EntityTable<FeeHeadSetup>
            items={feeHeads}
            isLoading={isLoading}
            error={loadError}
            emptyLabel="No fee heads added yet."
            getRowKey={(item) => item._id}
            columns={[
              { header: "Fee Head", render: (item) => <span className="font-medium">{item.feehead}</span> },
              { header: "Head Type", render: (item) => item.headtype },
              { header: "Session", render: (item) => item.session },
            ]}
          />
        </div>
      </SectionCard>
    </div>
  );
}

export default FeeHeadSetupPage;
