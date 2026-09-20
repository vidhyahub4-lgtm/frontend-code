import { useMemo, useSyncExternalStore } from "react";
import {
  clearStoredSelectedSession,
  getSelectedSessionRaw,
  parseSelectedSession,
  setStoredSelectedSession,
  subscribeSelectedSession,
  type SelectedSession,
} from "../lib/selectedSession";

/** Read (and change) the superAdmin's currently selected session. */
export function useSelectedSession() {
  const raw = useSyncExternalStore(subscribeSelectedSession, getSelectedSessionRaw);
  const selectedSession = useMemo(() => parseSelectedSession(raw), [raw]);

  return {
    selectedSession,
    selectSession: (session: SelectedSession) => setStoredSelectedSession(session),
    clearSelectedSession: clearStoredSelectedSession,
  };
}
