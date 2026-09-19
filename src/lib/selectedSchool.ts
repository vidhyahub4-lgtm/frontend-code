/**
 * Persistence for the school a superAdmin is currently "working as".
 *
 * Same idea as tokenStorage.ts: all localStorage access lives here, so the
 * storage key/shape can change in one place. We store the id AND the name/code
 * so the UI can show the school instantly, without another API call.
 *
 * `subscribeSelectedSchool` + `getSelectedSchoolRaw` are shaped for React's
 * useSyncExternalStore (see hooks/useSelectedSchool.ts) — that is how React
 * re-renders components when data outside React (localStorage) changes.
 */

const SCHOOL_KEY = "vidyahub_selected_school";

export interface SelectedSchool {
  id: string;
  name: string;
  schoolCode: string;
}

const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

/** Raw string (or null) — kept raw so React can compare snapshots cheaply. */
export function getSelectedSchoolRaw(): string | null {
  return localStorage.getItem(SCHOOL_KEY);
}

export function parseSelectedSchool(raw: string | null): SelectedSchool | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<SelectedSchool>;
    if (typeof value.id === "string" && typeof value.name === "string") {
      return { id: value.id, name: value.name, schoolCode: value.schoolCode ?? "" };
    }
    return null;
  } catch {
    return null;
  }
}

export function setStoredSelectedSchool(school: SelectedSchool): void {
  localStorage.setItem(SCHOOL_KEY, JSON.stringify(school));
  notify();
}

export function clearStoredSelectedSchool(): void {
  localStorage.removeItem(SCHOOL_KEY);
  notify();
}

export function subscribeSelectedSchool(listener: () => void): () => void {
  listeners.add(listener);

  // The "storage" event fires when ANOTHER tab changes localStorage, so
  // selecting a school in one tab updates the other tabs too.
  const onStorage = (event: StorageEvent) => {
    if (event.key === SCHOOL_KEY || event.key === null) listener();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
