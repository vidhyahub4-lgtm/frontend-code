import { apiRequest } from "../lib/httpClient";
import type {
  GetAttendanceResponse,
  MarkAttendanceRequest,
  MarkAttendanceResponse,
} from "../types/attendance.types";

export const attendanceService = {
  markAttendance(payload: MarkAttendanceRequest) {
    return apiRequest<MarkAttendanceResponse>("/api/attendance/mark", {
      method: "POST",
      body: payload,
    });
  },
  getAttendance(params: { schId: string; session: string; class: string; section: string; date: string }) {
    return apiRequest<GetAttendanceResponse>(
      `/api/attendance?${new URLSearchParams(params).toString()}`,
      { method: "GET" }
    );
  },
};
