import { apiRequest } from "../lib/httpClient";
import type {
  CancelReceiptRequest,
  CancelReceiptResponse,
  GetMonthlyDuesResponse,
  GetReceiptsResponse,
  GetStudentDuesResponse,
  CollectFeeRequest,
  CollectFeeResponse,
  GetAdmissionDuesResponse,
  GetEnrollmentListResponse,
} from "../types/fee.types";

export const feeService = {
  // ---- Student Management: Admission fee ----
  getAdmissionDues(studentId: string, session: string, schId: string) {
    return apiRequest<GetAdmissionDuesResponse>(
      `/api/fees/students/${encodeURIComponent(studentId)}/admission-due?session=${encodeURIComponent(
        session
      )}&schId=${encodeURIComponent(schId)}`,
      { method: "GET" }
    );
  },
  // ---- Fee Options ----
  getMonthlyDues(studentId: string, session: string, schId: string) {
    return apiRequest<GetMonthlyDuesResponse>(
      `/api/fees/students/${encodeURIComponent(studentId)}/monthly-due?session=${encodeURIComponent(
        session
      )}&schId=${encodeURIComponent(schId)}`,
      { method: "GET" }
    );
  },
  getStudentDues(studentId: string, session: string, schId: string) {
    return apiRequest<GetStudentDuesResponse>(
      `/api/fees/students/${encodeURIComponent(studentId)}/dues?session=${encodeURIComponent(
        session
      )}&schId=${encodeURIComponent(schId)}`,
      { method: "GET" }
    );
  },
  listReceipts(params: { schId: string; session: string; studentId: string }) {
    return apiRequest<GetReceiptsResponse>(
      `/api/fees/receipts?${new URLSearchParams(params).toString()}`,
      { method: "GET" }
    );
  },
  cancelReceipt(receiptId: string, payload: CancelReceiptRequest) {
    return apiRequest<CancelReceiptResponse>(
      `/api/fees/receipts/${encodeURIComponent(receiptId)}/cancel`,
      { method: "POST", body: payload }
    );
  },
  collectFee(payload: CollectFeeRequest) {
    return apiRequest<CollectFeeResponse>("/api/fees/collect", {
      method: "POST",
      body: payload,
    });
  },

  // ---- Used to resolve a StudentAdmission `_id` from a registration when a
  // student is already admitted (the admission API's 409 doesn't return it). ----
  getEnrollmentList(schId: string, session: string) {
    return apiRequest<GetEnrollmentListResponse>(
      `/school-settings/enrollment-list?schId=${encodeURIComponent(schId)}&session=${encodeURIComponent(
        session
      )}`,
      { method: "GET" }
    );
  },
};
