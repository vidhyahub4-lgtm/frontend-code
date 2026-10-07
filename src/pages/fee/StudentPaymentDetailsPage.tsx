import { Fragment, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, FileText, Loader2 } from "lucide-react";
import { SchoolSessionGate } from "../../components/common/SchoolSessionGate";
import { SectionCard } from "../../components/common/SectionCard";
import { EnrolledStudentPicker } from "../../components/fee/EnrolledStudentPicker";
import { enrollmentStudentName } from "../../lib/enrollmentDisplay";
import { feeService } from "../../services/fee.service";
import { ApiError } from "../../types/api.types";
import type { EnrollmentRow, FeeDueItem, FeeReceiptRecord } from "../../types/fee.types";

const inputClasses =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-marigold/40";
const labelClasses = "text-sm font-medium text-ink-soft";
const thClasses = "py-2 pr-3 font-medium";

const dateOnly = (iso: string) => (iso ? iso.slice(0, 10) : "—");
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function dueMonthLabel(item: FeeDueItem): string {
  return item.installmentMonthNo ? `Month ${item.installmentMonthNo}` : cap(item.headType ?? "—");
}

interface DetailsProps {
  studentId: string;
  schId: string;
  sessionId: string;
  studentName: string;
  onChanged: (message: string) => void;
}

function PaymentDetails({ studentId, schId, sessionId, studentName, onChanged }: DetailsProps) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dues, setDues] = useState<FeeDueItem[]>([]);
  const [totalDue, setTotalDue] = useState(0);
  const [advanceBalance, setAdvanceBalance] = useState(0);
  const [receipts, setReceipts] = useState<FeeReceiptRecord[]>([]);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      feeService.getStudentDues(studentId, sessionId, schId),
      feeService.listReceipts({ schId, session: sessionId, studentId }),
    ])
      .then(([duesRes, receiptsRes]) => {
        if (cancelled) return;
        setDues(duesRes.data.items ?? []);
        setTotalDue(duesRes.data.totalDue ?? 0);
        setAdvanceBalance(duesRes.data.advanceBalance ?? 0);
        setReceipts(receiptsRes.data ?? []);
      })
      .catch((err) => {
        if (!cancelled)
          setLoadError(err instanceof ApiError ? err.message : "Could not load payment details.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId, sessionId, schId]);

  const visibleReceipts = receipts.filter((r) => {
    const day = dateOnly(r.paymentDate);
    return (!from || day >= from) && (!to || day <= to);
  });
  const paidTotal = receipts.filter((r) => r.status === "active").reduce((s, r) => s + r.totalAmount, 0);

  function toggleReceipt(id: string) {
    setOpenId((prev) => (prev === id ? null : id));
    setReason("");
    setCancelError(null);
  }

  async function handleCancel(receipt: FeeReceiptRecord) {
    if (!reason.trim()) {
      setCancelError("Please enter a reason for cancelling this receipt.");
      return;
    }
    setCancelling(true);
    setCancelError(null);
    try {
      await feeService.cancelReceipt(receipt._id, { schId, reason: reason.trim() });
      onChanged(`Receipt no. ${receipt.receiptNo} cancelled.`);
    } catch (err) {
      setCancelError(err instanceof ApiError ? err.message : "Could not cancel this receipt.");
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <SectionCard title={`Payment Details — ${studentName || "Student"}`} icon={FileText}>
        <p className="flex items-center gap-1.5 text-sm text-ink-soft">
          <Loader2 size={14} className="animate-spin" /> Loading payment details…
        </p>
      </SectionCard>
    );
  }
  if (loadError) {
    return (
      <SectionCard title={`Payment Details — ${studentName || "Student"}`} icon={FileText}>
        <p className="flex items-center gap-1.5 text-sm text-red-600">
          <AlertCircle size={14} /> {loadError}
        </p>
      </SectionCard>
    );
  }

  return (
    <div className="space-y-6">
      <SectionCard title={`Fee Summary — ${studentName || "Student"}`} icon={FileText}>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Total Due", value: totalDue },
              { label: "Total Paid", value: paidTotal },
              { label: "Advance Balance", value: advanceBalance },
            ].map((s) => (
              <div key={s.label} className="rounded-md border border-line bg-paper px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-ink-soft">{s.label}</p>
                <p className="mt-1 font-display text-xl text-ink">₹{s.value}</p>
              </div>
            ))}
          </div>
          {dues.length === 0 ? (
            <p className="flex items-center gap-1.5 text-sm text-emerald-700">
              <CheckCircle2 size={14} /> No dues pending.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
                    <th className={thClasses}>Fee Head</th>
                    <th className={thClasses}>Period</th>
                    <th className={thClasses}>Net</th>
                    <th className={thClasses}>Paid</th>
                    <th className={thClasses}>Due</th>
                    <th className={thClasses}>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {dues.map((d) => (
                    <tr key={d.demandId}>
                      <td className="py-2 pr-3">{d.feetype}</td>
                      <td className="py-2 pr-3">{dueMonthLabel(d)}</td>
                      <td className="py-2 pr-3">{d.netAmount}</td>
                      <td className="py-2 pr-3">{d.paidAmount}</td>
                      <td className="py-2 pr-3">{d.dueAmount}</td>
                      <td className="py-2 pr-3">{cap(d.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Receipts" icon={FileText}>
        <div className="space-y-4">
          <div className="grid max-w-md gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="rc-from" className={labelClasses}>From</label>
              <input id="rc-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClasses} />
            </div>
            <div className="space-y-1">
              <label htmlFor="rc-to" className={labelClasses}>To</label>
              <input id="rc-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClasses} />
            </div>
          </div>

          {visibleReceipts.length === 0 ? (
            <p className="text-sm text-ink-soft">
              {receipts.length === 0 ? "No payments recorded yet." : "No receipts in this date range."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
                    <th className={thClasses}>Receipt No</th>
                    <th className={thClasses}>Date</th>
                    <th className={thClasses}>Mode</th>
                    <th className={thClasses}>Amount</th>
                    <th className={thClasses}>Status</th>
                    <th className={thClasses} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {visibleReceipts.map((r) => (
                    <Fragment key={r._id}>
                      <tr>
                        <td className="py-2 pr-3">{r.receiptNo}</td>
                        <td className="py-2 pr-3">{dateOnly(r.paymentDate)}</td>
                        <td className="py-2 pr-3">{cap(r.mode)}</td>
                        <td className="py-2 pr-3">₹{r.totalAmount}</td>
                        <td className="py-2 pr-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              r.status === "cancelled" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-800"
                            }`}
                          >
                            {cap(r.status)}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-right">
                          <button
                            type="button"
                            onClick={() => toggleReceipt(r._id)}
                            className="text-sm font-medium text-marigold-dark hover:underline"
                          >
                            {openId === r._id ? "Hide" : "Details"}
                          </button>
                        </td>
                      </tr>
                      {openId === r._id && (
                        <tr>
                          <td colSpan={6} className="bg-paper px-3 py-3">
                            <div className="space-y-3">
                              <table className="w-full text-left text-sm">
                                <thead>
                                  <tr className="text-xs uppercase tracking-wide text-ink-soft">
                                    <th className={thClasses}>Fee Head</th>
                                    <th className={thClasses}>Amount</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {r.lines.map((l) => (
                                    <tr key={l.demandId}>
                                      <td className="py-1 pr-3">{l.feetype}</td>
                                      <td className="py-1 pr-3">₹{l.amount}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {r.advanceAmount > 0 && (
                                <p className="text-sm text-ink-soft">Extra advance added: ₹{r.advanceAmount}</p>
                              )}
                              {r.refNo && <p className="text-sm text-ink-soft">Ref no.: {r.refNo}</p>}
                              {r.status === "cancelled" ? (
                                <p className="text-sm text-red-700">
                                  Cancelled{r.cancelledAt ? ` on ${dateOnly(r.cancelledAt)}` : ""}
                                  {r.cancelReason ? ` — ${r.cancelReason}` : ""}
                                </p>
                              ) : (
                                <div className="flex flex-wrap items-end gap-3">
                                  <div className="min-w-60 flex-1 space-y-1">
                                    <label htmlFor={`cancel-${r._id}`} className={labelClasses}>
                                      Cancel reason
                                    </label>
                                    <input
                                      id={`cancel-${r._id}`}
                                      value={reason}
                                      onChange={(e) => setReason(e.target.value)}
                                      placeholder="Why is this receipt being cancelled?"
                                      className={inputClasses}
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleCancel(r)}
                                    disabled={cancelling}
                                    className="rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {cancelling ? "Cancelling…" : "Cancel Receipt"}
                                  </button>
                                </div>
                              )}
                              {cancelError && (
                                <p className="flex items-center gap-1.5 text-xs text-red-600">
                                  <AlertCircle size={13} /> {cancelError}
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

function StudentPaymentDetailsContent({ schId, sessionId }: { schId: string; sessionId: string }) {
  const [student, setStudent] = useState<EnrollmentRow | null>(null);
  // Bumping this remounts the details so everything is fetched again after a cancel.
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
        <PaymentDetails
          key={`${student.studentId._id}:${reloadKey}`}
          studentId={student.studentId._id}
          schId={schId}
          sessionId={sessionId}
          studentName={enrollmentStudentName(student)}
          onChanged={(msg) => {
            setMessage(msg);
            setReloadKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}

function StudentPaymentDetailsPage() {
  return (
    <SchoolSessionGate eyebrow="Fee Options" title="Student Payment Details">
      {({ schId, sessionId }) => <StudentPaymentDetailsContent schId={schId} sessionId={sessionId} />}
    </SchoolSessionGate>
  );
}

export default StudentPaymentDetailsPage;
