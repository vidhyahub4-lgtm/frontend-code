/**
 * Read the expiry (`exp`) claim out of a JWT WITHOUT verifying it.
 *
 * This is only a convenience so the app can log the user out at the moment
 * the token expires. Real verification always happens on the backend.
 */
export function getTokenExpiryMs(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    // JWTs use base64url; atob needs plain base64 with padding.
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const exp = (JSON.parse(atob(padded)) as { exp?: unknown }).exp;
    return typeof exp === "number" ? exp * 1000 : null;
  } catch {
    return null; // unreadable token: let the server decide
  }
}

export function isTokenExpired(token: string, now: number = Date.now()): boolean {
  const expiresAt = getTokenExpiryMs(token);
  return expiresAt !== null && expiresAt <= now;
}
