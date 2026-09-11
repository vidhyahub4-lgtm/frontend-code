import { apiRequest } from "../lib/httpClient";
import type { ApiEnvelope } from "../types/api.types";
import type { CreateUserRequest, GetUsersResponse, User } from "../types/user.types";

export const userService = {
  createUser(payload: CreateUserRequest) {
    return apiRequest<ApiEnvelope<User>>("/user/create-user", {
      method: "POST",
      body: payload,
    });
  },

  getUsers() {
    return apiRequest<GetUsersResponse>("/user/get-users", {
      method: "GET",
    });
  },
};
