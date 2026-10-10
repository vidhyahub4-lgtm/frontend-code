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
  // Extra registration details (needed by the Student Update page)
  regno?: string;
  gname?: string;
  nationality?: string;
  religion?: string;
  mothertongue?: string;
  secLang?: string;
  adharId?: string;
  penno?: string;
  lclass?: string;
  lsch?: string;
  lper?: string | number;
  lboard?: string;
}

// ---- GET /school-settings/enrolled-studentsOfClass ----
export interface EnrolledStudentRow {
  _id: string;
  /** 0 and null both mean "no roll number assigned". */
  rollNo?: string | number | null;
  /** House name allotted for this session ("" / missing = not allotted). */
  house?: string | null;
  studentId: { _id: string; admno?: string; regno: ListedStudentReg | null } | null;
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

// ---- PUT /school-settings/class-students/update-rollno ----
export interface UpdateRollNoRequest {
  /** null clears the roll number (never send 0). */
  students: { enrollmentId: string; rollNo: string | null }[];
}
export interface UpdateRollNoResponse {
  success: boolean;
  message: string;
  data: { matchedCount: number; modifiedCount: number };
}

// ---- PUT /school-settings/class-students/update-house ----
export interface UpdateStudentHouseRequest {
  schId: string;
  students: {
    enrollmentId: string;
    /** null clears the allotment. Must be one of the school's houses. */
    house: string | null;
  }[];
}
export interface UpdateStudentHouseResponse {
  success: boolean;
  message: string;
  data: { updated: number };
}

// ---- PUT /school-settings/update-student/:regId (multipart: schId, changed fields, optional Image) ----
export interface UpdateStudentResponse {
  success: boolean;
  message: string;
  data: ListedStudentReg;
}
