import type { ReactNode } from "react";
import { School as SchoolIcon } from "lucide-react";
import { useSelectedSchool } from "../../hooks/useSelectedSchool";
import { useSelectedSession } from "../../hooks/useSelectedSession";
import type { SelectedSchool } from "../../lib/selectedSchool";
import type { SelectedSession } from "../../lib/selectedSession";

interface TeacherPageShellProps {
  title: string;
  children: (ctx: { school: SelectedSchool; session: SelectedSession }) => ReactNode;
}

/**
 * Shared header + "select a school/session first" guard for the Teachers
 * Setting pages. The content is keyed by school + session, so switching either
 * one remounts it and refetches everything.
 */
export function TeacherPageShell({ title, children }: TeacherPageShellProps) {
  const { selectedSchool } = useSelectedSchool();
  const { selectedSession } = useSelectedSession();

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-medium text-marigold-dark">School Setting · Teachers Setting</p>
        <h1 className="mt-1 font-display text-2xl text-ink">{title}</h1>
        {selectedSchool && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
            <SchoolIcon size={14} className="text-marigold-dark" />
            {selectedSchool.name}
            {selectedSession && ` · Session ${selectedSession.name}`}
          </p>
        )}
      </div>

      {selectedSchool && selectedSession ? (
        <div key={`${selectedSchool.id}:${selectedSession.id}`}>
          {children({ school: selectedSchool, session: selectedSession })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-line bg-white px-5 py-10 text-center">
          <SchoolIcon size={28} className="mx-auto text-marigold-dark" />
          <p className="mt-3 font-display text-lg text-ink">
            {selectedSchool ? "No session selected" : "No school selected"}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            Use the settings icon at the top right to select a
            {selectedSchool ? " session" : " school"} first.
          </p>
        </div>
      )}
    </div>
  );
}
