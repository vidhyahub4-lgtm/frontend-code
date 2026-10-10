import type { KeyboardEvent, MouseEvent, PointerEvent } from "react";
import type { CalendarDateEntry } from "../../types/calendar.types";
import { MARK_STYLE } from "./markStyle";
import {
  MONTHS,
  WEEKDAYS_SHORT,
  monthDayStrings,
  prettyDate,
  weekdayName,
} from "../../lib/calendarDates";

interface MonthGridProps {
  y: number;
  m: number;
  marks: Map<string, CalendarDateEntry>;
  selected: Set<string>;
  today: string;
  activeDate: string | null;
  /** The one day in the whole calendar that is reachable with the Tab key. */
  tabbableDate: string;
  onDayPointerDown: (e: PointerEvent<HTMLButtonElement>, date: string) => void;
  onDayEnter: (date: string) => void;
  onDayClick: (e: MouseEvent<HTMLButtonElement>, date: string) => void;
  onDayKeyDown: (e: KeyboardEvent<HTMLButtonElement>, date: string) => void;
  onSelectWeekday: (y: number, m: number, weekday: number) => void;
  onClearMonth: (y: number, m: number) => void;
}

const pillClasses =
  "rounded-full border border-line bg-paper px-2.5 py-0.5 text-[11px] font-medium text-ink transition hover:bg-chalk disabled:cursor-not-allowed disabled:opacity-40";

export function MonthGrid({
  y,
  m,
  marks,
  selected,
  today,
  activeDate,
  tabbableDate,
  onDayPointerDown,
  onDayEnter,
  onDayClick,
  onDayKeyDown,
  onSelectWeekday,
  onClearMonth,
}: MonthGridProps) {
  const days = monthDayStrings(y, m);
  const firstWeekday = new Date(Date.UTC(y, m, 1)).getUTCDay();
  const cells: (string | null)[] = [...Array<null>(firstWeekday).fill(null), ...days];

  const counts = { H: 0, S: 0, W: 0 };
  let selectedCount = 0;
  days.forEach((d) => {
    const entry = marks.get(d);
    if (entry) counts[entry.markas] += 1;
    if (selected.has(d)) selectedCount += 1;
  });
  const summary = [
    counts.H ? `${counts.H} holiday${counts.H === 1 ? "" : "s"}` : "",
    counts.S ? `${counts.S} weekly off` : "",
    counts.W ? `${counts.W} working` : "",
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <section aria-label={`${MONTHS[m]} ${y}`} className="rounded-lg border border-line bg-white p-3 shadow-sm">
      <header className="mb-2 space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-display text-base text-ink">
            {MONTHS[m]} <span className="text-xs font-normal text-ink-soft">{y}</span>
          </h3>
          <span className="truncate text-[11px] text-ink-soft">{summary || "No marks yet"}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className={pillClasses} onClick={() => onSelectWeekday(y, m, 0)}>
            Sundays
          </button>
          <button type="button" className={pillClasses} onClick={() => onSelectWeekday(y, m, 6)}>
            Saturdays
          </button>
          <button
            type="button"
            className={pillClasses}
            disabled={selectedCount === 0}
            onClick={() => onClearMonth(y, m)}
          >
            Clear{selectedCount ? ` (${selectedCount})` : ""}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {WEEKDAYS_SHORT.map((w, i) => (
          <span key={i} aria-hidden="true" className={`py-1 text-[11px] font-medium ${i === 0 ? "text-red-500" : "text-ink-soft"}`}>
            {w}
          </span>
        ))}
        {cells.map((date, i) => {
          if (date === null) return <span key={`blank-${i}`} />;
          const day = Number(date.slice(8));
          const entry = marks.get(date);
          const isSelected = selected.has(date);
          const isSunday = i % 7 === 0;

          const tone = isSelected
            ? "bg-marigold font-semibold text-chalkboard shadow-sm ring-2 ring-marigold-dark"
            : entry
              ? MARK_STYLE[entry.markas].cell
              : isSunday
                ? "text-red-500 hover:bg-chalk"
                : "text-ink hover:bg-chalk";

          const label = `${weekdayName(date)}, ${prettyDate(date)}${
            entry ? `, ${MARK_STYLE[entry.markas].label}${entry.res ? `: ${entry.res}` : ""}` : ""
          }${isSelected ? ", selected" : ""}`;

          return (
            <button
              key={date}
              type="button"
              data-date={date}
              aria-pressed={isSelected}
              aria-label={label}
              tabIndex={date === tabbableDate ? 0 : -1}
              title={entry ? `${MARK_STYLE[entry.markas].label}${entry.res ? `: ${entry.res}` : ""}` : undefined}
              onPointerDown={(e) => onDayPointerDown(e, date)}
              onPointerEnter={() => onDayEnter(date)}
              onClick={(e) => onDayClick(e, date)}
              onKeyDown={(e) => onDayKeyDown(e, date)}
              className={`relative aspect-square touch-manipulation rounded-lg text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-chalkboard ${tone} ${
                activeDate === date && !isSelected ? "outline outline-2 -outline-offset-2 outline-chalkboard/40" : ""
              }`}
            >
              {day}
              {isSelected && entry && (
                <span aria-hidden="true" className={`absolute right-1 top-1 h-1.5 w-1.5 rounded-full ${MARK_STYLE[entry.markas].dot}`} />
              )}
              {date === today && (
                <span aria-hidden="true" className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-marigold-dark" />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

