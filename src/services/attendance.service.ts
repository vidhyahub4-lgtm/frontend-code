import { apiRequest } from "../lib/httpClient";
import type {
  GetAttendanceLogsParams,
  GetAttendanceLogsResponse,
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
  /** Past-date change log (SuperAdmin only). Empty filters are left out of the query. */
  getAttendanceLogs(params: GetAttendanceLogsParams) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "") query.set(key, String(value));
    });
    return apiRequest<GetAttendanceLogsResponse>(`/api/attendance/logs?${query.toString()}`, {
      method: "GET",
    });
  },
};
