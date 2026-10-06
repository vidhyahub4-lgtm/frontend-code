import { apiRequest } from "../lib/httpClient";
import type {
  AddTeacherRequest,
  AddTeacherResponse,
  AssignClassRequest,
  AssignClassResponse,
  GetClassTeachersResponse,
  GetTeachersResponse,
  MakeClassTeacherRequest,
  MakeClassTeacherResponse,
} from "../types/teacher.types";
import type { GetClassStudentListResponse } from "../types/studentList.types";

export const teacherService = {
  addTeacher(payload: AddTeacherRequest) {
    return apiRequest<AddTeacherResponse>("/api/teachers", {
      method: "POST",
      body: payload,
    });
  },
  getTeachers(schId: string, session?: string) {
    const query = `?schId=${encodeURIComponent(schId)}${
      session ? `&session=${encodeURIComponent(session)}` : ""
    }`;
    return apiRequest<GetTeachersResponse>(`/api/teachers${query}`, { method: "GET" });
  },
  assignClass(teacherId: string, payload: AssignClassRequest) {
    return apiRequest<AssignClassResponse>(
      `/api/teachers/${encodeURIComponent(teacherId)}/assign-class`,
      { method: "POST", body: payload }
    );
  },
  makeClassTeacher(teacherId: string, payload: MakeClassTeacherRequest) {
    return apiRequest<MakeClassTeacherResponse>(
      `/api/teachers/${encodeURIComponent(teacherId)}/make-class-teacher`,
      { method: "POST", body: payload }
    );
  },
  /** Students of the class this teacher is class teacher of. */
  getClassStudentList(teacherId: string) {
    return apiRequest<GetClassStudentListResponse>(
      `/api/teachers/class-student-list?id=${encodeURIComponent(teacherId)}`,
      { method: "GET" }
    );
  },
  getClassTeachers(schId: string, session: string) {
    const query = `?schId=${encodeURIComponent(schId)}&session=${encodeURIComponent(session)}`;
    return apiRequest<GetClassTeachersResponse>(`/api/teachers/class-teacher${query}`, {
      method: "GET",
    });
  },
};
