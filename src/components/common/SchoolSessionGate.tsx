import type { ReactNode } from "react";
import { AlertCircle, School } from "lucide-react";
import { useSelectedSchool } from "../../hooks/useSelectedSchool";
import { useSelectedSession } from "../../hooks/useSelectedSession";

interface Props {
  eyebrow: string;
  title: string;
  /** Rendered only when a school and a session are selected; remounts when either changes. */
  children: (ids: { schId: string; sessionId: string }) => ReactNode;
}

/** Page header + "select a school and session first" guard shared by the Fee Options pages. */
export function SchoolSessionGate({ eyebrow, title, children }: Props) {
  const { selectedSchool } = useSelectedSchool();
  const { selectedSession } = useSelectedSession();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-marigold-dark">{eyebrow}</p>
        <h1 className="mt-1 font-display text-2xl text-ink">{title}</h1>
        {selectedSchool && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
            <School size={14} className="text-marigold-dark" />
            {selectedSchool.name}
            {selectedSession && ` · ${selectedSession.name}`}
          </p>
        )}
      </div>

      {selectedSchool && selectedSession ? (
        <div key={`${selectedSchool.id}:${selectedSession.id}`}>
          {children({ schId: selectedSchool.id, sessionId: selectedSession.id })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-line bg-white px-5 py-10 text-center">
          <AlertCircle size={28} className="mx-auto text-marigold-dark" />
          <p className="mt-3 font-display text-lg text-ink">
            {selectedSchool ? "No session selected" : "No school selected"}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            Use the settings icon at the top right to select a school and session first.
          </p>
        </div>
      )}
    </div>
  );
}
