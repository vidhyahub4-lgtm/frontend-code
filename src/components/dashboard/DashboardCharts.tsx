import type { DashboardClassRow, DashboardTrendPoint } from "../../types/dashboard.types";
import { classLabel } from "./classLabel";

const fmt = (n: number) => n.toLocaleString("en-IN");

function Empty({ children }: { children: string }) {
  return <p className="py-8 text-center text-sm text-ink-soft">{children}</p>;
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${className}`} />
      {label}
    </span>
  );
}

/** Horizontal stacked bar per class-section: present / late / absent / leave / not marked. */
export function ClassAttendanceBars({ rows }: { rows: DashboardClassRow[] }) {
  if (rows.length === 0) return <Empty>No classes with enrolled students yet.</Empty>;

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
        <LegendDot className="bg-green-500" label="Present" />
        <LegendDot className="bg-amber-400" label="Late" />
        <LegendDot className="bg-red-500" label="Absent" />
        <LegendDot className="bg-sky-400" label="Leave" />
        <LegendDot className="bg-gray-200" label="Not marked" />
      </div>
      <ul className="max-h-[22rem] space-y-3 overflow-y-auto pr-1">
        {rows.map((r) => {
          const marked = r.present + r.late + r.absent + r.leave;
          const denominator = Math.max(r.total, marked, 1);
          const width = (n: number) => `${(n / denominator) * 100}%`;
          return (
            <li key={`${r.classId}:${r.sectionId}`}>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-medium text-ink">{classLabel(r)}</span>
                <span className="text-ink-soft">
                  {r.marked ? `${fmt(r.present + r.late)} of ${fmt(r.total)} present` : `Not marked · ${fmt(r.total)} students`}
                </span>
              </div>
              <div
                className="mt-1 flex h-2.5 overflow-hidden rounded-full bg-gray-200"
                title={`Present ${r.present}, Late ${r.late}, Absent ${r.absent}, Leave ${r.leave}`}
              >
                <div className="bg-green-500" style={{ width: width(r.present) }} />
                <div className="bg-amber-400" style={{ width: width(r.late) }} />
                <div className="bg-red-500" style={{ width: width(r.absent) }} />
                <div className="bg-sky-400" style={{ width: width(r.leave) }} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Vertical bars: students per class (sections of a class are added together). */
export function StudentsPerClassChart({ rows }: { rows: DashboardClassRow[] }) {
  const totals = new Map<string, number>();
  rows.forEach((r) => totals.set(r.className, (totals.get(r.className) ?? 0) + r.total));
  const bars = [...totals];
  if (bars.length === 0) return <Empty>No students enrolled yet.</Empty>;
  const max = Math.max(...bars.map(([, n]) => n), 1);

  return (
    <div className="overflow-x-auto">
      <div className="flex h-48 items-end gap-3 pt-5">
        {bars.map(([name, n]) => (
          <div key={name} className="flex h-full w-11 shrink-0 flex-col items-center justify-end gap-1">
            <span className="text-xs font-medium text-ink">{fmt(n)}</span>
            <div className="flex w-full flex-1 items-end">
              <div
                className="w-full rounded-t bg-marigold"
                style={{ height: `${(n / max) * 100}%` }}
                title={`Class ${name}: ${n} students`}
              />
            </div>
            <span className="max-w-full truncate text-xs text-ink-soft" title={`Class ${name}`}>{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const GENDER_SEGMENTS = [
  { key: "boys", label: "Boys", color: "#0ea5e9" },
  { key: "girls", label: "Girls", color: "#f59e0b" },
  { key: "other", label: "Other", color: "#94a3b8" },
] as const;

/** Donut: boys / girls / other. */
export function GenderDonut({ boys, girls, other }: { boys: number; girls: number; other: number }) {
  const values = { boys, girls, other };
  const total = boys + girls + other;
  if (total === 0) return <Empty>No students enrolled yet.</Empty>;

  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  // each arc starts where the previous ones end
  const arcs = GENDER_SEGMENTS.map((seg, i) => {
    const before = GENDER_SEGMENTS.slice(0, i).reduce((sum, s) => sum + values[s.key], 0);
    return {
      seg,
      length: (values[seg.key] / total) * circumference,
      offset: (before / total) * circumference,
    };
  });

  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <svg viewBox="0 0 120 120" className="h-36 w-36" role="img" aria-label="Students by gender">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="16" />
        {arcs.map(({ seg, length, offset }) => (
          <circle
            key={seg.key}
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth="16"
            strokeDasharray={`${length} ${circumference - length}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 60 60)"
          >
            <title>{`${seg.label}: ${values[seg.key]}`}</title>
          </circle>
        ))}
        <text x="60" y="58" textAnchor="middle" className="fill-ink text-[18px] font-semibold">{fmt(total)}</text>
        <text x="60" y="72" textAnchor="middle" className="fill-ink-soft text-[8px]">students</text>
      </svg>
      <ul className="space-y-2 text-sm">
        {GENDER_SEGMENTS.filter((seg) => seg.key !== "other" || other > 0).map((seg) => (
          <li key={seg.key} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="text-ink-soft">{seg.label}</span>
            <span className="font-medium text-ink">{fmt(values[seg.key])}</span>
            <span className="text-xs text-ink-soft">({Math.round((values[seg.key] / total) * 100)}%)</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const dayLabel = (ymd: string) => new Date(`${ymd}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short" });
const dayNumber = (ymd: string) => new Date(`${ymd}T00:00:00`).getDate();

/** Line chart: attendance % for the last 7 days. Days with no attendance leave a gap. */
export function AttendanceTrendChart({ points }: { points: DashboardTrendPoint[] }) {
  if (points.every((p) => p.pct === null)) return <Empty>No attendance has been marked in the last 7 days.</Empty>;

  const width = 320;
  const height = 150;
  const pad = { left: 30, right: 10, top: 10, bottom: 28 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const x = (i: number) => pad.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (pct: number) => pad.top + (1 - pct / 100) * innerH;

  // one path per run of consecutive days that have data
  const runs: { i: number; pct: number }[][] = [];
  points.forEach((p, i) => {
    if (p.pct === null) {
      runs.push([]);
      return;
    }
    if (runs.length === 0) runs.push([]);
    runs[runs.length - 1].push({ i, pct: p.pct });
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Attendance percentage, last 7 days">
      {[0, 50, 100].map((g) => (
        <g key={g}>
          <line x1={pad.left} x2={width - pad.right} y1={y(g)} y2={y(g)} stroke="#e5e7eb" strokeDasharray="3 3" />
          <text x={pad.left - 6} y={y(g) + 3} textAnchor="end" className="fill-ink-soft text-[9px]">{g}%</text>
        </g>
      ))}
      {runs
        .filter((run) => run.length > 1)
        .map((run) => (
          <path
            key={run[0].i}
            d={run.map((p, k) => `${k === 0 ? "M" : "L"}${x(p.i)} ${y(p.pct)}`).join(" ")}
            fill="none"
            stroke="#16a34a"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        ))}
      {points.map((p, i) => (
        <g key={p.date}>
          {p.pct !== null && (
            <circle cx={x(i)} cy={y(p.pct)} r="3.5" fill="#16a34a">
              <title>{`${p.date}: ${p.pct}% (${p.present} of ${p.total})`}</title>
            </circle>
          )}
          <text x={x(i)} y={height - 14} textAnchor="middle" className="fill-ink-soft text-[9px]">{dayLabel(p.date)}</text>
          <text x={x(i)} y={height - 4} textAnchor="middle" className="fill-ink-soft text-[8px]">{dayNumber(p.date)}</text>
        </g>
      ))}
    </svg>
  );
}
