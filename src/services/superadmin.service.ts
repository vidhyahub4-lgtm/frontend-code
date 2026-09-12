import { apiRequest } from "../lib/httpClient";
import type { ApiAckResponse } from "../types/api.types";
import type {
  CreateBoardRequest,
  CreateCityRequest,
  CreateClassRequest,
  CreateInstituteTypeRequest,
  CreateSchoolRequest,
  CreateSectionRequest,
  CreateStateRequest,
  CheckSchoolCodeResponse,
  GetBoardsResponse,
  GetCitiesResponse,
  GetClassesResponse,
  GetInstituteTypesResponse,
  GetSchoolsResponse,
  GetSectionsResponse,
  GetStatesResponse,
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
};
