import { useEffect, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Circle, IndianRupee, Loader2, User } from "lucide-react";
import { SchoolSessionGate } from "../../components/common/SchoolSessionGate";
import { SectionCard } from "../../components/common/SectionCard";
import { EnrolledStudentPicker } from "../../components/fee/EnrolledStudentPicker";
import { env } from "../../config/env";
import { amountInWords } from "../../lib/amountInWords";
import {
  enrollmentClassName,
  enrollmentSectionName,
  enrollmentStudentName,
} from "../../lib/enrollmentDisplay";
import { installmentMonthName } from "../../lib/installmentMonths";
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
const thClasses = "py-2 pr-3 font-medium";
const PAY_MODES: PaymentMode[] = ["cash", "upi", "cheque", "online", "card"];

const todayISO = () => new Date().toISOString().slice(0, 10);
const money = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function photoUrl(image?: string): string | null {
  return image ? `${env.apiBaseUrl}/uploads/studentImage/${encodeURIComponent(image)}` : null;
}

// ---------------------------------------------------------------- profile

function StudentProfileCard({ row, sessionName }: { row: EnrollmentRow; sessionName: string }) {
  const reg = typeof row.studentId.regno === "string" ? null : row.studentId.regno;
  const url = photoUrl(reg?.Image);
  const roll = Number(row.rollNo) ? String(row.rollNo) : "—";
  const classText = [enrollmentClassName(row), enrollmentSectionName(row)].filter(Boolean).join(" / ") || "—";

  const details: [string, string][] = [
    ["Student's Name", enrollmentStudentName(row) || "—"],
    ["Father's Name", reg?.fname || "—"],
    ["Mother's Name", reg?.mname || "—"],
    ["Admission No", row.studentId.admno || "—"],
    ["Class / Sec / Roll", `${classText} / ${roll}`],
    ["Session", sessionName],
  ];

  return (
    <SectionCard title="Student Details" icon={User}>
      <div className="flex items-start gap-4">
        {url ? (
          <img src={url} alt="" className="h-20 w-20 shrink-0 rounded-md border border-line object-cover" />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md border border-line bg-paper text-ink-soft">
            <User size={28} />
          </div>
        )}
        <dl className="grid flex-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          {details.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs uppercase tracking-wide text-ink-soft">{label}</dt>
              <dd className="font-medium text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </SectionCard>
  );
}

// -------------------------------------------------------------- collector

interface CollectorProps {
  studentId: string;
  schId: string;
  sessionId: string;
  sessionName: string;
  /** Student card, rendered at the top of the left column. */
  profile: ReactNode;
  onCollected: (message: string) => void;
}

type TileState = "paid" | "due" | "none";
interface HeadInfo {
  demandId: string;
  feetype: string;
  amt: number;
}

function MonthlyFeeCollector({ studentId, schId, sessionId, sessionName, profile, onCollected }: CollectorProps) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dueMonths, setDueMonths] = useState<MonthlyDueMonth[]>([]);
  const [paidNos, setPaidNos] = useState<number[]>([]);
  const [advanceBalance, setAdvanceBalance] = useState(0);
  // Every fee head of each unpaid month (incl. zero-amount / cleared heads), keyed by month no.
  const [allHeads, setAllHeads] = useState<Record<number, HeadInfo[]>>({});

  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [unticked, setUnticked] = useState<Record<string, boolean>>({}); // fee heads left out of this payment

  const [mode, setMode] = useState<PaymentMode>("cash");
  const [refNo, setRefNo] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayISO());
  const [advanceAmount, setAdvanceAmount] = useState("0");
  const [collecting, setCollecting] = useState(false);
  const [collectError, setCollectError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      // Which months are already paid. Optional: the grid still works without it.
      feeService.getPaymentDetailMonthly(studentId, sessionId, schId).catch(() => null),
      // Exact due per fee head (the payment-detail API only has net amounts).
      feeService.getMonthlyDues(studentId, sessionId, schId),
    ])
      .then(([paidRes, duesRes]) => {
        if (cancelled) return;
        const months = [...(duesRes.data.months ?? [])].sort((a, b) => a.installmentMonthNo - b.installmentMonthNo);
        setDueMonths(months);
        setPaidNos((paidRes?.data.pinst ?? []).map((p) => p.instno));
        setAllHeads(
          Object.fromEntries(
            (paidRes?.data.dinst ?? []).map((d) => [
              d.instno,
              d.feedet.map((f) => ({ demandId: f._id, feetype: f.feetype, amt: f.amt })),
            ])
          )
        );
        setAdvanceBalance(duesRes.data.advanceBalance ?? 0);
        const initial: Record<string, string> = {};
        months.forEach((m) => m.items.forEach((i) => (initial[i.demandId] = String(i.dueAmount))));
        setAmounts(initial);
        // The oldest unpaid month is pre-selected; that's what is usually paid first.
        setSelected(months[0] ? { [months[0].installmentMonthNo]: true } : {});
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : "Could not load fee details.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId, sessionId, schId]);

  const dueByNo = new Map(dueMonths.map((m) => [m.installmentMonthNo, m]));
  const allNos = [...paidNos, ...dueMonths.map((m) => m.installmentMonthNo)];
  const tileNos = Array.from({ length: Math.max(12, ...allNos) }, (_, i) => i + 1);
  const tileState = (no: number): TileState => (dueByNo.has(no) ? "due" : paidNos.includes(no) ? "paid" : "none");

  const selectedMonths = dueMonths.filter((m) => selected[m.installmentMonthNo]);
  // All heads of the selected months. `item` is set only for heads that still have a due amount.
  const rows = selectedMonths.flatMap((m) => {
    const dueByDemand = new Map(m.items.map((i) => [i.demandId, i]));
    const heads: HeadInfo[] = [...(allHeads[m.installmentMonthNo] ?? [])];
    m.items.forEach((i) => {
      if (!heads.some((h) => h.demandId === i.demandId))
        heads.push({ demandId: i.demandId, feetype: i.feetype, amt: i.netAmount });
    });
    return heads.map((head) => ({ month: m, head, item: dueByDemand.get(head.demandId) }));
  });
  const included = rows.flatMap((r) =>
    r.item && !unticked[r.item.demandId] ? [{ month: r.month, item: r.item }] : []
  );

  const installmentTotal = included.reduce((s, r) => s + (Number(amounts[r.item.demandId]) || 0), 0);
  const extraAdvance = Number(advanceAmount) || 0;
  const paidAmount = installmentTotal + extraAdvance;
  const totalDue = dueMonths.reduce((s, m) => s + m.monthDue, 0);
  const currentDues = Math.max(totalDue - installmentTotal, 0);
  const selectedDue = selectedMonths.reduce((s, m) => s + m.monthDue, 0);
  const firstSelectedNo = selectedMonths.length ? Math.min(...selectedMonths.map((m) => m.installmentMonthNo)) : Infinity;
  const previousDues = dueMonths
    .filter((m) => !selected[m.installmentMonthNo] && m.installmentMonthNo < firstSelectedNo)
    .reduce((s, m) => s + m.monthDue, 0);

  async function handleCollect() {
    setCollectError(null);
    const lines: CollectFeeLine[] = [];
    for (const { month, item } of included) {
      const amount = Number(amounts[item.demandId]) || 0;
      if (amount > item.dueAmount) {
        setCollectError(
          `Amount for "${item.feetype}" (${installmentMonthName(month.installmentMonthNo)}) exceeds the due amount (${item.dueAmount}).`
        );
        return;
      }
      if (amount > 0) lines.push({ demandId: item.demandId, amount });
    }
    if (!lines.length) {
      setCollectError("Select at least one month and fee head with an amount greater than 0.");
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
        advanceAmount: extraAdvance,
      });
      onCollected(
        res.data ? `Payment collected — receipt no. ${res.data.receiptNo}.` : res.message || "Payment collected."
      );
    } catch (err) {
      setCollectError(err instanceof ApiError ? err.message : "Could not collect this payment. Please try again.");
      setCollecting(false);
    }
  }

  if (loading || loadError) {
    return (
      <div className="space-y-6">
        {profile}
        {loading ? (
          <p className="flex items-center gap-1.5 text-sm text-ink-soft">
            <Loader2 size={14} className="animate-spin" /> Loading fee details…
          </p>
        ) : (
          <p className="flex items-center gap-1.5 text-sm text-red-600">
            <AlertCircle size={14} /> {loadError}
          </p>
        )}
      </div>
    );
  }

  const tileClasses: Record<TileState | "selected", string> = {
    paid: "border-emerald-300 bg-emerald-50 text-emerald-700",
    due: "border-amber-300 bg-amber-50 text-ink hover:border-marigold",
    selected: "border-marigold bg-marigold/20 text-ink ring-2 ring-marigold/40",
    none: "border-line bg-paper text-ink-soft opacity-60",
  };
  const tileCaption: Record<TileState | "selected", string> = {
    paid: "Paid",
    due: "Due",
    selected: "Selected",
    none: "—",
  };
  const allSelected = selectedMonths.length === dueMonths.length;
  const statClasses = "rounded-md border border-line bg-paper px-3 py-2";

  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      {/* ---------------- left: student + fee heads of the chosen months ---------------- */}
      <div className="space-y-6">
        {profile}
        <SectionCard title="Installment / Monthly Fee Heads" icon={IndianRupee}>
          {dueMonths.length === 0 ? (
            <p className="flex items-center gap-1.5 text-sm text-emerald-700">
              <CheckCircle2 size={14} /> No monthly fee is due for this student.
            </p>
          ) : selectedMonths.length === 0 ? (
            <p className="text-sm text-ink-soft">Select a month from the grid to see its fee heads.</p>
          ) : (
            <div className="space-y-4">
              {selectedMonths.map((m) => {
                const monthRows = rows.filter((r) => r.month === m);
                const monthPay = monthRows.reduce(
                  (sum, r) => sum + (r.item && !unticked[r.item.demandId] ? Number(amounts[r.item.demandId]) || 0 : 0),
                  0
                );
                return (
                  <div key={m.installmentMonthNo} className="overflow-hidden rounded-md border border-line">
                    <div className="flex items-center justify-between bg-paper px-3 py-2 text-sm">
                      <span className="font-semibold text-ink">{installmentMonthName(m.installmentMonthNo)}</span>
                      <span className="text-xs text-ink-soft">Due {money(m.monthDue)}</span>
                    </div>
                    <div className="overflow-x-auto px-3">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
                            <th className={thClasses}>Pay</th>
                            <th className={thClasses}>Head Name</th>
                            <th className={`${thClasses} text-right`}>Due</th>
                            <th className={`${thClasses} text-right`}>Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {monthRows.map(({ head, item }) => {
                            if (!item) {
                              // Nothing left to pay (zero-amount or already cleared): shown, read-only.
                              return (
                                <tr key={head.demandId} className="text-ink-soft">
                                  <td className="py-2 pr-3">
                                    <input type="checkbox" disabled checked={false} aria-label={`${head.feetype} has no due`} />
                                  </td>
                                  <td className="py-2 pr-3">{head.feetype}</td>
                                  <td className="py-2 pr-3 text-right">0</td>
                                  <td className="py-2 text-right text-xs">{head.amt > 0 ? "Paid" : "No charge"}</td>
                                </tr>
                              );
                            }
                            const off = !!unticked[item.demandId];
                            return (
                              <tr key={item.demandId} className={off ? "opacity-50" : ""}>
                                <td className="py-2 pr-3">
                                  <input
                                    type="checkbox"
                                    aria-label={`Pay ${item.feetype} for ${installmentMonthName(m.installmentMonthNo)}`}
                                    checked={!off}
                                    onChange={(e) => setUnticked((prev) => ({ ...prev, [item.demandId]: !e.target.checked }))}
                                  />
                                </td>
                                <td className="py-2 pr-3">{item.feetype}</td>
                                <td className="py-2 pr-3 text-right">{item.dueAmount}</td>
                                <td className="py-2 text-right">
                                  <input
                                    type="number"
                                    min={0}
                                    max={item.dueAmount}
                                    disabled={off}
                                    value={amounts[item.demandId] ?? ""}
                                    onChange={(e) => setAmounts((prev) => ({ ...prev, [item.demandId]: e.target.value }))}
                                    className={`${inputClasses} w-24 text-right`}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex justify-between border-t border-line px-3 py-2 text-xs text-ink-soft">
                      <span>Paying for {installmentMonthName(m.installmentMonthNo)}</span>
                      <span className="font-medium text-ink">{money(monthPay)}</span>
                    </div>
                  </div>
                );
              })}
              <div className="flex justify-between rounded-md bg-chalkboard/5 px-3 py-2 text-sm font-semibold text-ink">
                <span>Installment Total</span>
                <span>{money(installmentTotal)}</span>
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      {/* ---------------- right: months, summary, payment ---------------- */}
      <div className="space-y-6">
        <SectionCard title="Installment / Months Selection" icon={IndianRupee}>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-6">
              {tileNos.map((no) => {
                const state = tileState(no);
                const isSelected = state === "due" && !!selected[no];
                const visual = isSelected ? "selected" : state;
                return (
                  <button
                    key={no}
                    type="button"
                    disabled={state !== "due"}
                    aria-pressed={isSelected}
                    onClick={() => setSelected((prev) => ({ ...prev, [no]: !prev[no] }))}
                    className={`flex flex-col items-center gap-1 rounded-md border px-2 py-2 text-center text-xs transition ${
                      tileClasses[visual]
                    } ${state === "due" ? "cursor-pointer" : "cursor-not-allowed"}`}
                  >
                    {state === "paid" || isSelected ? <CheckCircle2 size={16} /> : <Circle size={16} className="opacity-50" />}
                    <span className="font-medium">{installmentMonthName(no)}</span>
                    <span className="text-[10px] uppercase tracking-wide opacity-80">{tileCaption[visual]}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-soft">
              <span className="flex flex-wrap gap-x-3 gap-y-1">
                <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-emerald-400" /> Paid</span>
                <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-amber-400" /> Due</span>
                <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-marigold" /> Selected</span>
              </span>
              {dueMonths.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setSelected(allSelected ? {} : Object.fromEntries(dueMonths.map((m) => [m.installmentMonthNo, true])))
                  }
                  className="text-sm font-medium text-marigold-dark hover:underline"
                >
                  {allSelected ? "Clear selection" : "Select all due months"}
                </button>
              )}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Payable Amount" icon={IndianRupee}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className={statClasses}>
                <p className="text-xs text-ink-soft">Previous Dues</p>
                <p className="font-semibold text-ink">{money(previousDues)}</p>
              </div>
              <div className={statClasses}>
                <p className="text-xs text-ink-soft">Advance Balance</p>
                <p className="font-semibold text-ink">{money(advanceBalance)}</p>
              </div>
              <div className={statClasses}>
                <p className="text-xs text-ink-soft">Selected Due</p>
                <p className="font-semibold text-ink">{money(selectedDue)}</p>
              </div>
              <div className={statClasses}>
                <p className="text-xs text-ink-soft">Dues After Payment</p>
                <p className="font-semibold text-ink">{money(currentDues)}</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <p className={labelClasses}>Installment Total</p>
                <p className="rounded-md border border-line bg-paper px-3 py-2 text-sm font-medium text-ink">
                  {money(installmentTotal)}
                </p>
              </div>
              <div className="space-y-1">
                <label htmlFor="mf-adv" className={labelClasses}>Extra Advance</label>
                <input
                  id="mf-adv"
                  type="number"
                  min={0}
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(e.target.value)}
                  className={inputClasses}
                />
              </div>
            </div>
            <div className="rounded-md border border-marigold bg-marigold/10 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-ink-soft">Pay Amount</p>
              <p className="text-2xl font-semibold text-ink">{money(paidAmount)}</p>
              <p className="mt-1 text-xs font-medium text-ink-soft">{amountInWords(paidAmount)}</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Payment Mode" icon={IndianRupee}>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
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
            </div>
            {collectError && (
              <p className="flex items-center gap-1.5 text-xs text-red-600">
                <AlertCircle size={13} /> {collectError}
              </p>
            )}
            <button
              type="button"
              onClick={handleCollect}
              disabled={collecting || dueMonths.length === 0}
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-marigold px-4 py-3 text-sm font-semibold text-ink hover:bg-marigold-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {collecting ? <Loader2 size={16} className="animate-spin" /> : <IndianRupee size={16} />}
              Collect {money(paidAmount)}
            </button>
            <p className="text-center text-xs text-ink-soft">Session {sessionName}</p>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------- page

function CollectMonthlyFeeContent({
  schId,
  sessionId,
  sessionName,
}: {
  schId: string;
  sessionId: string;
  sessionName: string;
}) {
  const [student, setStudent] = useState<EnrollmentRow | null>(null);
  // Bumping this remounts the collector so the fees are fetched again after a payment.
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
        <>
          <MonthlyFeeCollector
            key={`${student.studentId._id}:${reloadKey}`}
            studentId={student.studentId._id}
            schId={schId}
            sessionId={sessionId}
            sessionName={sessionName}
            profile={<StudentProfileCard row={student} sessionName={sessionName} />}
            onCollected={(msg) => {
              setMessage(msg);
              setReloadKey((k) => k + 1);
            }}
          />
        </>
      )}
    </div>
  );
}

function CollectMonthlyFeePage() {
  return (
    <SchoolSessionGate eyebrow="Fee Options" title="Collect Monthly Fee">
      {({ schId, sessionId, sessionName }) => (
        <CollectMonthlyFeeContent schId={schId} sessionId={sessionId} sessionName={sessionName} />
      )}
    </SchoolSessionGate>
  );
}

export default CollectMonthlyFeePage;
