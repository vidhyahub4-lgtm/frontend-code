/** One class-section with today's attendance counts (GET /api/dashboard/summary). */
export interface DashboardClassRow {
  classId: string;
  sectionId: string;
  className: string;
  sectionName: string;
  /** Active enrolled students. */
  total: number;
  /** True once today's attendance has been saved for this class-section. */
  marked: boolean;
  present: number;
  absent: number;
  late: number;
  leave: number;
  classTeacher: string | null;
}

export interface DashboardTrendPoint {
  /** yyyy-mm-dd */
  date: string;
  present: number;
  total: number;
  /** null = nobody marked attendance that day. */
  pct: number | null;
}

export interface DashboardSummary {
  /** Today (IST), yyyy-mm-dd. */
  date: string;
  students: { total: number; boys: number; girls: number; other: number };
  teachers: { total: number; active: number; classTeachers: number };
  attendance: {
    classesTotal: number;
    classesMarked: number;
    markedStudents: number;
    present: number;
    absent: number;
    late: number;
    leave: number;
  };
  classWise: DashboardClassRow[];
  trend: DashboardTrendPoint[];
  attention: { notMarked: DashboardClassRow[]; noClassTeacher: DashboardClassRow[] };
}

export interface GetDashboardSummaryResponse {
  success: boolean;
  data: DashboardSummary;
}
