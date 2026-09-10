/**
 * All access-token persistence goes through this module.
 *
 * Kept isolated so that if we later move from localStorage to
 * an httpOnly cookie (recommended for production security) or
 * add token refresh logic, only this file changes.
 */

const TOKEN_KEY = "vidyahub_access_token";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}
