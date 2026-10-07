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
  rollNo?: string;
  studentId: {
    _id: string; // StudentAdmission _id — this is the `studentId` the fee APIs expect
    admno: string;
    pystatus?: "pending" | "done" | "reject";
    regno: { _id: string; sname?: string; regno?: string } | string;
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
