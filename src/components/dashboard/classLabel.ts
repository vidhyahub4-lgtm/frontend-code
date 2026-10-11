import type { DashboardClassRow } from "../../types/dashboard.types";

/** "Class 2 - A" style label for a class-section row. */
export function classLabel(row: Pick<DashboardClassRow, "className" | "sectionName">): string {
  const section = row.sectionName && row.sectionName !== "—" ? ` - ${row.sectionName}` : "";
  return `${row.className}${section}`;
}
