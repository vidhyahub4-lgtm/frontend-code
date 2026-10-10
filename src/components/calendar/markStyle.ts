import type { CalendarMark } from "../../types/calendar.types";

export const MARK_STYLE: Record<CalendarMark, { label: string; cell: string; dot: string }> = {
  H: { label: "Holiday", cell: "bg-red-100 text-red-700 ring-1 ring-red-300", dot: "bg-red-500" },
  S: { label: "Weekly off", cell: "bg-slate-200 text-slate-700 ring-1 ring-slate-300", dot: "bg-slate-500" },
  W: { label: "Working day", cell: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300", dot: "bg-emerald-500" },
};
