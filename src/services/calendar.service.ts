import { apiRequest } from "../lib/httpClient";
import type {
  CalendarBulkResponse,
  GetCalendarResponse,
  MarkCalendarRequest,
  RemoveCalendarDatesRequest,
} from "../types/calendar.types";

export const calendarService = {
  getCalendar(params: { schId: string; session: string; clsid: string; secid: string }) {
    const query = new URLSearchParams(params).toString();
    return apiRequest<GetCalendarResponse>(`/api/calendar?${query}`, { method: "GET" });
  },
  markDates(payload: MarkCalendarRequest) {
    return apiRequest<CalendarBulkResponse>("/api/calendar/mark", { method: "POST", body: payload });
  },
  removeDates(payload: RemoveCalendarDatesRequest) {
    return apiRequest<CalendarBulkResponse>("/api/calendar/dates", { method: "DELETE", body: payload });
  },
};
