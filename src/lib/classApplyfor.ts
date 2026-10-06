import type { RegisteredStudent } from "../types/studentRegistration.types";

/**
 * The backend stores `classApplyfor` as `{ classID, sectionID? }` and expects
 * it as a JSON string in the multipart body. Reads may return raw ObjectIds
 * (list API) or populated objects (by-id API), so these helpers normalise both.
 */
export function encodeClassApplyfor(classID: string, sectionID?: string): string {
  return JSON.stringify(sectionID ? { classID, sectionID } : { classID });
}

/** Class `_id` of a registration, whichever shape the API returned. */
export function getClassApplyforId(value: RegisteredStudent["classApplyfor"]): string {
  if (!value) return "";
  if (typeof value === "string") return value; // legacy plain id
  const c = value.classID;
  return typeof c === "string" ? c : (c?._id ?? "");
}

/** Section `_id` of a registration (empty if none was chosen), whichever shape the API returned. */
export function getSectionApplyforId(value: RegisteredStudent["classApplyfor"]): string {
  if (!value || typeof value === "string") return "";
  const sec = value.sectionID;
  return typeof sec === "string" ? sec : (sec?._id ?? "");
}
