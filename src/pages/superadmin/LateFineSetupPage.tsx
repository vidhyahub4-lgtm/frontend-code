import { useState, type FormEvent } from "react";
import { Clock, Plus, Trash2 } from "lucide-react";
import { SectionCard } from "../../components/common/SectionCard";
import { EntityTable } from "../../components/common/EntityTable";
import { useEntityCrud } from "../../hooks/useEntityCrud";
import { useSelectedSession } from "../../hooks/useSelectedSession";
import { superAdminService } from "../../services/superadmin.service";
import type { SchoolClass } from "../../types/superadmin.types";

const inputClasses =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-marigold/40";
const labelClasses = "text-sm font-medium text-ink-soft";

/**
 * UI-only for now (backend not built yet — see handoff notes).
 * "Select Installment" should eventually come from the class's configured
 * Class PayMode installments, and "Select FeeHead" from Fee Head Setup /
 * Head Master once those are wired up. Placeholder lists below unblock UI
 * review; swap for real data once the backend shape is confirmed.
 */
const INSTALLMENT_OPTIONS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const FEE_HEAD_OPTIONS = ["Late Fine", "Tuition Fee", "Transport Fee"];

type FineType = "FIXED" | "DAILY";

interface LateFineRow {
  id: string;
  className: string;
  feeHeadName: string;
  installment: string;
  dueDate: string;
  fineType: FineType;
  amountNormal: number;
  amountPartial: number;
  amountFull: number;
  dayScholar: boolean;
}

function LateFineSetupPage() {
  // Class master data already exists in the backend — reuse it for real
  // (read-only list-loader pattern, same as ClassSectionSetupPage).
  const { items: classes } = useEntityCrud<SchoolClass, never>({
    fetchList: () => superAdminService.getClasses().then((res) => res.classes ?? []),
    create: () => Promise.resolve(),
  });

  const { selectedSession } = useSelectedSession();
  const session = selectedSession?.name ?? "";
  const [dayScholar, setDayScholar] = useState(true);
  const [dayScholarTransport, setDayScholarTransport] = useState(true);
  const [boarder, setBoarder] = useState(true);
  const [classId, setClassId] = useState("");
  const [installment, setInstallment] = useState("");
  const [feeHead, setFeeHead] = useState(FEE_HEAD_OPTIONS[0]);
  const [dueDate, setDueDate] = useState("");
  const [fineType, setFineType] = useState<FineType>("FIXED");
  const [amountNormal, setAmountNormal] = useState("0");
  const [amountPartial, setAmountPartial] = useState("0");
  const [amountFull, setAmountFull] = useState("0");
  const [rows, setRows] = useState<LateFineRow[]>([]);

  const selectedClassName =
    classId === "" ? "All Class" : classes.find((c) => c._id === classId)?.className ?? "";

  const canAdd = Boolean(session.trim() && installment && feeHead && dueDate);

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canAdd) return;

    setRows((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        className: selectedClassName,
        feeHeadName: feeHead,
        installment,
        dueDate,
        fineType,
        amountNormal: Number(amountNormal) || 0,
        amountPartial: Number(amountPartial) || 0,
        amountFull: Number(amountFull) || 0,
        dayScholar,
      },
    ]);
    setInstallment("");
    setDueDate("");
    setAmountNormal("0");
    setAmountPartial("0");
    setAmountFull("0");
  }

  function handleDelete(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-medium text-marigold-dark">Super Admin · Fee Setting</p>
        <h1 className="mt-1 font-display text-2xl text-ink">Late Fine Setup</h1>
      </div>

      <SectionCard title="Late Fine Setup" icon={Clock}>
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
            <div className="w-48 space-y-1">
              <label htmlFor="lf-session" className={labelClasses}>
                Select Session
              </label>
              <input
                id="lf-session"
                value={session}
                readOnly
                disabled
                placeholder="Select session from settings"
                className={`${inputClasses} cursor-not-allowed bg-line/40 text-ink-soft`}
              />
            </div>

            <div className="flex flex-wrap items-center gap-4 pb-2">
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
                  checked={dayScholarTransport}
                  onChange={(e) => setDayScholarTransport(e.target.checked)}
                  className="h-4 w-4 accent-marigold"
                />
                Day Scholar (With Transport)
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
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <label htmlFor="lf-class" className={labelClasses}>
                Select Class
              </label>
              <select
                id="lf-class"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className={inputClasses}
              >
                <option value="">All Class</option>
                {classes.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.className}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="lf-installment" className={labelClasses}>
                Select Installment
              </label>
              <select
                id="lf-installment"
                value={installment}
                onChange={(e) => setInstallment(e.target.value)}
                className={inputClasses}
              >
                <option value="">Select installment</option>
                {INSTALLMENT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="lf-fee-head" className={labelClasses}>
                Select FeeHead
              </label>
              <select
                id="lf-fee-head"
                value={feeHead}
                onChange={(e) => setFeeHead(e.target.value)}
                className={inputClasses}
              >
                {FEE_HEAD_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="lf-due-date" className={labelClasses}>
                Due Date (Day After)
              </label>
              <input
                id="lf-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={inputClasses}
              />
            </div>
          </div>

          <div className="space-y-1">
            <span className={labelClasses}>Fine Type</span>
            <div className="flex items-center gap-5 pt-1">
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="radio"
                  name="fine-type"
                  checked={fineType === "FIXED"}
                  onChange={() => setFineType("FIXED")}
                  className="h-4 w-4 accent-marigold"
                />
                Fixed
              </label>
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="radio"
                  name="fine-type"
                  checked={fineType === "DAILY"}
                  onChange={() => setFineType("DAILY")}
                  className="h-4 w-4 accent-marigold"
                />
                Daily
              </label>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <label htmlFor="lf-amount-normal" className={labelClasses}>
                Amount (Normal)
              </label>
              <input
                id="lf-amount-normal"
                type="number"
                min="0"
                value={amountNormal}
                onChange={(e) => setAmountNormal(e.target.value)}
                className={inputClasses}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="lf-amount-partial" className={labelClasses}>
                Amount (On First Partial Payment)
              </label>
              <input
                id="lf-amount-partial"
                type="number"
                min="0"
                value={amountPartial}
                onChange={(e) => setAmountPartial(e.target.value)}
                className={inputClasses}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="lf-amount-full" className={labelClasses}>
                Amount (On Final Payment)
              </label>
              <input
                id="lf-amount-full"
                type="number"
                min="0"
                value={amountFull}
                onChange={(e) => setAmountFull(e.target.value)}
                className={inputClasses}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <button
              type="submit"
              disabled={!canAdd}
              className="flex items-center justify-center gap-1.5 rounded-md bg-marigold px-4 py-2 text-sm font-medium text-chalkboard transition hover:bg-marigold-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus size={15} />
              Add FineDay
            </button>
            <p className="max-w-md text-xs text-ink-soft">
              Note: if you want to collect late fine for transport and non-transport
              students separately, add them as separate entries.
            </p>
          </div>
        </form>

        <div className="mt-5 border-t border-line pt-4">
          <EntityTable<LateFineRow>
            items={rows}
            isLoading={false}
            error={null}
            emptyLabel="No late fine rules added yet."
            getRowKey={(item) => item.id}
            columns={[
              { header: "Class", render: (item) => item.className },
              {
                header: "Fee Head",
                render: (item) => <span className="font-medium">{item.feeHeadName}</span>,
              },
              { header: "Installment", render: (item) => item.installment },
              { header: "Due Date", render: (item) => item.dueDate },
              {
                header: "Fine Type",
                render: (item) => (item.fineType === "FIXED" ? "Fixed" : "Daily"),
              },
              { header: "Normal", render: (item) => `₹${item.amountNormal}` },
              { header: "Partial", render: (item) => `₹${item.amountPartial}` },
              { header: "Full", render: (item) => `₹${item.amountFull}` },
              { header: "DS", render: (item) => (item.dayScholar ? "Yes" : "No") },
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

export default LateFineSetupPage;
