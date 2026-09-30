// NOTE: the backend also returns the teacher's hashed `password` from some
// endpoints (add / assign-class / make-class-teacher). It is deliberately NOT
// declared here so it can never be rendered or stored by accident.

/** Populated by list endpoints; a plain id string on write endpoints. */
export interface RefClass {
  _id: string;
  className?: string;
  classInWord?: string;
}

export interface RefSection {
  _id: string;
  sectionName?: string;
}

export interface TeacherSubject {
  subId?: string;
  subCode?: string;
  subName?: string;
}

export interface AssignedClass {
  classID: RefClass | string | null;
  sectionID: RefSection | string | null;
  subjects: TeacherSubject[];
  timing?: string;
}

export interface ClassTeacherOf {
  classID: RefClass | string | null;
  sectionID: RefSection | string | null;
}

export interface Teacher {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  schId?: string;
  session?: string;
  status?: "active" | "inactive";
  assignedClasses: AssignedClass[];
  classTeacherOf: ClassTeacherOf[];
  createdAt?: string;
}

// ---- POST /api/teachers ----
export interface AddTeacherRequest {
  name: string;
  email: string;
  password: string;
  phone?: string;
  schId: string;
  /** Session `_id` */
  session: string;
}

export interface AddTeacherResponse {
  success: boolean;
  data: Teacher;
}

// ---- GET /api/teachers?schId=&session= ----
export interface GetTeachersResponse {
  success: boolean;
  count: number;
  data: Teacher[];
}

// ---- POST /api/teachers/:id/assign-class ----
export interface AssignClassSubject {
  /** Backend requires it. Subjects have no _id of their own, so this is the parent Subject document's _id. */
  subId: string;
  subCode: string;
  subName: string;
}

export interface AssignClassRequest {
  schId: string;
  classes: {
    classID: string;
    sectionID: string;
    timing?: string;
    subjects: AssignClassSubject[];
  }[];
}

export interface AssignClassResponse {
  success: boolean;
  message: string;
  data: Teacher;
}

// ---- POST /api/teachers/:id/make-class-teacher ----
export interface MakeClassTeacherRequest {
  schId: string;
  session: string;
  classID: string;
  sectionID: string;
}

export interface MakeClassTeacherResponse {
  success: boolean;
  message: string;
  data: Teacher;
}

// ---- GET /api/teachers/class-teacher?schId=&session= ----
export interface GetClassTeachersResponse {
  success: boolean;
  data: Teacher[];
}
