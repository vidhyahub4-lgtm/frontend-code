import { apiRequest } from "../lib/httpClient";
import type { LoginRequest, LoginResponse } from "../types/auth.types";

export const authService = {
  login(payload: LoginRequest): Promise<LoginResponse> {
    return apiRequest<LoginResponse>("/user/login-user", {
      method: "POST",
      body: payload,
      auth: false, // no token exists yet at login time
    });
  },
};
