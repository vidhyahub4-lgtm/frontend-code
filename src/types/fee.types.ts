/** One unpaid/partial fee-demand line, as returned by the dues endpoints. */
export interface FeeDueItem {
  demandId: string;
  headType?: "admission" | "monthly" | string;
  feetype: string;
  installmentMonthId?: string;
  installmentMonthNo?: number;
  netAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: "unpaid" | "partial" | "cancelled" | string;
}

export interface FeeDuesData {
  items: FeeDueItem[];
  totalDue: number;
  advanceBalance: number;
}

/** GET /api/fees/students/:studentId/admission-due?session=&schId= */
export interface GetAdmissionDuesResponse {
  success: boolean;
  data: FeeDuesData;
}

/** One row of an enrollment, as returned by GET /school-settings/enrollment-list. */
export interface EnrollmentRow {
  _id: string;
  classID: { _id: string; className?: string } | string;
  sectionId: { _id: string; sectionName?: string } | string;
  rollNo?: string | number | null; // 0 / null = no roll number
  studentId: {
    _id: string; // StudentAdmission _id — this is the `studentId` the fee APIs expect
    admno: string;
    pystatus?: "pending" | "done" | "reject";
    regno:
      | { _id: string; sname?: string; fname?: string; mname?: string; Image?: string; regno?: string }
      | string;
  };
}

export interface GetEnrollmentListResponse {
  success: boolean;
  count: number;
  data: EnrollmentRow[];
}

export type PaymentMode = "cash" | "upi" | "cheque" | "online" | "card";

export interface CollectFeeLine {
  demandId: string;
  amount: number;
}

/** POST /api/fees/collect */
export interface CollectFeeRequest {
  schId: string;
  session: string;
  studentId: string;
  mode: PaymentMode;
  refNo?: string;
  paymentDate?: string;
  lines: CollectFeeLine[];
  advanceAmount?: number;
}

export interface CollectFeeResponse {
  success: boolean;
  message: string;
  data?: {
    _id: string;
    receiptNo: string | number;
    paymentDate: string;
    mode: PaymentMode;
    lines: CollectFeeLine[];
    advanceAmount: number;
  };
}

/** GET /api/fees/students/:studentId/dues?session=&schId= */
export interface GetStudentDuesResponse {
  success: boolean;
  data: FeeDuesData;
}

// ---- Monthly dues, grouped by installment month ----
export interface MonthlyDueItem {
  demandId: string;
  feetype: string;
  netAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: string;
}
export interface MonthlyDueMonth {
  installmentMonthId: string;
  installmentMonthNo: number;
  items: MonthlyDueItem[];
  monthDue: number;
}
/** GET /api/fees/students/:studentId/monthly-due?session=&schId= */
export interface GetMonthlyDuesResponse {
  success: boolean;
  data: { months: MonthlyDueMonth[]; totalDue: number; advanceBalance: number };
}

// ---- Receipts ----
export interface FeeReceiptLine {
  demandId: string;
  headType: string;
  feetype: string;
  installmentMonthId?: string | null;
  amount: number;
}
export interface FeeReceiptRecord {
  _id: string;
  receiptNo: number;
  paymentDate: string;
  mode: PaymentMode;
  refNo?: string;
  lines: FeeReceiptLine[];
  totalAmount: number;
  advanceAmount: number;
  status: "active" | "cancelled";
  cancelledAt?: string;
  cancelReason?: string;
}
/** GET /api/fees/receipts?schId=&session=&studentId=&from=&to= */
export interface GetReceiptsResponse {
  success: boolean;
  count: number;
  data: FeeReceiptRecord[];
}
/** POST /api/fees/receipts/:receiptId/cancel */
export interface CancelReceiptRequest {
  schId: string;
  reason: string;
}
export interface CancelReceiptResponse {
  success: boolean;
  message: string;
}

/** GET /api/fees/students/payment-detail-monthly?schId=&session=&studentId= */
export interface PaymentDetailMonthlyData {
  /** Installments that are fully paid. */
  pinst: { _id: string; instno: number }[];
  /** Installments that still have a balance (amt is the NET total, not the due). */
  dinst: { _id: string; instno: number; feedet: { _id: string; feetype: string; amt: number }[]; amt: number }[];
}
export interface GetPaymentDetailMonthlyResponse {
  success: boolean;
  data: PaymentDetailMonthlyData;
}

// ---- Fee Setting: Generate Fee Demand ----

/** POST /api/fees/demands/monthly. `session` is the session `_id`; omit `classID` for every configured class. */
export interface GenerateMonthlyDemandsRequest {
  schId: string;
  session: string;
  classID?: string;
  /** Instalment month numbers to generate. If any is missing for a class in scope, the backend generates nothing. */
  installmentMonthNos: number[];
}
export interface GenerateMonthlyDemandsData {
  /** Active enrolled students found in the selected class(es). */
  students: number;
  /** New demand rows created (existing ones are left untouched, so re-running is safe). */
  created: number;
  skippedNoFeePlan: number;
  skippedClasses: string[];
  /** Class ids that have no instalment for the chosen month. */
  notConfiguredForThisMonth: string[];
  /** New demand rows per month (present when generating months in one go). */
  months?: { monthNo: number; label: string; created: number }[];
}
export interface GenerateMonthlyDemandsResponse {
  success: boolean;
  message: string;
  data: GenerateMonthlyDemandsData;
}
