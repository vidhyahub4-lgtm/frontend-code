import { apiRequest } from "../lib/httpClient";
import type { ApiAckResponse } from "../types/api.types";
import type {
  CreateBoardRequest,
  CreateInstituteTypeRequest,
  GetBoardsResponse,
  GetInstituteTypesResponse,
} from "../types/superadmin.types";

export const superAdminService = {
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
};
