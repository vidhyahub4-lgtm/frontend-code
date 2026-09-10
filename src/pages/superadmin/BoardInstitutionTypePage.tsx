import { useState, type FormEvent } from "react";
import { BookOpen, Building2, Plus } from "lucide-react";
import { SectionCard } from "../../components/common/SectionCard";
import { EntityTable } from "../../components/common/EntityTable";
import { useEntityCrud } from "../../hooks/useEntityCrud";
import { superAdminService } from "../../services/superadmin.service";
import type { Board, InstituteType } from "../../types/superadmin.types";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const inputClasses =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-marigold/40";
const labelClasses = "text-sm font-medium text-ink-soft";

function BoardSection() {
  const { items, isLoading, loadError, isCreating, createError, createEntity } =
    useEntityCrud<Board, { board: string; startMonth: string }>({
      fetchList: () => superAdminService.getBoards().then((res) => res.data ?? []),
      create: (payload) =>
        superAdminService.createBoard(payload).then((res) => res.data),
    });

  const [board, setBoard] = useState("");
  const [startMonth, setStartMonth] = useState(MONTHS[0]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!board.trim()) return;

    const ok = await createEntity({ board: board.trim(), startMonth });
    if (ok) setBoard("");
  }

  return (
    <SectionCard title="Board Setup" icon={BookOpen}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <label htmlFor="board-name" className={labelClasses}>
              Board name
            </label>
            <input
              id="board-name"
              value={board}
              onChange={(e) => setBoard(e.target.value)}
              placeholder="e.g. CBSE"
              className={inputClasses}
            />
          </div>
          <div className="space-y-1 sm:w-40">
            <label htmlFor="board-start-month" className={labelClasses}>
              Start month
            </label>
            <select
              id="board-start-month"
              value={startMonth}
              onChange={(e) => setStartMonth(e.target.value)}
              className={inputClasses}
            >
              {MONTHS.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={isCreating || !board.trim()}
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
        <EntityTable<Board>
          items={items}
          isLoading={isLoading}
          error={loadError}
          emptyLabel="No boards added yet."
          getRowKey={(item) => item._id}
          columns={[
            { header: "Board", render: (item) => <span className="font-medium">{item.board}</span> },
            { header: "Start Month", render: (item) => item.startMonth },
          ]}
        />
      </div>
    </SectionCard>
  );
}

function InstituteTypeSection() {
  const { items, isLoading, loadError, isCreating, createError, createEntity } =
    useEntityCrud<InstituteType, { instituteType: string }>({
      fetchList: () =>
        superAdminService.getInstituteTypes().then((res) => res.data ?? []),
      create: (payload) =>
        superAdminService.createInstituteType(payload).then((res) => res.data),
    });

  const [instituteType, setInstituteType] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!instituteType.trim()) return;

    const ok = await createEntity({ instituteType: instituteType.trim() });
    if (ok) setInstituteType("");
  }

  return (
    <SectionCard title="Institution Type Setup" icon={Building2}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <label htmlFor="institute-type" className={labelClasses}>
              Institution type
            </label>
            <input
              id="institute-type"
              value={instituteType}
              onChange={(e) => setInstituteType(e.target.value)}
              placeholder="e.g. School"
              className={inputClasses}
            />
          </div>
          <button
            type="submit"
            disabled={isCreating || !instituteType.trim()}
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
        <EntityTable<InstituteType>
          items={items}
          isLoading={isLoading}
          error={loadError}
          emptyLabel="No institution types added yet."
          getRowKey={(item) => item._id}
          columns={[
            {
              header: "Institution Type",
              render: (item) => <span className="font-medium">{item.instituteType}</span>,
            },
          ]}
        />
      </div>
    </SectionCard>
  );
}

function BoardInstitutionTypePage() {
  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-medium text-marigold-dark">Super Admin · Essential Setting</p>
        <h1 className="mt-1 font-display text-2xl text-ink">Board / Institution Type Setup</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <BoardSection />
        <InstituteTypeSection />
      </div>
    </div>
  );
}

export default BoardInstitutionTypePage;
