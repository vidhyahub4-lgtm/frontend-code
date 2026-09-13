import { useState, type FormEvent } from "react";
import { Calendar, Plus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { SectionCard } from "../components/common/SectionCard";
import { EntityTable } from "../components/common/EntityTable";
import { useEntityCrud } from "../hooks/useEntityCrud";
import { superAdminService } from "../services/superadmin.service";
import type { Session } from "../types/superadmin.types";

const inputClasses =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-marigold/40";
const labelClasses = "text-sm font-medium text-ink-soft";

function SessionSetupSection() {
  const { items, isLoading, loadError, isCreating, createError, createEntity } =
    useEntityCrud<Session, { session: string }>({
      fetchList: () => superAdminService.getSessions().then((res) => res.sessions ?? []),
      create: (payload) => superAdminService.createSession(payload),
    });

  const [session, setSession] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session.trim()) return;
    const ok = await createEntity({ session: session.trim() });
    if (ok) setSession("");
  }

  return (
    <SectionCard title="Session (Financial Year) Setup" icon={Calendar}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <label htmlFor="session-name" className={labelClasses}>
              Session
            </label>
            <input
              id="session-name"
              value={session}
              onChange={(e) => setSession(e.target.value)}
              placeholder="e.g. 2026-27"
              className={inputClasses}
            />
          </div>
          <button
            type="submit"
            disabled={isCreating || !session.trim()}
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
        <EntityTable<Session>
          items={items}
          isLoading={isLoading}
          error={loadError}
          emptyLabel="No sessions added yet."
          getRowKey={(item) => item._id}
          columns={[
            { header: "Session", render: (item) => <span className="font-medium">{item.session}</span> },
          ]}
        />
      </div>
    </SectionCard>
  );
}

function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <p className="text-sm font-medium text-marigold-dark">Signed in</p>
      <h1 className="mt-1 font-display text-3xl text-ink">
        Welcome{user ? `, ${user.firstname}` : ""}
      </h1>
      <p className="mt-2 text-ink-soft max-w-md">
        Use the sidebar to navigate to admissions, student records, and
        school settings.
      </p>

      <div className="mt-6 max-w-xl">
        <SessionSetupSection />
      </div>
    </div>
  );
}

export default DashboardPage;
