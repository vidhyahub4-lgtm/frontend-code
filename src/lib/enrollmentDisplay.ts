import type { EnrollmentRow } from "../types/fee.types";

export function enrollmentClassName(r: EnrollmentRow): string {
  return typeof r.classID === "string" ? "" : (r.classID.className ?? "");
}
export function enrollmentSectionName(r: EnrollmentRow): string {
  return typeof r.sectionId === "string" ? "" : (r.sectionId.sectionName ?? "");
}
export function enrollmentStudentName(r: EnrollmentRow): string {
  const reg = r.studentId.regno;
  return typeof reg === "string" ? "" : (reg.sname ?? "");
}
/** "Name · AdmNo · Class-Section" for dropdowns. */
export function enrollmentLabel(r: EnrollmentRow): string {
  const cls = [enrollmentClassName(r), enrollmentSectionName(r)].filter(Boolean).join("-");
  return [enrollmentStudentName(r) || "Unnamed", r.studentId.admno, cls].filter(Boolean).join(" · ");
}
