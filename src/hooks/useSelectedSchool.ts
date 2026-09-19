import { useMemo, useSyncExternalStore } from "react";
import {
  clearStoredSelectedSchool,
  getSelectedSchoolRaw,
  parseSelectedSchool,
  setStoredSelectedSchool,
  subscribeSelectedSchool,
  type SelectedSchool,
} from "../lib/selectedSchool";

/**
 * Read (and change) the superAdmin's currently selected school.
 * Any component using this re-renders automatically when the selection changes.
 */
export function useSelectedSchool() {
  const raw = useSyncExternalStore(subscribeSelectedSchool, getSelectedSchoolRaw);
  const selectedSchool = useMemo(() => parseSelectedSchool(raw), [raw]);

  return {
    selectedSchool,
    selectSchool: (school: SelectedSchool) => setStoredSelectedSchool(school),
    clearSelectedSchool: clearStoredSelectedSchool,
  };
}
