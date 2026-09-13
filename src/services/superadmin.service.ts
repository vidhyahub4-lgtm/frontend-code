import { apiRequest } from "../lib/httpClient";
import type { ApiAckResponse } from "../types/api.types";
import type {
  CreateBoardRequest,
  CreateCityRequest,
  CreateClassRequest,
  CreateInstituteTypeRequest,
  CreateSchoolRequest,
  CreateSchoolPayModeRequest,
  CreateSectionRequest,
  CreateSessionRequest,
  CreateStateRequest,
  CreateFeeHeadSetupRequest,
  CreateFeePlanTypeRequest,
  CheckSchoolCodeResponse,
  GetBoardsResponse,
  GetCitiesResponse,
  GetClassesResponse,
  GetInstituteTypesResponse,
  GetSchoolsResponse,
  GetSchoolPayModeResponse,
  UpdateFeeStructureEntryRequest,
  GetSectionsResponse,
  GetSessionsResponse,
  GetStatesResponse,
  GetFeeHeadSetupsResponse,
  GetFeePlanTypesResponse,
} from "../types/superadmin.types";

export const superAdminService = {
  // ---- Board ----
  createBoard(payload: CreateBoardRequest) {
    return apiRequest<ApiAckResponse>("/super-admin/create-board", {
      method: "POST",
      body: payload,
    });
  },
  getBoards() {
    return apiRequest<GetBoardsResponse>("/super-admin/get-board", {
      method: "GET",
    });
  },

  // ---- Institute Type ----
  createInstituteType(payload: CreateInstituteTypeRequest) {
    return apiRequest<ApiAckResponse>("/super-admin/create-institute-type", {
      method: "POST",
      body: payload,
    });
  },
  getInstituteTypes() {
    return apiRequest<GetInstituteTypesResponse>(
      "/super-admin/get-institute-type",
      { method: "GET" }
    );
  },

  // ---- State ----
  createState(payload: CreateStateRequest) {
    return apiRequest<ApiAckResponse>("/super-admin/create-state", {
      method: "POST",
      body: payload,
    });
  },
  getStates() {
    return apiRequest<GetStatesResponse>("/super-admin/get-state", {
      method: "GET",
    });
  },

  // ---- City ---- (backend expects form-urlencoded)
  createCity(payload: CreateCityRequest) {
    return apiRequest<ApiAckResponse>("/super-admin/create-city", {
      method: "POST",
      body: payload,
      bodyType: "form",
    });
  },
  getCities() {
    return apiRequest<GetCitiesResponse>("/super-admin/get-city", {
      method: "GET",
    });
  },

  // ---- Class ---- (backend expects form-urlencoded)
  createClass(payload: CreateClassRequest) {
    return apiRequest<ApiAckResponse>("/super-admin/create-class", {
      method: "POST",
      body: payload,
      bodyType: "form",
    });
  },
  getClasses() {
    return apiRequest<GetClassesResponse>("/super-admin/get-class", {
      method: "GET",
    });
  },

  // ---- Section ---- (backend expects form-urlencoded)
  createSection(payload: CreateSectionRequest) {
    return apiRequest<ApiAckResponse>("/super-admin/create-section", {
      method: "POST",
      body: payload,
      bodyType: "form",
    });
  },
  getSections() {
    return apiRequest<GetSectionsResponse>("/super-admin/get-section", {
      method: "GET",
    });
  },

  // ---- Institution Profile (backend: /school) ----
  createSchool(payload: CreateSchoolRequest) {
    return apiRequest<ApiAckResponse>("/super-admin/create-school", {
      method: "POST",
      body: payload,
    });
  },
  getSchools() {
    return apiRequest<GetSchoolsResponse>("/super-admin/get-school", {
      method: "GET",
    });
  },

  checkSchoolCode(code: string) {
    return apiRequest<CheckSchoolCodeResponse>(
      "/super-admin/check-school-code",
      { method: "POST", body: { code } }
    );
  },

  // ---- Session (Financial Year, e.g. "2026-27") ----
  createSession(payload: CreateSessionRequest) {
    return apiRequest<ApiAckResponse>("/super-admin/create-session", {
      method: "POST",
      body: payload,
    });
  },
  getSessions() {
    return apiRequest<GetSessionsResponse>("/super-admin/get-session", {
      method: "GET",
    });
  },

  // ---- Fee Head Setup ----
  createFeeHeadSetup(payload: CreateFeeHeadSetupRequest) {
    return apiRequest<ApiAckResponse>("/super-admin/fee-head-setup", {
      method: "POST",
      body: payload,
    });
  },
  getFeeHeadSetups() {
    return apiRequest<GetFeeHeadSetupsResponse>("/super-admin/get-fee-head-setup", {
      method: "GET",
    });
  },

  // ---- Fee Plan Type ----
  createFeePlanType(payload: CreateFeePlanTypeRequest) {
    return apiRequest<ApiAckResponse>("/super-admin/fee-plan-type", {
      method: "POST",
      body: payload,
    });
  },
  getFeePlanTypes() {
    return apiRequest<GetFeePlanTypesResponse>("/super-admin/get-fee-plan-type", {
      method: "GET",
    });
  },

  // ---- Fee Setting: Class PayMode Setup ----
  createSchoolPayMode(payload: CreateSchoolPayModeRequest) {
    return apiRequest<ApiAckResponse>("/super-admin/create-school-pay-mode", {
      method: "POST",
      body: payload,
    });
  },
  getSchoolPayMode(schId?: string, session?: string) {
    const params = new URLSearchParams();
    if (schId) params.set("schId", schId);
    if (session) params.set("session", session);
    const query = params.toString();
    return apiRequest<GetSchoolPayModeResponse>(
      `/super-admin/get-school-pay-mode${query ? `?${query}` : ""}`,
      { method: "GET" }
    );
  },
  updateFeeStructureEntry(payload: UpdateFeeStructureEntryRequest) {
    return apiRequest<ApiAckResponse>("/super-admin/update-fee-structure-entry", {
      method: "PUT",
      body: payload,
    });
  },
};
