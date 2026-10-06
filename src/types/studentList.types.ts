/** Student personal details as populated from the registration record. */
export interface ListedStudentReg {
  _id: string;
  sname?: string;
  fname?: string;
  mname?: string;
  dob?: string;
  email?: string;
  whatAppno?: string;
  mob1?: string;
  mob2?: string;
  age?: string | number;
  category?: string;
  gender?: string;
  /** File name only; served from <apiBaseUrl>/uploads/studentImage/<Image> */
  Image?: string;
}

// ---- GET /school-settings/enrolled-studentsOfClass ----
export interface EnrolledStudentRow {
  _id: string;
  rollNo?: string;
  studentId: { _id: string; regno: ListedStudentReg | null } | null;
}
export interface GetEnrolledStudentsResponse {
  success: boolean;
  count: number;
  data: EnrolledStudentRow[];
}

// ---- GET /api/teachers/class-student-list ----
export interface ClassStudentRow {
  _id: string;
  rollNo?: string;
  status?: string;
  studentId: { _id: string; admno?: string; regno: ListedStudentReg | null } | null;
}
export interface GetClassStudentListResponse {
  success: boolean;
  message?: string;
  data: ClassStudentRow[];
}
