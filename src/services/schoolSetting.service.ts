import { apiRequest } from "../lib/httpClient";
import type { ApiAckResponse } from "../types/api.types";
import type {
  CreateSchClassRequest,
  GetSchClassesResponse,
} from "../types/superadmin.types";

export const schoolSettingService = {
  // ---- Class/Section Setup (maps a global Class+Section to a School) ----
  createSchClass(payload: CreateSchClassRequest) {
    return apiRequest<ApiAckResponse>("/school-settings/create-sch-class", {
      method: "POST",
      body: payload,
    });
  },
  getSchClasses(schoolID?: string) {
    const query = schoolID ? `?schoolID=${encodeURIComponent(schoolID)}` : "";
    return apiRequest<GetSchClassesResponse>(
      `/school-settings/get-sch-class${query}`,
      { method: "GET" }
    );
  },
};
