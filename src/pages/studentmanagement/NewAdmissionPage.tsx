import { useMemo, useState } from "react";
import {
  Bus,
  GraduationCap,
  Mail,
  MessageSquare,
  Plus,
  Save,
  Search,
  UserCircle,
  Wallet,
} from "lucide-react";
import { SectionCard } from "../../components/common/SectionCard";

const inputClasses =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-marigold/40";
const readonlyInputClasses = `${inputClasses} cursor-not-allowed bg-chalk/60 text-ink-soft`;
const labelClasses = "text-sm font-medium text-ink-soft";
const secondaryButtonClasses =
  "flex items-center justify-center gap-1.5 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-ink transition hover:bg-chalk";

interface FeeHeadRow {
  id: number;
  headName: string;
  amount: string;
  exempt: boolean;
  concession: string;
}

const EMPTY_FEE_ROWS: FeeHeadRow[] = [
  { id: 1, headName: "Admission Fee", amount: "0", exempt: false, concession: "0" },
  { id: 2, headName: "Monthly Tuition Fee", amount: "0", exempt: false, concession: "0" },
];

function NewAdmissionPage() {
  const [regNo, setRegNo] = useState("");
  const [admNo, setAdmNo] = useState("");
  const [admissionDate, setAdmissionDate] = useState(new Date().toISOString().slice(0, 10));

  const [studentClass, setStudentClass] = useState("");
  const [section, setSection] = useState("");
  const [roll, setRoll] = useState("");
  const [feeType, setFeeType] = useState("");
  const [stream, setStream] = useState("NA");
  const [house, setHouse] = useState("NA");
  const [group, setGroup] = useState("NA");

  const [enableTransport, setEnableTransport] = useState(false);
  const [enableHostel, setEnableHostel] = useState(false);

  const [feeRows, setFeeRows] = useState<FeeHeadRow[]>(EMPTY_FEE_ROWS);
  const [includeInstallments, setIncludeInstallments] = useState(false);

  const [lateFine, setLateFine] = useState("0");
  const [soc, setSoc] = useState("0");
  const [misc, setMisc] = useState("0");
  const [feeCharge, setFeeCharge] = useState("0");
  const [paidAmount, setPaidAmount] = useState("0");
  const [concessionReason, setConcessionReason] = useState("");
  const [feeDescription, setFeeDescription] = useState("");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [refNo, setRefNo] = useState("");
  const [bankName, setBankName] = useState("NA");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));

  function updateFeeRow(id: number, patch: Partial<FeeHeadRow>) {
    setFeeRows((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function handleResetFeeRows() {
    setFeeRows(EMPTY_FEE_ROWS);
  }

  const totals = useMemo(() => {
    const admissionFee = Number(feeRows.find((r) => r.headName === "Admission Fee")?.amount || 0);
    const monthlyFee = feeRows
      .filter((r) => r.headName !== "Admission Fee")
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const totalConcession = feeRows.reduce((sum, r) => sum + Number(r.concession || 0), 0);
    const exempted = feeRows
      .filter((r) => r.exempt)
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);

    const finalTotal =
      admissionFee +
      monthlyFee +
      Number(lateFine || 0) +
      Number(soc || 0) +
      Number(misc || 0) +
      Number(feeCharge || 0);
    const totalPayable = finalTotal - totalConcession - exempted;
    const dueAmount = totalPayable - Number(paidAmount || 0);

    return { admissionFee, monthlyFee, totalConcession, exempted, finalTotal, totalPayable, dueAmount };
  }, [feeRows, lateFine, soc, misc, feeCharge, paidAmount]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-marigold-dark">Student Management · Admission</p>
        <h1 className="mt-1 font-display text-2xl text-ink">New Admission</h1>
      </div>

      <SectionCard title="Find Registered Student" icon={Search}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <label htmlFor="regNo" className={labelClasses}>Registration No</label>
            <input id="regNo" value={regNo} onChange={(e) => setRegNo(e.target.value)} placeholder="Ex: 10071" className={inputClasses} />
          </div>
          <div className="space-y-1">
            <label htmlFor="admNo" className={labelClasses}>Admission No</label>
            <input id="admNo" value={admNo} onChange={(e) => setAdmNo(e.target.value)} className={inputClasses} />
          </div>
          <div className="space-y-1">
            <label htmlFor="admDate" className={labelClasses}>Admission Date</label>
            <input id="admDate" type="date" value={admissionDate} onChange={(e) => setAdmissionDate(e.target.value)} className={inputClasses} />
          </div>
          <div className="flex items-end gap-2">
            <button type="button" className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-marigold px-3 py-2 text-sm font-medium text-chalkboard transition hover:bg-marigold-dark">
              <Search size={14} /> Search Student
            </button>
          </div>
        </div>
        <p className="mt-3 text-xs text-ink-soft">
          Search isn't wired up yet — hook this up once the registration lookup API is available.
        </p>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Student Details" icon={UserCircle}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className={labelClasses}>Student Name</label>
              <input readOnly value="" placeholder="—" className={readonlyInputClasses} />
            </div>
            <div className="space-y-1">
              <label className={labelClasses}>Contact No</label>
              <input readOnly value="" placeholder="—" className={readonlyInputClasses} />
            </div>
            <div className="space-y-1">
              <label className={labelClasses}>DOB</label>
              <input readOnly value="" placeholder="—" className={readonlyInputClasses} />
            </div>
            <div className="space-y-1">
              <label className={labelClasses}>Email</label>
              <input readOnly value="" placeholder="—" className={readonlyInputClasses} />
            </div>
            <div className="space-y-1">
              <label className={labelClasses}>Father's Name</label>
              <input readOnly value="" placeholder="—" className={readonlyInputClasses} />
            </div>
            <div className="space-y-1">
              <label className={labelClasses}>Mother's Name</label>
              <input readOnly value="" placeholder="—" className={readonlyInputClasses} />
            </div>
            <div className="col-span-2 space-y-1">
              <label className={labelClasses}>Address</label>
              <input readOnly value="" placeholder="—" className={readonlyInputClasses} />
            </div>
            <div className="space-y-1">
              <label className={labelClasses}>Registration Date</label>
              <input readOnly value="" placeholder="—" className={readonlyInputClasses} />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Admission Class & Fee Type Selection" icon={GraduationCap}>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label htmlFor="admClass" className={labelClasses}>Class</label>
                <input id="admClass" value={studentClass} onChange={(e) => setStudentClass(e.target.value)} className={inputClasses} />
              </div>
              <div className="space-y-1">
                <label htmlFor="admSection" className={labelClasses}>Sec</label>
                <input id="admSection" value={section} onChange={(e) => setSection(e.target.value)} className={inputClasses} />
              </div>
              <div className="space-y-1">
                <label htmlFor="admRoll" className={labelClasses}>Roll</label>
                <input id="admRoll" value={roll} onChange={(e) => setRoll(e.target.value)} className={inputClasses} />
              </div>
            </div>

            <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-3">
              <div className="space-y-1">
                <label htmlFor="feeType" className={labelClasses}>Fee Type</label>
                <input id="feeType" value={feeType} onChange={(e) => setFeeType(e.target.value)} className={inputClasses} />
              </div>
              <div className="space-y-1">
                <label htmlFor="stream" className={labelClasses}>Stream</label>
                <select id="stream" value={stream} onChange={(e) => setStream(e.target.value)} className={inputClasses}>
                  <option value="NA">NA</option>
                  <option value="science">Science</option>
                  <option value="commerce">Commerce</option>
                  <option value="arts">Arts</option>
                </select>
              </div>
              <button type="button" className="rounded-md bg-marigold px-3 py-2 text-sm font-medium text-chalkboard transition hover:bg-marigold-dark">
                Add Subjects
              </button>
            </div>

            <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-3">
              <div className="space-y-1">
                <label htmlFor="house" className={labelClasses}>House</label>
                <select id="house" value={house} onChange={(e) => setHouse(e.target.value)} className={inputClasses}>
                  <option value="NA">NA</option>
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="group" className={labelClasses}>Group</label>
                <select id="group" value={group} onChange={(e) => setGroup(e.target.value)} className={inputClasses}>
                  <option value="NA">NA</option>
                </select>
              </div>
              <button type="button" className="rounded-md bg-marigold px-3 py-2 text-sm font-medium text-chalkboard transition hover:bg-marigold-dark">
                Add Siblings
              </button>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Transport or Hostel Allotment" icon={Bus}>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-1.5 text-sm text-ink">
            <input type="checkbox" checked={enableTransport} onChange={(e) => setEnableTransport(e.target.checked)} className="h-3.5 w-3.5 accent-marigold" />
            Enable Transport
          </label>
          <label className="flex items-center gap-1.5 text-sm text-ink">
            <input type="checkbox" checked={enableHostel} onChange={(e) => setEnableHostel(e.target.checked)} className="h-3.5 w-3.5 accent-marigold" />
            Enable Hostel
          </label>
        </div>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <SectionCard title="Admission Fee Head / Monthly Fee Head" icon={Wallet}>
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
                    <th className="py-2 pr-3 font-medium">SNo</th>
                    <th className="py-2 pr-3 font-medium">Head Name</th>
                    <th className="py-2 pr-3 font-medium">Amount</th>
                    <th className="py-2 pr-3 font-medium">Exempt</th>
                    <th className="py-2 pr-3 font-medium">Cons.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {feeRows.map((row, index) => (
                    <tr key={row.id}>
                      <td className="py-2 pr-3">{index + 1}</td>
                      <td className="py-2 pr-3">{row.headName}</td>
                      <td className="py-2 pr-3">
                        <input
                          value={row.amount}
                          onChange={(e) => updateFeeRow(row.id, { amount: e.target.value })}
                          className={`${inputClasses} w-24 py-1`}
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          type="checkbox"
                          checked={row.exempt}
                          onChange={(e) => updateFeeRow(row.id, { exempt: e.target.checked })}
                          className="h-3.5 w-3.5 accent-marigold"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          value={row.concession}
                          onChange={(e) => updateFeeRow(row.id, { concession: e.target.value })}
                          className={`${inputClasses} w-20 py-1`}
                        />
                      </td>
                    </tr>
                  ))}
                  <tr className="font-medium text-ink">
                    <td className="py-2 pr-3" colSpan={2}>Total</td>
                    <td className="py-2 pr-3">{totals.admissionFee + totals.monthlyFee}</td>
                    <td className="py-2 pr-3">{totals.exempted}</td>
                    <td className="py-2 pr-3">{totals.totalConcession}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
              <label className="flex items-center gap-1.5 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={includeInstallments}
                  onChange={(e) => setIncludeInstallments(e.target.checked)}
                  className="h-3.5 w-3.5 accent-marigold"
                />
                Include installments
              </label>
              <div className="flex gap-2">
                <button type="button" className="text-sm font-medium text-marigold-dark hover:underline">
                  Installment / Monthly Fee Details
                </button>
                <button type="button" onClick={handleResetFeeRows} className={secondaryButtonClasses}>
                  Reset
                </button>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Final Payment Amount & Payment Modes" icon={Wallet}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={labelClasses}>Admission Fee</label>
                <input readOnly value={totals.admissionFee} className={readonlyInputClasses} />
              </div>
              <div className="space-y-1">
                <label className={labelClasses}>Monthly Fee</label>
                <input readOnly value={totals.monthlyFee} className={readonlyInputClasses} />
              </div>
              <div className="space-y-1">
                <label htmlFor="lateFine" className={labelClasses}>Late Fine</label>
                <input id="lateFine" value={lateFine} onChange={(e) => setLateFine(e.target.value)} className={inputClasses} />
              </div>
              <div className="space-y-1">
                <label className={labelClasses}>Concession</label>
                <input readOnly value={totals.totalConcession} className={readonlyInputClasses} />
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <label htmlFor="soc" className={labelClasses}>SOC</label>
                  <input id="soc" value={soc} onChange={(e) => setSoc(e.target.value)} className={inputClasses} />
                </div>
                <button type="button" aria-label="Add SOC head" className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-marigold text-chalkboard hover:bg-marigold-dark">
                  <Plus size={15} />
                </button>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <label htmlFor="misc" className={labelClasses}>Misc.</label>
                  <input id="misc" value={misc} onChange={(e) => setMisc(e.target.value)} className={inputClasses} />
                </div>
                <button type="button" aria-label="Add misc head" className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-marigold text-chalkboard hover:bg-marigold-dark">
                  <Plus size={15} />
                </button>
              </div>
              <div className="space-y-1">
                <label htmlFor="feeCharge" className={labelClasses}>Fee Charge</label>
                <input id="feeCharge" value={feeCharge} onChange={(e) => setFeeCharge(e.target.value)} className={inputClasses} />
              </div>
              <div className="space-y-1">
                <label className={labelClasses}>Final Total</label>
                <input readOnly value={totals.finalTotal} className={readonlyInputClasses} />
              </div>
              <div className="space-y-1">
                <label className={labelClasses}>Exempted</label>
                <input readOnly value={totals.exempted} className={readonlyInputClasses} />
              </div>
              <div className="space-y-1">
                <label className={labelClasses}>Total Payable</label>
                <input readOnly value={totals.totalPayable} className={readonlyInputClasses} />
              </div>
              <div className="space-y-1">
                <label htmlFor="paidAmount" className={labelClasses}>Paid Amount</label>
                <input id="paidAmount" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} className={inputClasses} />
              </div>
              <div className="space-y-1">
                <label className={labelClasses}>Due Amount</label>
                <input readOnly value={totals.dueAmount} className={readonlyInputClasses} />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="concessionReason" className={labelClasses}>Concession Reason</label>
              <input id="concessionReason" value={concessionReason} onChange={(e) => setConcessionReason(e.target.value)} className={inputClasses} />
            </div>
            <div className="space-y-1">
              <label htmlFor="feeDescription" className={labelClasses}>Fee Description</label>
              <input id="feeDescription" value={feeDescription} onChange={(e) => setFeeDescription(e.target.value)} className={inputClasses} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="paymentMode" className={labelClasses}>Payment Mode</label>
                <select id="paymentMode" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className={inputClasses}>
                  <option value="cash">By Cash</option>
                  <option value="cheque">By Cheque</option>
                  <option value="online">Online</option>
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="refNo" className={labelClasses}>Ref No.</label>
                <input id="refNo" value={refNo} onChange={(e) => setRefNo(e.target.value)} className={inputClasses} />
              </div>
              <div className="space-y-1">
                <label htmlFor="bankName" className={labelClasses}>Bank Name</label>
                <select id="bankName" value={bankName} onChange={(e) => setBankName(e.target.value)} className={inputClasses}>
                  <option value="NA">NA</option>
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="paymentDate" className={labelClasses}>Date</label>
                <input id="paymentDate" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className={inputClasses} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-5 border-t border-line pt-3">
              <label className="flex items-center gap-1.5 text-sm text-ink-soft">
                <input type="checkbox" className="h-3.5 w-3.5 accent-marigold" />
                <MessageSquare size={14} /> SMS
              </label>
              <label className="flex items-center gap-1.5 text-sm text-ink-soft">
                <input type="checkbox" className="h-3.5 w-3.5 accent-marigold" />
                WhatsApp
              </label>
              <label className="flex items-center gap-1.5 text-sm text-ink-soft">
                <input type="checkbox" className="h-3.5 w-3.5 accent-marigold" />
                <Mail size={14} /> Email
              </label>
            </div>

            <button
              type="button"
              className="flex items-center justify-center gap-1.5 rounded-md bg-marigold px-4 py-2 text-sm font-medium text-chalkboard transition hover:bg-marigold-dark"
            >
              <Save size={15} /> Save Admission
            </button>
            <p className="text-xs text-ink-soft">
              Not yet connected to the backend — admission APIs don't exist yet.
            </p>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

export default NewAdmissionPage;
