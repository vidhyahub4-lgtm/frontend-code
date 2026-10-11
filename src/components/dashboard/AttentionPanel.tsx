import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { DashboardClassRow } from "../../types/dashboard.types";
import { classLabel } from "./classLabel";

const SHOW = 6;

function AttentionList({
  title,
  rows,
  detail,
  action,
}: {
  title: string;
  rows: DashboardClassRow[];
  detail: (row: DashboardClassRow) => string;
  action?: { to: string; label: string };
}) {
  if (rows.length === 0) return null;
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">
          {title} <span className="font-normal text-ink-soft">({rows.length})</span>
        </h3>
        {action && (
          <Link to={action.to} className="text-xs font-medium text-marigold-dark hover:underline">
            {action.label}
          </Link>
        )}
      </div>
      <ul className="mt-2 divide-y divide-line rounded-md border border-line">
        {rows.slice(0, SHOW).map((r) => (
          <li key={`${r.classId}:${r.sectionId}`} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
            <span className="font-medium text-ink">{classLabel(r)}</span>
            <span className="truncate text-ink-soft">{detail(r)}</span>
          </li>
        ))}
      </ul>
      {rows.length > SHOW && <p className="mt-1 text-xs text-ink-soft">+ {rows.length - SHOW} more</p>}
    </div>
  );
}

/** What needs the admin's attention today: attendance not marked, classes with no class teacher. */
export function AttentionPanel({ notMarked, noClassTeacher }: { notMarked: DashboardClassRow[]; noClassTeacher: DashboardClassRow[] }) {
  if (notMarked.length === 0 && noClassTeacher.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 py-6 text-center">
        <CheckCircle2 size={28} className="text-green-600" />
        <p className="text-sm font-medium text-ink">All good</p>
        <p className="text-xs text-ink-soft">Every class has attendance marked today and a class teacher.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="flex items-center gap-1.5 text-xs text-amber-700">
        <AlertTriangle size={13} /> A few things need attention
      </p>
      <AttentionList
        title="Attendance not marked today"
        rows={notMarked}
        detail={(r) => (r.classTeacher ? `Teacher: ${r.classTeacher}` : "No class teacher")}
        action={{ to: "/school-setting/teachers-setting/attendance", label: "Mark attendance" }}
      />
      <AttentionList title="No class teacher assigned" rows={noClassTeacher} detail={(r) => `${r.total} students`} />
    </div>
  );
}
