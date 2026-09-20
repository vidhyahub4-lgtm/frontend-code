/**
 * Persistence for the session (academic year, e.g. "2025-26") a superAdmin is
 * currently working in. Same pattern as selectedSchool.ts — separate key,
 * because sessions are global and independent of the selected school.
 *
 * `id` is the Session `_id` (what APIs like new-registration expect);
 * `name` is the label shown in the UI.
 */

const SESSION_KEY = "vidyahub_selected_session";

export interface SelectedSession {
  id: string;
  name: string;
}

const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

export function getSelectedSessionRaw(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

export function parseSelectedSession(raw: string | null): SelectedSession | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<SelectedSession>;
    if (typeof value.id === "string" && typeof value.name === "string") {
      return { id: value.id, name: value.name };
    }
    return null;
  } catch {
    return null;
  }
}

export function setStoredSelectedSession(session: SelectedSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  notify();
}

export function clearStoredSelectedSession(): void {
  localStorage.removeItem(SESSION_KEY);
  notify();
}

export function subscribeSelectedSession(listener: () => void): () => void {
  listeners.add(listener);

  // Fires when ANOTHER tab changes localStorage, keeping tabs in sync.
  const onStorage = (event: StorageEvent) => {
    if (event.key === SESSION_KEY || event.key === null) listener();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
