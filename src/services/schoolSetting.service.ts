import { apiRequest } from "../lib/httpClient";
import type { ApiAckResponse } from "../types/api.types";
import type {
  CreateNewRegistrationResponse,
  GetAllNewRegistrationsResponse,
  GetRegisteredStudentByIdResponse,
  AdmitStudentRequest,
  AdmitStudentResponse,
} from "../types/studentRegistration.types";
import type {
  CreateSchClassRequest,
  GetSchClassesResponse,
  CreateFeePlanSetupRequest,
  CreateFeePlanSetupResponse,
  GetFeePlanSetupsResponse,
  UpdateFeePlanSetupRequest,
  GetSchHouseResponse,
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

  // ---- Student Management: Admission ----
  // NOTE: the backend route is GET /school-settings/get-register-studbyid but the
  // controller currently reads `regno`/`schId` off req.body. A browser's fetch()
  // throws if you attach a body to a GET request, so that controller needs to be
  // updated to read from req.query (regno/schId) for this call to work end to end.
  getRegisteredStudentById(regno: string, schId: string) {
    return apiRequest<GetRegisteredStudentByIdResponse>(
      `/school-settings/get-register-studbyid?regno=${encodeURIComponent(regno)}&schId=${encodeURIComponent(schId)}`,
      { method: "GET" }
    );
  },
  admitStudent(payload: AdmitStudentRequest) {
    return apiRequest<AdmitStudentResponse>("/school-settings/stud-admission", {
      method: "POST",
      body: payload,
    });
  },
  // NOTE: backend's getSchHouse doesn't actually filter by schId (returns every
  // school's houses) — a backend bug, not something fixable from here.
  getSchHouse() {
    return apiRequest<GetSchHouseResponse>("/school-settings/get-sch-house", {
      method: "GET",
    });
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
    return apiRequest<CreateFeePlanSetupResponse>("/school-settings/create-feeplansetup", {
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
