import { apiRequest } from "../lib/httpClient";
import type {
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
