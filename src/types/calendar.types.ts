/** H = holiday (reason required) | S = weekly off | W = working-day override */
export type CalendarMark = "H" | "S" | "W";
export type CalendarScope = "SECTION" | "CLASS" | "ALL";

export interface CalendarDateEntry {
  /** ISO timestamp at 00:00 UTC. */
  date: string;
  markas: CalendarMark;
  res?: string;
}
export interface CalendarMonth {
  month: string;
  id: number;
  dates: CalendarDateEntry[];
}
export interface CalendarDoc {
  schId?: string;
  session: string;
  clsid?: string;
  secid?: string;
  cal: CalendarMonth[];
}
export interface GetCalendarResponse {
  success: boolean;
  data: CalendarDoc;
}

/** Body of POST /api/calendar/mark. `session` is the session NAME, e.g. "2026-27". */
export interface MarkCalendarRequest {
  schId: string;
  session: string;
  scope: CalendarScope;
  clsid?: string;
  secids?: string[];
  dates: { date: string; markas: CalendarMark; res?: string }[];
}
/** Body of DELETE /api/calendar/dates. */
export interface RemoveCalendarDatesRequest {
  schId: string;
  session: string;
  scope: CalendarScope;
  clsid?: string;
  secids?: string[];
  /** "YYYY-MM-DD" */
  dates: string[];
}
export interface CalendarBulkResult {
  scope: CalendarScope;
  session: string;
  matched: number;
  updated: number;
  failed: { clsid: string; secid: string; error: string }[];
}
export interface CalendarBulkResponse {
  /** false (with HTTP 207) when some class-sections failed. */
  success: boolean;
  data: CalendarBulkResult;
}
