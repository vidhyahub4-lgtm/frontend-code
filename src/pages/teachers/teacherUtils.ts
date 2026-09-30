import type { RefClass, RefSection } from "../../types/teacher.types";

export const inputClasses =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-marigold/40 disabled:cursor-not-allowed disabled:opacity-60";
export const labelClasses = "text-sm font-medium text-ink-soft";
export const primaryButtonClasses =
  "flex items-center justify-center gap-1.5 rounded-md bg-marigold px-4 py-2 text-sm font-medium text-chalkboard transition hover:bg-marigold-dark disabled:cursor-not-allowed disabled:opacity-60";

/** Works for both a populated ref object and a plain id string. */
export function refId(ref: { _id: string } | string | null | undefined): string {
  if (!ref) return "";
  return typeof ref === "string" ? ref : ref._id;
}

export function classLabel(ref: RefClass | string | null | undefined): string {
  if (!ref || typeof ref === "string") return "—";
  return ref.className ?? ref.classInWord ?? "—";
}

export function sectionLabel(ref: RefSection | string | null | undefined): string {
  if (!ref || typeof ref === "string") return "—";
  return ref.sectionName ?? "—";
}
