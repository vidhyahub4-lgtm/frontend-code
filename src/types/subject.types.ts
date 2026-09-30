/** One subject inside a school+session document. `subCode` is stored UPPERCASE by the backend. */
export interface SubjectItem {
  subjectName: string;
  subCode: string;
}

/** Request body of POST /school-settings/create-subject */
export interface CreateSubjectRequest {
  schId: string;
  schCode: string;
  /** Session `_id` */
  session: string;
  subjects: SubjectItem[];
}

/** One document per school + session; `subjects` holds every subject added so far. */
export interface SubjectRecord {
  _id: string;
  schId: string | { _id: string; schName?: string; schCode?: string };
  schCode: string;
  session: string | { _id: string; session?: string };
  subjects: SubjectItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSubjectResponse {
  success: boolean;
  message: string;
  data?: SubjectRecord;
}

/** Response of POST /school-settings/getAll-subject?schId=&session= */
export interface GetSubjectsResponse {
  success: boolean;
  count: number;
  data: SubjectRecord[];
}
