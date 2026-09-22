import { apiRequest } from "../lib/httpClient";
import type { ApiAckResponse } from "../types/api.types";
import type {
  CreateNewRegistrationResponse,
  GetAllNewRegistrationsResponse,
} from "../types/studentRegistration.types";
import type {
  CreateSchClassRequest,
  GetSchClassesResponse,
  CreateFeePlanSetupRequest,
  GetFeePlanSetupsResponse,
  UpdateFeePlanSetupRequest,
} from "../types/superadmin.types";

export const schoolSettingService = {
  // ---- Student Management: New Registration (multipart: fields + `Image` file) ----
  createNewRegistration(formData: FormData) {
    return apiRequest<CreateNewRegistrationResponse>("/school-settings/new-registration", {
      method: "POST",
      body: formData,
      bodyType: "multipart",
      timeoutMs: 30_000, // photo upload can be slower than a normal JSON call
    });
  },
  getAllNewRegistrations(schId: string) {
    return apiRequest<GetAllNewRegistrationsResponse>(
      `/school-settings/get-all-newregstration?schId=${encodeURIComponent(schId)}`,
      { method: "GET" }
    );
  },


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

  // ---- Fee Setting: Fee Plan Setup ----
  createFeePlanSetup(payload: CreateFeePlanSetupRequest) {
    return apiRequest<ApiAckResponse>("/school-settings/create-feeplansetup", {
      method: "POST",
      body: payload,
    });
  },
  updateFeePlanSetup(planId: string, payload: UpdateFeePlanSetupRequest) {
    return apiRequest<ApiAckResponse>(`/school-settings/feeplansetup/${encodeURIComponent(planId)}`, {
      method: "PATCH",
      body: payload,
    });
  },
  getFeePlanSetups(schId?: string) {
    const query = schId ? `?schId=${encodeURIComponent(schId)}` : "";
    return apiRequest<GetFeePlanSetupsResponse>(
      `/school-settings/get-feeplansetup${query}`,
      { method: "GET" }
    );
  },
};
