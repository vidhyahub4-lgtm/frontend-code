/**
 * Generic shape every backend error/failure response is expected to follow.
 * Adjust here if the backend's error contract changes — every service
 * consumes errors through ApiError, so one change here covers the app.
 */
/**
 * Common success envelope most backend endpoints wrap their payload in.
 * Assumed shape (matching the login endpoint): { success, message, data }.
 * If a specific endpoint's real response differs, adjust just that
 * service function rather than this shared type.
 */
export interface ApiEnvelope<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  [key: string]: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}
