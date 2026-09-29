import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, IndianRupee, Loader2 } from "lucide-react";
import { SectionCard } from "../common/SectionCard";
import { feeService } from "../../services/fee.service";
import { ApiError } from "../../types/api.types";
import type { CollectFeeLine, FeeDueItem, PaymentMode } from "../../types/fee.types";

const inputClasses =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-marigold/40 disabled:cursor-not-allowed disabled:opacity-60";
const labelClasses = "text-sm font-medium text-ink-soft";
const primaryButtonClasses =
  "flex items-center justify-center gap-1.5 rounded-md bg-marigold px-3 py-2 text-sm font-medium text-chalkboard transition hover:bg-marigold-dark disabled:cursor-not-allowed disabled:opacity-60";

const PAY_MODES: PaymentMode[] = ["cash", "upi", "cheque", "online", "card"];

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

interface Props {
  /** StudentAdmission `_id` — NOT the registration id and NOT the regno. */
  studentId: string;
  schId: string;
  sessionId: string;
  studentName?: string;
  /** Called once a payment is collected successfully. */
  onCollected?: () => void;
}

/**
 * Loads a student's pending admission-fee dues and lets the front desk
 * collect a payment against them (POST /api/fees/collect). Used from the
 * New Admission page — both right after a fresh admission, and when a
 * student was already admitted with payment still pending.
 */
export function AdmissionFeeCollectionCard({ studentId, schId, sessionId, studentName, onCollected }: Props) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [items, setItems] = useState<FeeDueItem[]>([]);
  const [advanceBalance, setAdvanceBalance] = useState(0);

  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<PaymentMode>("cash");
  const [refNo, setRefNo] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayISO());
  const [advanceAmount, setAdvanceAmount] = useState("0");

  const [collecting, setCollecting] = useState(false);
  const [collectError, setCollectError] = useState<string | null>(null);
  const [receiptMsg, setReceiptMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    feeService
      .getAdmissionDues(studentId, sessionId, schId)
      .then((res) => {
        if (cancelled) return;
        setItems(res.data.items);
        setAdvanceBalance(res.data.advanceBalance);
        const initial: Record<string, string> = {};
        res.data.items.forEach((i) => (initial[i.demandId] = String(i.dueAmount)));
        setAmounts(initial);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(errorMessage(err, "Could not load admission dues for this student."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId, sessionId, schId]);

  const totalPaying = items.reduce((sum, i) => sum + (Number(amounts[i.demandId]) || 0), 0);

  async function handleCollect() {
    setCollectError(null);
    setReceiptMsg(null);

    const lines: CollectFeeLine[] = items
      .map((i) => ({ demandId: i.demandId, amount: Number(amounts[i.demandId]) || 0 }))
      .filter((l) => l.amount > 0);

    if (!lines.length) {
      setCollectError("Enter an amount greater than 0 for at least one fee head.");
      return;
    }
    for (const l of lines) {
      const item = items.find((i) => i.demandId === l.demandId);
      if (item && l.amount > item.dueAmount) {
        setCollectError(`Amount for "${item.feetype}" exceeds the due amount (${item.dueAmount}).`);
        return;
      }
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
      setReceiptMsg(
        res.data ? `Payment collected — receipt no. ${res.data.receiptNo}.` : res.message || "Payment collected."
      );
      onCollected?.();
    } catch (err) {
      setCollectError(errorMessage(err, "Could not collect this payment. Please try again."));
    } finally {
      setCollecting(false);
    }
  }

  return (
    <SectionCard title="Admission Fee" icon={IndianRupee}>
      {loading && (
        <p className="flex items-center gap-1.5 text-sm text-ink-soft">
          <Loader2 size={14} className="animate-spin" /> Loading admission dues{studentName ? ` for ${studentName}` : ""}…
        </p>
      )}

      {!loading && loadError && (
        <p className="flex items-center gap-1.5 text-sm text-red-600">
          <AlertCircle size={14} /> {loadError}
        </p>
      )}

      {!loading && !loadError && items.length === 0 && (
        <p className="flex items-center gap-1.5 text-sm text-emerald-700">
          <CheckCircle2 size={14} /> No admission fee is due — it has already been paid in full.
        </p>
      )}

      {!loading && !loadError && items.length > 0 && !receiptMsg && (
        <div className="space-y-4">
          <div className="overflow-x-auto">
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
                {items.map((item) => (
                  <tr key={item.demandId}>
                    <td className="py-2 pr-3">{item.feetype}</td>
                    <td className="py-2 pr-3">{item.netAmount}</td>
                    <td className="py-2 pr-3">{item.paidAmount}</td>
                    <td className="py-2 pr-3">{item.dueAmount}</td>
                    <td className="py-2 pr-3">
                      <input
                        type="number"
                        min={0}
                        max={item.dueAmount}
                        value={amounts[item.demandId] ?? ""}
                        onChange={(e) => setAmounts((prev) => ({ ...prev, [item.demandId]: e.target.value }))}
                        className={`${inputClasses} w-28`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {advanceBalance > 0 && (
            <p className="text-xs text-ink-soft">Available advance balance: {advanceBalance}</p>
          )}

          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1">
              <label className={labelClasses}>Payment Mode</label>
              <select value={mode} onChange={(e) => setMode(e.target.value as PaymentMode)} className={inputClasses}>
                {PAY_MODES.map((m) => (
                  <option key={m} value={m}>
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className={labelClasses}>Ref No.</label>
              <input
                value={refNo}
                onChange={(e) => setRefNo(e.target.value)}
                placeholder={mode === "cash" ? "Optional" : "Cheque / txn no."}
                className={inputClasses}
              />
            </div>
            <div className="space-y-1">
              <label className={labelClasses}>Payment Date</label>
              <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className={inputClasses} />
            </div>
            <div className="space-y-1">
              <label className={labelClasses}>Extra Advance</label>
              <input
                type="number"
                min={0}
                value={advanceAmount}
                onChange={(e) => setAdvanceAmount(e.target.value)}
                className={inputClasses}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
            <p className="text-sm font-medium text-ink">Collecting: ₹{totalPaying}</p>
            <button type="button" onClick={handleCollect} disabled={collecting} className={primaryButtonClasses}>
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

      {receiptMsg && (
        <p className="flex items-center gap-1.5 text-sm text-emerald-700">
          <CheckCircle2 size={14} /> {receiptMsg}
        </p>
      )}
    </SectionCard>
  );
}
