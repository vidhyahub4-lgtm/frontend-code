import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Banknote,
  BarChart3,
  CalendarCheck,
  ClipboardCheck,
  FileText,
  GraduationCap,
  LineChart,
  Loader2,
  PieChart,
  RefreshCw,
  Sparkles,
  UserCheck,
  UserPlus,
  UserX,
  Users,
  Zap,
} from "lucide-react";
import { SchoolSessionGate } from "../components/common/SchoolSessionGate";
import { AttentionPanel } from "../components/dashboard/AttentionPanel";
import {
  AttendanceTrendChart,
  ClassAttendanceBars,
  GenderDonut,
  StudentsPerClassChart,
} from "../components/dashboard/DashboardCharts";
import { DashboardPanel } from "../components/dashboard/DashboardPanel";
import { KpiCard } from "../components/dashboard/KpiCard";
import { useAuth } from "../context/AuthContext";
import { dashboardService } from "../services/dashboard.service";
import { ApiError } from "../types/api.types";
import type { DashboardSummary } from "../types/dashboard.types";

const fmt = (n: number) => n.toLocaleString("en-IN");

const QUICK_ACTIONS = [
  { to: "/student-management/registration/new-registration", label: "New Registration", icon: UserPlus },
  { to: "/school-setting/teachers-setting/attendance", label: "Mark Attendance", icon: ClipboardCheck },
  { to: "/fee-options/collect-monthly-fee", label: "Collect Monthly Fee", icon: Banknote },
  { to: "/school-setting/fee-setting/fee-demand", label: "Generate Fee Demand", icon: FileText },
];

function greeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatLongDate(ymd: string): string {
  return new Date(`${ymd}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function Skeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-lg bg-gray-200" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-72 animate-pulse rounded-lg bg-gray-200 lg:col-span-2" />
        <div className="h-72 animate-pulse rounded-lg bg-gray-200" />
      </div>
    </div>
  );
}

function DashboardContent({ schId, sessionId }: { schId: string; sessionId: string }) {
  const { user } = useAuth();
  const [hour] = useState(() => new Date().getHours());
  const [reloadToken, setReloadToken] = useState(0);

  // The result remembers which request produced it; "refreshing" = a newer request is in flight
  // (the previous numbers stay on screen meanwhile).
  const requestKey = `${schId}|${sessionId}|${reloadToken}`;
  const [result, setResult] = useState<{ key: string; data: DashboardSummary | null; error: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    dashboardService
      .getSummary({ schId, session: sessionId })
      .then((res) => {
        if (!cancelled) setResult({ key: requestKey, data: res.data, error: null });
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err instanceof ApiError ? err.message : "Could not load the dashboard.";
        setResult((prev) => ({ key: requestKey, data: prev?.data ?? null, error: message }));
      });
    return () => {
      cancelled = true;
    };
  }, [schId, sessionId, requestKey]);

  const data = result?.data ?? null;
  const isRefreshing = result?.key !== requestKey;
  const error = isRefreshing ? null : (result?.error ?? null);

  if (!result) return <Skeleton />;

  if (!data) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-white px-5 py-10 text-center">
        <AlertCircle size={28} className="mx-auto text-red-500" />
        <p className="mt-3 font-display text-lg text-ink">Could not load the dashboard</p>
        <p className="mt-1 text-sm text-ink-soft">{error}</p>
        <button
          type="button"
          onClick={() => setReloadToken((t) => t + 1)}
          disabled={isRefreshing}
          className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-marigold px-4 py-2 text-sm font-medium text-chalkboard transition hover:bg-marigold-dark disabled:opacity-60"
        >
          {isRefreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Try again
        </button>
      </div>
    );
  }

  const { students, teachers, attendance, classWise, trend, attention } = data;
  const attended = attendance.present + attendance.late;
  const attendedPct = attendance.markedStudents > 0 ? Math.round((attended / attendance.markedStudents) * 100) : null;
  const markedPct = attendance.classesTotal > 0 ? Math.round((attendance.classesMarked / attendance.classesTotal) * 100) : 0;
  const nothingMarked = attendance.classesMarked === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 font-display text-xl text-ink">
            <Sparkles size={16} className="text-marigold-dark" />
            {greeting(hour)}
            {user ? `, ${user.firstname}` : ""}
          </p>
          <p className="text-sm text-ink-soft">{formatLongDate(data.date)}</p>
        </div>
        <button
          type="button"
          onClick={() => setReloadToken((t) => t + 1)}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-chalk disabled:opacity-60"
        >
          <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
          {isRefreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error && (
        <p role="alert" className="flex items-center gap-1.5 rounded-md bg-red-50 px-3.5 py-2 text-sm text-red-600">
          <AlertCircle size={14} /> {error} Showing the last loaded numbers.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KpiCard
          label="Total Students"
          value={fmt(students.total)}
          icon={GraduationCap}
          sub={`Boys ${fmt(students.boys)} · Girls ${fmt(students.girls)}${students.other ? ` · Other ${fmt(students.other)}` : ""}`}
        />
        <KpiCard
          label="Present Today"
          value={nothingMarked ? "—" : fmt(attended)}
          icon={UserCheck}
          tone="green"
          sub={nothingMarked ? "No attendance marked yet" : `${attendedPct}% of marked${attendance.late ? ` · ${fmt(attendance.late)} late` : ""}`}
        />
        <KpiCard
          label="Absent Today"
          value={nothingMarked ? "—" : fmt(attendance.absent)}
          icon={UserX}
          tone="red"
          sub={nothingMarked ? "No attendance marked yet" : attendance.leave ? `${fmt(attendance.leave)} on leave` : "None on leave"}
        />
        <KpiCard
          label="Teachers"
          value={fmt(teachers.total)}
          icon={Users}
          tone="sky"
          sub={`${fmt(teachers.active)} active · ${fmt(teachers.classTeachers)} class teachers`}
        />
        <KpiCard
          label="Attendance Marked"
          value={`${fmt(attendance.classesMarked)} / ${fmt(attendance.classesTotal)}`}
          icon={CalendarCheck}
          progress={markedPct}
          sub="classes today"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <DashboardPanel title="Class-wise Attendance Today" icon={BarChart3} className="lg:col-span-2">
          <ClassAttendanceBars rows={classWise} />
        </DashboardPanel>
        <DashboardPanel title="Needs Attention" icon={AlertCircle}>
          <AttentionPanel notMarked={attention.notMarked} noClassTeacher={attention.noClassTeacher} />
        </DashboardPanel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <DashboardPanel title="Attendance — Last 7 Days" icon={LineChart} className="lg:col-span-2">
          <AttendanceTrendChart points={trend} />
        </DashboardPanel>
        <DashboardPanel title="Students by Gender" icon={PieChart}>
          <GenderDonut boys={students.boys} girls={students.girls} other={students.other} />
        </DashboardPanel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <DashboardPanel title="Students per Class" icon={GraduationCap} className="lg:col-span-2">
          <StudentsPerClassChart rows={classWise} />
        </DashboardPanel>
        <DashboardPanel title="Quick Actions" icon={Zap}>
          <ul className="grid gap-2">
            {QUICK_ACTIONS.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <Link
                  to={to}
                  className="flex items-center gap-2.5 rounded-md border border-line px-3 py-2.5 text-sm font-medium text-ink transition hover:border-marigold hover:bg-chalk"
                >
                  <Icon size={16} className="text-marigold-dark" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </DashboardPanel>
      </div>
    </div>
  );
}

function DashboardPage() {
  return (
    <SchoolSessionGate eyebrow="Overview" title="Dashboard">
      {({ schId, sessionId }) => <DashboardContent schId={schId} sessionId={sessionId} />}
    </SchoolSessionGate>
  );
}

export default DashboardPage;
