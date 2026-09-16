import { useCallback, useEffect, useState, type FormEvent } from "react";
import { FileText, Save } from "lucide-react";
import { SectionCard } from "../../components/common/SectionCard";
import { EntityTable } from "../../components/common/EntityTable";
import { useEntityCrud } from "../../hooks/useEntityCrud";
import { superAdminService } from "../../services/superadmin.service";
import { schoolSettingService } from "../../services/schoolSetting.service";
import { ApiError } from "../../types/api.types";
import { FEE_PLAN_HEAD_TYPES } from "../../types/superadmin.types";
import type {
  FeePlanHeadType,
  FeePlanSetup,
  School,
  Session,
  SchoolClass,
} from "../../types/superadmin.types";

const inputClasses =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-marigold/40";
const labelClasses = "text-sm font-medium text-ink-soft";

function FeePlanSetupPage() {
  const { items: schools, isLoading: schoolsLoading } = useEntityCrud<School, never>({
    fetchList: () => superAdminService.getSchools().then((res) => res.schools ?? []),
    create: () => Promise.resolve(),
  });

  const { items: sessions, isLoading: sessionsLoading } = useEntityCrud<Session, never>({
    fetchList: () => superAdminService.getSessions().then((res) => res.sessions ?? []),
    create: () => Promise.resolve(),
  });

  const { items: classes, isLoading: classesLoading } = useEntityCrud<SchoolClass, never>({
    fetchList: () => superAdminService.getClasses().then((res) => res.classes ?? []),
    create: () => Promise.resolve(),
  });

  const [schoolID, setSchoolID] = useState("");
  const [headType, setHeadType] = useState<FeePlanHeadType | "">("");
  const [session, setSession] = useState("");
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  const [feePlans, setFeePlans] = useState<FeePlanSetup[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadFeePlans = useCallback((forSchoolID: string) => {
    if (!forSchoolID) {
      setFeePlans([]);
      return;
    }
    setListLoading(true);
    setListError(null);
    schoolSettingService
      .getFeePlanSetups(forSchoolID)
      .then((res) => setFeePlans(res.data ?? []))
      .catch((err) => {
        setListError(err instanceof ApiError ? err.message : "Could not load fee plans.");
      })
      .finally(() => setListLoading(false));
  }, []);

  useEffect(() => {
    loadFeePlans(schoolID);
  }, [schoolID, loadFeePlans]);

  const canSave = Boolean(schoolID && headType && session);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave || !headType) return;

    setIsSaving(true);
    setSaveError(null);
    try {
      await schoolSettingService.createFeePlanSetup({
        schId: schoolID,
        headType,
        session,
        classes: classes.map((c) => ({
          classID: c._id,
          amount: Number(amounts[c._id]) || 0,
        })),
      });
      setAmounts({});
      loadFeePlans(schoolID);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Could not save fee plan.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-medium text-marigold-dark">School Setting · Fee Setting</p>
        <h1 className="mt-1 font-display text-2xl text-ink">Fee Plan Setup</h1>
      </div>

      <SectionCard title="Fee Plan Setup" icon={FileText}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <label htmlFor="fps-school" className={labelClasses}>
                Select School
              </label>
              <select
                id="fps-school"
                value={schoolID}
                onChange={(e) => setSchoolID(e.target.value)}
                className={inputClasses}
                disabled={schoolsLoading || schools.length === 0}
              >
                <option value="">
                  {schoolsLoading
                    ? "Loading schools…"
                    : schools.length === 0
                    ? "No schools found"
                    : "Select a school"}
                </option>
                {schools.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.schName}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="fps-head-type" className={labelClasses}>
                Select Head Type
              </label>
              <select
                id="fps-head-type"
                value={headType}
                onChange={(e) => setHeadType(e.target.value as FeePlanHeadType)}
                className={inputClasses}
              >
                <option value="">Select head type</option>
                {FEE_PLAN_HEAD_TYPES.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="fps-session" className={labelClasses}>
                Session
              </label>
              <select
                id="fps-session"
                value={session}
                onChange={(e) => setSession(e.target.value)}
                className={inputClasses}
                disabled={sessionsLoading || sessions.length === 0}
              >
                <option value="">
                  {sessionsLoading
                    ? "Loading sessions…"
                    : sessions.length === 0
                    ? "No sessions found — add one from Dashboard"
                    : "Select a session"}
                </option>
                {sessions.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.session}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-md border border-line">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-cream/40 text-xs uppercase tracking-wide text-ink-soft">
                    <th className="py-2 px-3 font-medium">SlNo</th>
                    <th className="py-2 px-3 font-medium">Class</th>
                    <th className="py-2 px-3 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {classesLoading ? (
                    <tr>
                      <td colSpan={3} className="py-4 px-3 text-center text-ink-soft">
                        Loading classes…
                      </td>
                    </tr>
                  ) : classes.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-4 px-3 text-center text-ink-soft">
                        No classes found — add one from Essential Setting.
                      </td>
                    </tr>
                  ) : (
                    classes.map((c, idx) => (
                      <tr key={c._id}>
                        <td className="py-2 px-3">{idx + 1}</td>
                        <td className="py-2 px-3">{c.className}</td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min={0}
                            value={amounts[c._id] ?? ""}
                            onChange={(e) =>
                              setAmounts((prev) => ({ ...prev, [c._id]: e.target.value }))
                            }
                            placeholder="0"
                            className={inputClasses}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {saveError && (
            <p role="alert" className="rounded-md bg-red-50 px-3.5 py-2 text-sm text-red-600">
              {saveError}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSave || isSaving}
            className="flex items-center justify-center gap-1.5 rounded-md bg-marigold px-4 py-2 text-sm font-medium text-chalkboard transition hover:bg-marigold-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={15} />
            {isSaving ? "Saving…" : "Save Fee Plan"}
          </button>
        </form>

        <div className="mt-5 border-t border-line pt-4">
          <EntityTable<FeePlanSetup>
            items={feePlans}
            isLoading={listLoading}
            error={listError}
            emptyLabel={
              schoolID ? "No fee plans saved for this school yet." : "Select a school to view its fee plans."
            }
            getRowKey={(item) => item._id}
            columns={[
              { header: "Head Type", render: (item) => item.headType },
              { header: "Session", render: (item) => item.session?.session ?? "—" },
              {
                header: "Classes",
                render: (item) => (
                  <span className="text-xs">
                    {item.classes
                      .map((c) => `${c.classID?.className ?? "—"}: ${c.amount}`)
                      .join(", ")}
                  </span>
                ),
              },
            ]}
          />
        </div>
      </SectionCard>
    </div>
  );
}

export default FeePlanSetupPage;
