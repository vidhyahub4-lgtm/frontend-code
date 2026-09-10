import { apiRequest } from "../lib/httpClient";
import type { ApiEnvelope } from "../types/api.types";
import type {
  Board,
  CreateBoardRequest,
  CreateInstituteTypeRequest,
  InstituteType,
} from "../types/superadmin.types";

export const superAdminService = {
  createBoard(payload: CreateBoardRequest) {
    return apiRequest<ApiEnvelope<Board>>("/super-admin/create-board", {
      method: "POST",
      body: payload,
    });
  },

  getBoards() {
    return apiRequest<ApiEnvelope<Board[]>>("/super-admin/get-board", {
      method: "GET",
    });
  },

  createInstituteType(payload: CreateInstituteTypeRequest) {
    return apiRequest<ApiEnvelope<InstituteType>>(
      "/super-admin/create-institute-type",
      {
        method: "POST",
        body: payload,
      }
    );
  },

  getInstituteTypes() {
    return apiRequest<ApiEnvelope<InstituteType[]>>(
      "/super-admin/get-institute-type",
      { method: "GET" }
    );
  },
};
