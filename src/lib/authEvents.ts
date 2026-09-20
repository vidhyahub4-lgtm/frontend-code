/**
 * Tiny bridge between httpClient (plain TypeScript, no React) and
 * AuthContext (React). httpClient calls `notifyUnauthorized()` when the
 * backend answers 401; AuthContext registers the function that logs out.
 */

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

export function notifyUnauthorized(): void {
  unauthorizedHandler?.();
}
