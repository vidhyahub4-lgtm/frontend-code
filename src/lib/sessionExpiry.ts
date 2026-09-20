/**
 * Remembers that the user was logged out because their session expired,
 * and which page they were on, so the login page can explain what happened
 * and send them back afterwards.
 *
 * Uses sessionStorage (per tab) on purpose: it should not outlive the tab.
 */

const EXPIRY_KEY = "vidyahub_session_expired";

export interface SessionExpiry {
  returnTo: string | null;
}

/** Only allow in-app paths (guards against redirecting to another site). */
function toSafePath(path: string): string | null {
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  if (path === "/login" || path.startsWith("/login?")) return null;
  return path;
}

export function markSessionExpired(returnTo: string): void {
  sessionStorage.setItem(EXPIRY_KEY, JSON.stringify({ returnTo: toSafePath(returnTo) }));
}

/** Read without clearing, so it is safe to call during render. */
export function peekSessionExpiry(): SessionExpiry | null {
  const raw = sessionStorage.getItem(EXPIRY_KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<SessionExpiry>;
    return { returnTo: typeof value.returnTo === "string" ? value.returnTo : null };
  } catch {
    return { returnTo: null };
  }
}

export function clearSessionExpiry(): void {
  sessionStorage.removeItem(EXPIRY_KEY);
}
