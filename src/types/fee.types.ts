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
