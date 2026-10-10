import type { CalendarDateEntry } from "../types/calendar.types";

/**
 * Date helpers for the School Calendar. Every date is a plain
 * "YYYY-MM-DD" string and all maths happens in UTC, so a date can never
 * shift by a day because of the browser's timezone (the backend stores
 * dates at 00:00 UTC too).
 */

export const SESSION_FORMAT = /^\d{4}-\d{2}$/;
export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
export const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));
export const WEEKDAYS_SHORT = ["S", "M", "T", "W", "T", "F", "S"];
export const WEEKDAYS_LONG = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

const DAY_MS = 86_400_000;
const MAX_RANGE_DAYS = 400;

export const pad = (n: number) => String(n).padStart(2, "0");
export const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

export function todayLocal(): string {
  const t = new Date();
  return iso(t.getFullYear(), t.getMonth(), t.getDate());
}

const toUtcMs = (value: string) => {
  const [y, m, d] = value.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};
const fromUtcMs = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export const addDays = (value: string, n: number) => fromUtcMs(toUtcMs(value) + n * DAY_MS);
export const weekdayOf = (value: string) => new Date(toUtcMs(value)).getUTCDay();
export const weekdayName = (value: string) => WEEKDAYS_LONG[weekdayOf(value)];

export function prettyDate(value: string): string {
  const [y, m, d] = value.split("-").map(Number);
  return `${d} ${MONTHS_SHORT[m - 1]} ${y}`;
}

export function prettyRange(start: string, end: string): string {
  if (start === end) return prettyDate(start);
  const [sy, sm, sd] = start.split("-").map(Number);
  const ey = Number(end.slice(0, 4));
  const left = sy === ey ? `${sd} ${MONTHS_SHORT[sm - 1]}` : prettyDate(start);
  return `${left} – ${prettyDate(end)}`;
}

/** Every date from a to b, inclusive, whichever order they are given in. */
export function datesInRange(a: string, b: string): string[] {
  let from = toUtcMs(a);
  let to = toUtcMs(b);
  if (from > to) [from, to] = [to, from];
  const out: string[] = [];
  for (let t = from; t <= to && out.length < MAX_RANGE_DAYS; t += DAY_MS) out.push(fromUtcMs(t));
  return out;
}

export function monthDayStrings(y: number, m: number): string[] {
  const count = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return Array.from({ length: count }, (_, i) => iso(y, m, i + 1));
}

export const weekdayDatesInMonth = (y: number, m: number, weekday: number) =>
  monthDayStrings(y, m).filter((d) => weekdayOf(d) === weekday);

/** ["2026-10-01","2026-10-02","2026-10-05"] -> [["2026-10-01","2026-10-02"],["2026-10-05","2026-10-05"]] */
export function compressRanges(dates: string[]): [string, string][] {
  const out: [string, string][] = [];
  [...dates].sort().forEach((d) => {
    const last = out[out.length - 1];
    if (last && addDays(last[1], 1) === d) last[1] = d;
    else out.push([d, d]);
  });
  return out;
}

/** The 12 months of a session: April of `startYear` through March of the next year. */
export function sessionMonths(startYear: number): { y: number; m: number }[] {
  return Array.from({ length: 12 }, (_, i) => ({
    y: startYear + (3 + i >= 12 ? 1 : 0),
    m: (3 + i) % 12,
  }));
}

/** 0-11 position of a date inside the session, or -1 if it is outside it. */
export function monthIndexOf(startYear: number, date: string): number {
  const [y, m] = date.split("-").map(Number);
  const idx = (y - startYear) * 12 + (m - 1) - 3;
  return idx >= 0 && idx < 12 ? idx : -1;
}

export const sessionBounds = (startYear: number) => ({
  start: `${startYear}-04-01`,
  end: `${startYear + 1}-03-31`,
});

export interface HolidayGroup {
  start: string;
  end: string;
  reason: string;
  dates: string[];
}

/** Back-to-back holidays with the same reason become one entry ("Diwali break"). */
export function groupHolidays(entries: CalendarDateEntry[]): HolidayGroup[] {
  const groups: HolidayGroup[] = [];
  entries
    .filter((e) => e.markas === "H")
    .map((e) => ({ date: e.date.slice(0, 10), reason: (e.res ?? "").trim() }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach(({ date, reason }) => {
      const last = groups[groups.length - 1];
      if (last && addDays(last.end, 1) === date && last.reason.toLowerCase() === reason.toLowerCase()) {
        last.end = date;
        last.dates.push(date);
      } else {
        groups.push({ start: date, end: date, reason, dates: [date] });
      }
    });
  return groups;
}
