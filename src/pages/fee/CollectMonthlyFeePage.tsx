import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, IndianRupee, Loader2 } from "lucide-react";
import { SchoolSessionGate } from "../../components/common/SchoolSessionGate";
import { SectionCard } from "../../components/common/SectionCard";
import { EnrolledStudentPicker } from "../../components/fee/EnrolledStudentPicker";
import { enrollmentStudentName } from "../../lib/enrollmentDisplay";
import { feeService } from "../../services/fee.service";
import { ApiError } from "../../types/api.types";
import type {
  CollectFeeLine,
  EnrollmentRow,
  MonthlyDueMonth,
  PaymentMode,
} from "../../types/fee.types";

const inputClasses =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-marigold/40 disabled:cursor-not-allowed disabled:opacity-60";
const labelClasses = "text-sm font-medium text-ink-soft";
const PAY_MODES: PaymentMode[] = ["cash", "upi", "cheque", "online", "card"];

const todayISO = () => new Date().toISOString().slice(0, 10);
const monthKey = (m: MonthlyDueMonth) => String(m.installmentMonthId);

interface CollectorProps {
  studentId: string;
  schId: string;
  sessionId: string;
  studentName: string;
  onCollected: (message: string) => void;
}

/** Loads one student's monthly dues and collects payment for the chosen months. */
function MonthlyFeeCollector({ studentId, schId, sessionId, studentName, onCollected }: CollectorProps) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [months, setMonths] = useState<MonthlyDueMonth[]>([]);
  const [advanceBalance, setAdvanceBalance] = useState(0);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  const [mode, setMode] = useState<PaymentMode>("cash");
  const [refNo, setRefNo] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayISO());
  const [advanceAmount, setAdvanceAmount] = useState("0");
  const [collecting, setCollecting] = useState(false);
  const [collectError, setCollectError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    feeService
      .getMonthlyDues(studentId, sessionId, schId)
      .then((res) => {
        if (cancelled) return;
        const list = res.data.months ?? [];
        setMonths(list);
        setAdvanceBalance(res.data.advanceBalance ?? 0);
        const initialAmounts: Record<string, string> = {};
        list.forEach((m) => m.items.forEach((i) => (initialAmounts[i.demandId] = String(i.dueAmount))));
        setAmounts(initialAmounts);
        // The oldest unpaid month is pre-selected; that's what is usually paid first.
        setSelected(list[0] ? { [monthKey(list[0])]: true } : {});
      })
      .catch((err) => {
        if (!cancelled)
          setLoadError(err instanceof ApiError ? err.message : "Could not load monthly dues.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId, sessionId, schId]);

  const selectedMonths = months.filter((m) => selected[monthKey(m)]);
  const totalPaying = selectedMonths.reduce(
    (sum, m) => sum + m.items.reduce((s, i) => s + (Number(amounts[i.demandId]) || 0), 0),
    0
  );
  const allSelected = months.length > 0 && selectedMonths.length === months.length;

  async function handleCollect() {
    setCollectError(null);
    const lines: CollectFeeLine[] = [];
    for (const m of selectedMonths) {
      for (const i of m.items) {
        const amount = Number(amounts[i.demandId]) || 0;
        if (amount > i.dueAmount) {
          setCollectError(`Amount for "${i.feetype}" (Month ${m.installmentMonthNo}) exceeds the due amount (${i.dueAmount}).`);
          return;
        }
        if (amount > 0) lines.push({ demandId: i.demandId, amount });
      }
    }
    if (!lines.length) {
      setCollectError("Select at least one month and enter an amount greater than 0.");
      return;
    }
    setCollecting(true);
    try {
      const res = await feeService.collectFee({
        schId,
        session: sessionId,
        studentId,
        mode,
        refNo: refNo.trim() || undefined,
        paymentDate,
        lines,
        advanceAmount: Number(advanceAmount) || 0,
      });
      onCollected(
        res.data ? `Payment collected — receipt no. ${res.data.receiptNo}.` : res.message || "Payment collected."
      );
    } catch (err) {
      setCollectError(err instanceof ApiError ? err.message : "Could not collect this payment. Please try again.");
      setCollecting(false);
    }
  }

  return (
    <SectionCard title={`Monthly Fee — ${studentName || "Student"}`} icon={IndianRupee}>
      {loading && (
        <p className="flex items-center gap-1.5 text-sm text-ink-soft">
          <Loader2 size={14} className="animate-spin" /> Loading monthly dues…
        </p>
      )}
      {!loading && loadError && (
        <p className="flex items-center gap-1.5 text-sm text-red-600">
          <AlertCircle size={14} /> {loadError}
        </p>
      )}
      {!loading && !loadError && months.length === 0 && (
        <p className="flex items-center gap-1.5 text-sm text-emerald-700">
          <CheckCircle2 size={14} /> No monthly fee is due for this student.
        </p>
      )}
      {!loading && !loadError && months.length > 0 && (
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={(e) =>
                setSelected(e.target.checked ? Object.fromEntries(months.map((m) => [monthKey(m), true])) : {})
              }
            />
            Select all months
          </label>

          <div className="space-y-3">
            {months.map((m) => {
              const checked = !!selected[monthKey(m)];
              return (
                <div key={monthKey(m)} className="rounded-md border border-line">
                  <label className="flex cursor-pointer items-center justify-between gap-3 bg-paper px-3 py-2">
                    <span className="flex items-center gap-2 text-sm font-medium text-ink">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => setSelected((prev) => ({ ...prev, [monthKey(m)]: e.target.checked }))}
                      />
                      Month {m.installmentMonthNo}
                    </span>
                    <span className="text-sm text-ink-soft">Due ₹{m.monthDue}</span>
                  </label>
                  <div className="overflow-x-auto px-3 pb-2">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
                          <th className="py-2 pr-3 font-medium">Fee Head</th>
                          <th className="py-2 pr-3 font-medium">Net</th>
                          <th className="py-2 pr-3 font-medium">Paid</th>
                          <th className="py-2 pr-3 font-medium">Due</th>
                          <th className="py-2 pr-3 font-medium">Collecting Now</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {m.items.map((i) => (
                          <tr key={i.demandId}>
                            <td className="py-2 pr-3">{i.feetype}</td>
                            <td className="py-2 pr-3">{i.netAmount}</td>
                            <td className="py-2 pr-3">{i.paidAmount}</td>
                            <td className="py-2 pr-3">{i.dueAmount}</td>
                            <td className="py-2 pr-3">
                              <input
                                type="number"
                                min={0}
                                max={i.dueAmount}
                                disabled={!checked}
                                value={amounts[i.demandId] ?? ""}
                                onChange={(e) => setAmounts((prev) => ({ ...prev, [i.demandId]: e.target.value }))}
                                className={`${inputClasses} w-28`}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>

          {advanceBalance > 0 && <p className="text-xs text-ink-soft">Available advance balance: ₹{advanceBalance}</p>}

          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1">
              <label htmlFor="mf-mode" className={labelClasses}>Payment Mode</label>
              <select id="mf-mode" value={mode} onChange={(e) => setMode(e.target.value as PaymentMode)} className={inputClasses}>
                {PAY_MODES.map((m) => (
                  <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="mf-ref" className={labelClasses}>Ref No.</label>
              <input
                id="mf-ref"
                value={refNo}
                onChange={(e) => setRefNo(e.target.value)}
                placeholder={mode === "cash" ? "Optional" : "Cheque / txn no."}
                className={inputClasses}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="mf-date" className={labelClasses}>Payment Date</label>
              <input id="mf-date" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className={inputClasses} />
            </div>
            <div className="space-y-1">
              <label htmlFor="mf-adv" className={labelClasses}>Extra Advance</label>
              <input id="mf-adv" type="number" min={0} value={advanceAmount} onChange={(e) => setAdvanceAmount(e.target.value)} className={inputClasses} />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
            <p className="text-sm font-medium text-ink">Collecting: ₹{totalPaying}</p>
            <button
              type="button"
              onClick={handleCollect}
              disabled={collecting}
              className="flex items-center gap-1.5 rounded-md bg-marigold px-4 py-2 text-sm font-medium text-ink hover:bg-marigold-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {collecting ? <Loader2 size={15} className="animate-spin" /> : <IndianRupee size={15} />}
              Collect Fee
            </button>
          </div>
          {collectError && (
            <p className="flex items-center gap-1.5 text-xs text-red-600">
              <AlertCircle size={13} /> {collectError}
            </p>
          )}
        </div>
      )}
    </SectionCard>
  );
}

function CollectMonthlyFeeContent({ schId, sessionId }: { schId: string; sessionId: string }) {
  const [student, setStudent] = useState<EnrollmentRow | null>(null);
  // Bumping this remounts the collector so the dues are fetched again after a payment.
  const [reloadKey, setReloadKey] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <EnrolledStudentPicker
        schId={schId}
        sessionId={sessionId}
        onSelect={(row) => {
          setStudent(row);
          setMessage(null);
        }}
      />
      {message && (
        <p className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 size={14} /> {message}
        </p>
      )}
      {student && (
        <MonthlyFeeCollector
          key={`${student.studentId._id}:${reloadKey}`}
          studentId={student.studentId._id}
          schId={schId}
          sessionId={sessionId}
          studentName={enrollmentStudentName(student)}
          onCollected={(msg) => {
            setMessage(msg);
            setReloadKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}

function CollectMonthlyFeePage() {
  return (
    <SchoolSessionGate eyebrow="Fee Options" title="Collect Monthly Fee">
      {({ schId, sessionId }) => <CollectMonthlyFeeContent schId={schId} sessionId={sessionId} />}
    </SchoolSessionGate>
  );
}

export default CollectMonthlyFeePage;
