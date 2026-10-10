export type AttendanceStatus = "present" | "absent" | "late" | "leave";

/** POST /api/attendance/mark */
export interface MarkAttendanceRequest {
  schId: string;
  session: string;
  /** Class `_id` of the teacher's class-teacher assignment. */
  class: string;
  /** Section `_id` of the teacher's class-teacher assignment. */
  section: string;
  /** yyyy-mm-dd */
  date: string;
  /** The class teacher of that class-section (the backend checks this). */
  teacherId: string;
  /** Optional note, stored in the audit log when a past date is changed (max 300 chars). */
  reason?: string;
  /** `student` is the enrollment `_id` (the `_id` of each class-student-list row). */
  records: { student: string; status: AttendanceStatus; remark?: string }[];
}
export interface MarkAttendanceResponse {
  success: boolean;
  message?: string;
  /** `logged` = number of audit-log rows written (only for past dates). */
  data?: { total: number; logged: number };
}

/** GET /api/attendance?schId=&session=&class=&section=&date= */
export interface AttendanceRecord {
  _id: string;
  status: AttendanceStatus;
  student: string | { _id: string } | null;
}
export interface GetAttendanceResponse {
  success: boolean;
  data: AttendanceRecord[];
}
