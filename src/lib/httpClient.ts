import { env } from "../config/env";
import { ApiError, type ApiErrorResponse } from "../types/api.types";
import { getStoredToken } from "./tokenStorage";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type BodyType = "json" | "form" | "multipart";

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  /** "json" (default) sends body as JSON. "form" sends it as
   *  application/x-www-form-urlencoded — some backend endpoints
   *  (state/city, class/section) expect this instead of JSON.
   *  "multipart" expects `body` to be a FormData (file uploads); the browser
   *  sets the Content-Type header itself, including the multipart boundary. */
  bodyType?: BodyType;
  headers?: Record<string, string>;
  /** Attach the stored access token as a Bearer header. Defaults to true. */
  auth?: boolean;
  /** Abort the request if it takes longer than this (ms). Defaults to 15s. */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 15_000;

function encodeFormBody(body: unknown): string {
  const params = new URLSearchParams();
  Object.entries(body as Record<string, unknown>).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  });
  return params.toString();
}

/**
 * Single entry point for every HTTP call in the app.
 *
 * Centralizing this means: the base URL, auth header, timeout handling,
 * and error normalization only ever need to change in one place —
 * e.g. switching environments just means updating VITE_API_BASE_URL.
 */
export async function apiRequest<TResponse>(
  path: string,
  options: RequestOptions = {}
): Promise<TResponse> {
  const {
    method = "GET",
    body,
    bodyType = "json",
    headers = {},
    auth = true,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  const requestHeaders: Record<string, string> = {
    Accept: "application/json",
    ...(body !== undefined && bodyType !== "multipart"
      ? {
          "Content-Type":
            bodyType === "form"
              ? "application/x-www-form-urlencoded"
              : "application/json",
        }
      : {}),
    ...headers,
  };

  if (auth) {
    const token = getStoredToken();
    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`;
    }
  }

  let response: Response;

  try {
    response = await fetch(`${env.apiBaseUrl}${path}`, {
      method,
      headers: requestHeaders,
      body:
        body === undefined
          ? undefined
          : bodyType === "multipart"
            ? (body as FormData)
            : bodyType === "form"
              ? encodeFormBody(body)
              : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("Request timed out. Please try again.", 0);
    }
    throw new ApiError(
      "Could not reach the server. Check your connection and try again.",
      0
    );
  } finally {
    window.clearTimeout(timeoutId);
  }

  const isJson = response.headers
    .get("content-type")
    ?.includes("application/json");
  const payload = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const errorPayload = payload as ApiErrorResponse | null;
    throw new ApiError(
      errorPayload?.message || `Request failed with status ${response.status}`,
      response.status,
      payload
    );
  }

  return payload as TResponse;
}
