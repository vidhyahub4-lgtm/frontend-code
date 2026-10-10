import { CalendarDays } from "lucide-react";

/** Placeholder: the calendar UI (holidays / weekly offs per class-section) is built later. */
function SchoolCalendarPage() {
  return (
    <div>
      <h1 className="font-display text-2xl text-ink">School Calendar</h1>
      <div className="mt-6 flex min-h-[40vh] flex-col items-center justify-center rounded-lg border border-dashed border-line bg-white px-5 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-marigold/15 text-marigold-dark">
          <CalendarDays size={26} />
        </div>
        <p className="mt-4 font-display text-lg text-ink">Calendar coming soon</p>
        <p className="mt-1 max-w-sm text-sm text-ink-soft">
          Mark holidays and weekly offs for a section, a class or the whole school from here.
        </p>
      </div>
    </div>
  );
}

export default SchoolCalendarPage;
