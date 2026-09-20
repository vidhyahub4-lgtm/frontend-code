import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Clock, Save } from "lucide-react";
import { SectionCard } from "../../components/common/SectionCard";
import { EntityTable } from "../../components/common/EntityTable";
import { useEntityCrud } from "../../hooks/useEntityCrud";
import { superAdminService } from "../../services/superadmin.service";
import { schoolSettingService } from "../../services/schoolSetting.service";
import { ApiError } from "../../types/api.types";
import { LATE_FINE_TYPES } from "../../types/superadmin.types";
import type {
  LateFineType,
  LateFineSetup,
  School,
  Session,
  SchClass,
} from "../../types/superadmin.types";

const inputClasses =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-marigold/40";
const labelClasses = "text-sm font-medium text-ink-soft";

function LateFinePage() {
  const { items: schools, isLoading: schoolsLoading } = useEntityCrud<School, never>({
    fetchList: () => superAdminService.getSchools().then((res) => res.schools ?? []),
    create: () => Promise.resolve(),
  });

  const { items: sessions, isLoading: sessionsLoading } = useEntityCrud<Session, never>({
    fetchList: () => superAdminService.getSessions().then((res) => res.sessions ?? []),
    create: () => Promise.resolve(),
  });

  const [schoolID, setSchoolID] = useState("");
  const [schClasses, setSchClasses] = useState<SchClass[]>([]);
  const [schClassesLoading, setSchClassesLoading] = useState(false);

  const [session, setSession] = useState("");
  const [classID, setClassID] = useState("");
  const [selectInstallemt, setSelectInstallemt] = useState("");
  const [duedateAfter, setDuedateAfter] = useState("");
  const [fineType, setFineType] = useState<LateFineType>("fixed");
  const [amount, setAmount] = useState("");

  const [lateFines, setLateFines] = useState<LateFineSetup[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Class options come from the school-specific Class/Section mapping
  // (SchClass), not the global Class master, since Late Fine is set per
  // school + class + section.
  useEffect(() => {
    if (!schoolID) {
      setSchClasses([]);
      setClassID("");
      return;
    }
    setSchClassesLoading(true);
    schoolSettingService
      .getSchClasses(schoolID)
      .then((res) => setSchClasses(res.schClasses ?? []))
      .catch(() => setSchClasses([]))
      .finally(() => setSchClassesLoading(false));
  }, [schoolID]);

  const loadLateFines = useCallback(() => {
    setListLoading(true);
    setListError(null);
    superAdminService
      .getLateFineSetups()
      .then((res) => setLateFines(res.data ?? []))
      .catch((err) => {
        setListError(err instanceof ApiError ? err.message : "Could not load late fine setups.");
      })
      .finally(() => setListLoading(false));
  }, []);

  useEffect(() => {
    loadLateFines();
  }, [loadLateFines]);

  const visibleLateFines = useMemo(
    () => (schoolID ? lateFines.filter((lf) => lf.schId?._id === schoolID) : lateFines),
    [lateFines, schoolID]
  );

  const canSave = Boolean(
    schoolID && session && classID && selectInstallemt && duedateAfter && amount.trim()
  );

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;

    setIsSaving(true);
    setSaveError(null);
    try {
      await superAdminService.createLateFineSetup({
        schId: schoolID,
        session,
        class: classID,
        selectInstallemt: Number(selectInstallemt),
        duedateAfter,
        fineType,
        amount: amount.trim(),
      });
      setSelectInstallemt("");
      setDuedateAfter("");
      setAmount("");
      loadLateFines();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Could not save late fine setup.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-medium text-marigold-dark">School Setting · Fee Setting</p>
        <h1 className="mt-1 font-display text-2xl text-ink">Late Fine</h1>
      </div>

      <SectionCard title="Late Fine Setup" icon={Clock}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <label htmlFor="lf-school" className={labelClasses}>
                Select School
              </label>
              <select
                id="lf-school"
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
              <label htmlFor="lf-session" className={labelClasses}>
                Session
              </label>
              <select
                id="lf-session"
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

            <div className="space-y-1">
              <label htmlFor="lf-class" className={labelClasses}>
                Select Class
              </label>
              <select
                id="lf-class"
                value={classID}
                onChange={(e) => setClassID(e.target.value)}
                className={inputClasses}
                disabled={!schoolID || schClassesLoading || schClasses.length === 0}
              >
                <option value="">
                  {!schoolID
                    ? "Select a school first"
                    : schClassesLoading
                    ? "Loading classes…"
                    : schClasses.length === 0
                    ? "No classes mapped for this school"
                    : "Select a class"}
                </option>
                {schClasses.map((sc) => (
                  <option key={sc._id} value={sc._id}>
                    {sc.classID?.className} - {(sc.sectionID ?? []).map((s) => s.sectionName).join(", ")}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="lf-installment" className={labelClasses}>
                Installment No.
              </label>
              <input
                id="lf-installment"
                type="number"
                min={1}
                value={selectInstallemt}
                onChange={(e) => setSelectInstallemt(e.target.value)}
                placeholder="e.g. 1"
                className={inputClasses}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="lf-duedate" className={labelClasses}>
                Due Date After
              </label>
              <input
                id="lf-duedate"
                type="date"
                value={duedateAfter}
                onChange={(e) => setDuedateAfter(e.target.value)}
                className={inputClasses}
              />
            </div>

            <div className="space-y-1">
              <label className={labelClasses}>Fine Type</label>
              <div className="flex items-center gap-4 pt-2">
                {LATE_FINE_TYPES.map((type) => (
                  <label key={type} className="flex items-center gap-1.5 text-sm text-ink">
                    <input
                      type="radio"
                      name="lf-fine-type"
                      value={type}
                      checked={fineType === type}
                      onChange={() => setFineType(type)}
                    />
                    {type === "dialy" ? "Daily" : "Fixed"}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="lf-amount" className={labelClasses}>
                Amount
              </label>
              <input
                id="lf-amount"
                type="number"
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 50"
                className={inputClasses}
              />
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
            {isSaving ? "Saving…" : "Save Late Fine"}
          </button>
        </form>

        <div className="mt-5 border-t border-line pt-4">
          <EntityTable<LateFineSetup>
            items={visibleLateFines}
            isLoading={listLoading}
            error={listError}
            emptyLabel="No late fine setups added yet."
            getRowKey={(item) => item._id}
            columns={[
              { header: "Session", render: (item) => item.session?.session ?? "—" },
              {
                header: "Class",
                render: (item) =>
                  `${item.class?.classID?.className ?? "—"} - ${item.class?.sectionID?.map((s) => s.sectionName).join(", ") || "—"}`,
              },
              { header: "Installment", render: (item) => item.selectInstallemt },
              {
                header: "Due Date After",
                render: (item) => new Date(item.duedateAfter).toLocaleDateString(),
              },
              { header: "Fine Type", render: (item) => (item.fineType === "dialy" ? "Daily" : "Fixed") },
              { header: "Amount", render: (item) => item.amount },
            ]}
          />
        </div>
      </SectionCard>
    </div>
  );
}

export default LateFinePage;
