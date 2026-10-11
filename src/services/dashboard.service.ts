import { apiRequest } from "../lib/httpClient";
import type { GetDashboardSummaryResponse } from "../types/dashboard.types";

export const dashboardService = {
  getSummary(params: { schId: string; session: string }) {
    return apiRequest<GetDashboardSummaryResponse>(
      `/api/dashboard/summary?${new URLSearchParams(params).toString()}`,
      { method: "GET" }
    );
  },
};
