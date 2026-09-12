import { useMemo, useState, type FormEvent } from "react";
import { ListChecks, Plus, RefreshCw, Trash2 } from "lucide-react";
import { SectionCard } from "../../components/common/SectionCard";
import { EntityTable } from "../../components/common/EntityTable";

const inputClasses =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-marigold/40";
const labelClasses = "text-sm font-medium text-ink-soft";

/**
 * UI-only for now (backend not built yet — see handoff notes).
 * "Head Type" and "Fee Head" are expected to come from master-data
 * endpoints once the backend adds them (mirrors the reference product's
 * separate "Head Master" screen). These are placeholder option lists so
 * the UI can be reviewed; swap for a real fetch once the backend/master
 * data shape is confirmed.
 */
const HEAD_TYPE_OPTIONS = ["General", "Optional", "Transport", "Hostel"];
const FEE_HEAD_OPTIONS = [
  "Tuition Fee",
  "Admission Fee",
  "Transport Fee",
  "Library Fee",
  "Exam Fee",
  "Late Fine",
];

interface FeeHeadRow {
  id: string;
  headType: string;
  headName: string;
  session: string;
  dayScholar: boolean;
  boarder: boolean;
}

function FeeHeadSetupPage() {
  const [headType, setHeadType] = useState("");
  const [session, setSession] = useState("");
  const [dayScholar, setDayScholar] = useState(true);
  const [boarder, setBoarder] = useState(true);
  const [feeHead, setFeeHead] = useState("");
  const [rows, setRows] = useState<FeeHeadRow[]>([]);
  const [copyFromSession, setCopyFromSession] = useState("");

  // Sessions already used in the table (other than the one currently
  // selected) — powers the "Get From Other Session" copy action.
  const pastSessions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.session))).filter((s) => s !== session.trim()),
    [rows, session]
  );

  const canAdd = Boolean(headType && session.trim() && feeHead && (dayScholar || boarder));

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canAdd) return;

    setRows((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        headType,
        headName: feeHead,
        session: session.trim(),
        dayScholar,
        boarder,
      },
    ]);
    setFeeHead("");
  }

  function handleGetFromOtherSession() {
    if (!copyFromSession || !session.trim()) return;
    const copied = rows
      .filter((r) => r.session === copyFromSession)
      .map((r) => ({ ...r, id: crypto.randomUUID(), session: session.trim() }));
    setRows((prev) => [...prev, ...copied]);
  }

  function handleDelete(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-medium text-marigold-dark">Super Admin · Fee Setting</p>
        <h1 className="mt-1 font-display text-2xl text-ink">Fee Head Setup</h1>
      </div>

      <SectionCard title="Fee Head Setup" icon={ListChecks}>
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <label htmlFor="fh-head-type" className={labelClasses}>
                Head Type
              </label>
              <select
                id="fh-head-type"
                value={headType}
                onChange={(e) => setHeadType(e.target.value)}
                className={inputClasses}
              >
                <option value="">Select head type</option>
                {HEAD_TYPE_OPTIONS.map((opt) => (
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
              <input
                id="fh-session"
                value={session}
                onChange={(e) => setSession(e.target.value)}
                placeholder="e.g. 2026-27"
                className={inputClasses}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="fh-fee-head" className={labelClasses}>
                Fee Head
              </label>
              <select
                id="fh-fee-head"
                value={feeHead}
                onChange={(e) => setFeeHead(e.target.value)}
                className={inputClasses}
              >
                <option value="">Select fee head</option>
                {FEE_HEAD_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-5">
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={dayScholar}
                onChange={(e) => setDayScholar(e.target.checked)}
                className="h-4 w-4 accent-marigold"
              />
              Day Scholar
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={boarder}
                onChange={(e) => setBoarder(e.target.checked)}
                className="h-4 w-4 accent-marigold"
              />
              Boarder
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={!canAdd}
              className="flex items-center justify-center gap-1.5 rounded-md bg-marigold px-4 py-2 text-sm font-medium text-chalkboard transition hover:bg-marigold-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus size={15} />
              Add Head
            </button>

            <div className="flex items-center gap-2">
              <select
                value={copyFromSession}
                onChange={(e) => setCopyFromSession(e.target.value)}
                className={`${inputClasses} sm:w-48`}
                disabled={pastSessions.length === 0}
              >
                <option value="">
                  {pastSessions.length === 0 ? "No other sessions yet" : "Copy from session"}
                </option>
                {pastSessions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleGetFromOtherSession}
                disabled={!copyFromSession || !session.trim()}
                className="flex items-center justify-center gap-1.5 rounded-md border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition hover:bg-chalk disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw size={15} />
                Get From Other Session
              </button>
            </div>
          </div>
        </form>

        <div className="mt-5 border-t border-line pt-4">
          <EntityTable<FeeHeadRow>
            items={rows}
            isLoading={false}
            error={null}
            emptyLabel="No fee heads added yet."
            getRowKey={(item) => item.id}
            columns={[
              {
                header: "Head Name",
                render: (item) => <span className="font-medium">{item.headName}</span>,
              },
              { header: "Head Type", render: (item) => item.headType },
              { header: "Session", render: (item) => item.session },
              { header: "Day Scholar", render: (item) => (item.dayScholar ? "Yes" : "No") },
              { header: "Boarder", render: (item) => (item.boarder ? "Yes" : "No") },
              {
                header: "Action",
                render: (item) => (
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    aria-label="Delete"
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 size={15} />
                  </button>
                ),
              },
            ]}
          />
        </div>
      </SectionCard>
    </div>
  );
}

export default FeeHeadSetupPage;
