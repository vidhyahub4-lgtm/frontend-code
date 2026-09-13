import { useCallback, useEffect, useMemo, useState } from "react";
import { Wallet, Plus, X } from "lucide-react";
import { SectionCard } from "../../components/common/SectionCard";
import { useEntityCrud } from "../../hooks/useEntityCrud";
import { superAdminService } from "../../services/superadmin.service";
import { schoolSettingService } from "../../services/schoolSetting.service";
import { ApiError } from "../../types/api.types";
import type {
  School,
  SchClass,
  SchoolPayModeSetup,
  PayModeInstallment,
  PayModeFeeStructureEntry,
  CreatePayModeFeeStructureEntry,
} from "../../types/superadmin.types";

const inputClasses =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-marigold/40";
const labelClasses = "text-sm font-medium text-ink-soft";

const DURATION_OPTIONS = ["1-year"];
const PAYMODE_DURATION_OPTIONS = [
  "1-month",
  "2-month",
  "3-month",
  "4-month",
  "6-month",
  "1-year",
];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Per-class draft row while building a new session's fee structure. */
interface DraftRow {
  classID: string;
  className: string;
  duration: string;
  payModeDuration: string;
  installmentCount: number;
}

function buildInstallments(count: number): { id: number; installment: string }[] {
  const n = Math.max(0, Math.min(12, count || 0));
  return MONTHS.slice(0, n).map((m, i) => ({ id: i + 1, installment: m }));
}

function InstallmentModal({
  classLabel,
  installments,
  onClose,
}: {
  classLabel: string;
  installments: PayModeInstallment[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-chalkboard/50 p-4">
      <div className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-lg bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-line bg-marigold/10 px-5 py-3">
          <h3 className="font-display text-base text-ink">
            Class ({classLabel}) Pay Mode Installments
          </h3>
          <button onClick={onClose} className="text-ink-soft hover:text-ink">
            <X size={18} />
          </button>
        </div>
        <div className="p-4">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
                <th className="py-2 pr-4 font-medium">SlNo</th>
                <th className="py-2 pr-4 font-medium">Installment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {installments.map((inst) => (
                <tr key={inst.id}>
                  <td className="py-2 pr-4">{inst.id}</td>
                  <td className="py-2 pr-4">{inst.installment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/** One row inside an already-configured session's table — editable inline,
 * matching the reference ERP layout (no popup for Duration/PayMode/Installments). */
function SetupEntryRow({
  setupId,
  entry,
  slNo,
  onSaved,
  onViewInstallments,
}: {
  setupId: string;
  entry: PayModeFeeStructureEntry;
  slNo: number;
  onSaved: () => void;
  onViewInstallments: () => void;
}) {
  const [duration, setDuration] = useState(entry.duration);
  const [payModeDuration, setPayModeDuration] = useState(entry.payModeDuration);
  const [installmentCount, setInstallmentCount] = useState(entry.installment.length);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpdate() {
    setIsSaving(true);
    setError(null);
    try {
      await superAdminService.updateFeeStructureEntry({
        setupId,
        entryId: entry._id ?? "",
        duration,
        payModeDuration,
        installment: buildInstallments(installmentCount),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <tr>
      <td className="py-2.5 pr-4">{slNo}</td>
      <td className="py-2.5 pr-4 font-medium">{entry.class.classInWord} ({entry.class.className})</td>
      <td className="py-2.5 pr-4">
        <select value={duration} onChange={(e) => setDuration(e.target.value)} className={inputClasses}>
          {DURATION_OPTIONS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </td>
      <td className="py-2.5 pr-4">
        <select
          value={payModeDuration}
          onChange={(e) => setPayModeDuration(e.target.value)}
          className={inputClasses}
        >
          {PAYMODE_DURATION_OPTIONS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </td>
      <td className="py-2.5 pr-4">
        <input
          type="number"
          min={0}
          max={12}
          value={installmentCount}
          onChange={(e) => setInstallmentCount(Number(e.target.value))}
          className={`${inputClasses} w-20`}
        />
      </td>
      <td className="py-2.5 pr-4">
        <button
          onClick={handleUpdate}
          disabled={isSaving}
          className="rounded-md bg-marigold px-3 py-1.5 text-xs font-medium text-chalkboard transition hover:bg-marigold-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Updating…" : "Update"}
        </button>
      </td>
      <td className="py-2.5 pr-4">
        <button
          onClick={onViewInstallments}
          className="rounded-md border border-line px-3 py-1.5 text-xs text-ink-soft hover:border-marigold hover:text-marigold-dark"
        >
          View Installment
        </button>
      </td>
      {error && (
        <td className="py-2.5 pr-4 text-xs text-red-600" colSpan={2}>
          {error}
        </td>
      )}
    </tr>
  );
}


function ClassPayModeSetupPage() {
  const { items: schools, isLoading: schoolsLoading } = useEntityCrud<
    School,
    never
  >({
    fetchList: () => superAdminService.getSchools().then((res) => res.schools ?? []),
    create: () => Promise.resolve(),
  });

  const { items: sessions, isLoading: sessionsLoading } = useEntityCrud<
    { _id: string; session: string },
    never
  >({
    fetchList: () => superAdminService.getSessions().then((res) => res.sessions ?? []),
    create: () => Promise.resolve(),
  });

  const [schoolID, setSchoolID] = useState("");
  const selectedSchool = useMemo(() => schools.find((s) => s._id === schoolID), [schools, schoolID]);

  const [setups, setSetups] = useState<SchoolPayModeSetup[]>([]);
  const [setupsLoading, setSetupsLoading] = useState(false);
  const [setupsError, setSetupsError] = useState<string | null>(null);

  const [schClasses, setSchClasses] = useState<SchClass[]>([]);
  const [schClassesLoading, setSchClassesLoading] = useState(false);

  const [session, setSession] = useState("");
  const [draftRows, setDraftRows] = useState<DraftRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [modal, setModal] = useState<{ classLabel: string; installments: PayModeInstallment[] } | null>(null);

  const loadSetups = useCallback((forSchoolID: string) => {
    if (!forSchoolID) {
      setSetups([]);
      return;
    }
    setSetupsLoading(true);
    setSetupsError(null);
    superAdminService
      .getSchoolPayMode(forSchoolID)
      .then((res) => setSetups(res.feeStructure ?? []))
      .catch((err) => setSetupsError(err instanceof ApiError ? err.message : "Could not load data."))
      .finally(() => setSetupsLoading(false));
  }, []);

  useEffect(() => {
    setSession("");
    setDraftRows([]);
    setSaveError(null);
    loadSetups(schoolID);
  }, [schoolID, loadSetups]);

  function startNewSession() {
    if (!schoolID || !session) return;
    setSchClassesLoading(true);
    setSaveError(null);
    schoolSettingService
      .getSchClasses(schoolID)
      .then((res) => {
        const classes = res.schClasses ?? [];
        setSchClasses(classes);

        // A school can assign the same class to multiple sections
        // (e.g. "First - A" and "First - B"), but the fee structure is
        // tracked per CLASS only (no section field) — so dedupe here,
        // otherwise the same class would show up as duplicate rows and
        // editing one would silently update the other (same classID).
        const uniqueByClassId = new Map<string, (typeof classes)[number]>();
        classes.forEach((c) => {
          if (!uniqueByClassId.has(c.classID._id)) {
            uniqueByClassId.set(c.classID._id, c);
          }
        });

        // If this session already has a setup for this school, only
        // offer classes that aren't in it yet — matches what the backend
        // will actually accept (it upserts new classes into the existing
        // session instead of erroring on the whole request).
        const existingSetup = setups.find((s) => s.session === session);
        const alreadyConfiguredClassIds = new Set(
          existingSetup?.feeStructure.map((fs) => fs.class._id) ?? []
        );

        const availableClasses = Array.from(uniqueByClassId.values()).filter(
          (c) => !alreadyConfiguredClassIds.has(c.classID._id)
        );

        if (existingSetup && availableClasses.length === 0) {
          setSaveError(
            "All classes assigned to this school already have a fee structure for this session."
          );
          setDraftRows([]);
          return;
        }

        setDraftRows(
          availableClasses.map((c) => ({
            classID: c.classID._id,
            className: `${c.classID.classInWord} (${c.classID.className})`,
            duration: DURATION_OPTIONS[0],
            payModeDuration: PAYMODE_DURATION_OPTIONS[0],
            installmentCount: 0,
          }))
        );
      })
      .catch((err) => setSaveError(err instanceof ApiError ? err.message : "Could not load school classes."))
      .finally(() => setSchClassesLoading(false));
  }

  function updateDraftRow(classID: string, patch: Partial<DraftRow>) {
    setDraftRows((rows) => rows.map((r) => (r.classID === classID ? { ...r, ...patch } : r)));
  }

  async function handleSaveFeeStructure() {
    if (!schoolID || !selectedSchool || !session.trim() || draftRows.length === 0) return;

    setIsSaving(true);
    setSaveError(null);
    try {
      const feeStructure: CreatePayModeFeeStructureEntry[] = draftRows.map((r) => ({
        class: r.classID,
        duration: r.duration,
        payModeDuration: r.payModeDuration,
        installment: buildInstallments(r.installmentCount),
      }));

      await superAdminService.createSchoolPayMode({
        schId: schoolID,
        schCode: selectedSchool.schoolCode,
        session: session.trim(),
        feeStructure,
      });

      setSession("");
      setDraftRows([]);
      loadSetups(schoolID);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Could not save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  const canSave = Boolean(session.trim() && draftRows.length > 0 && draftRows.every((r) => r.installmentCount > 0));

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-medium text-marigold-dark">Super Admin · Fee Setting</p>
        <h1 className="mt-1 font-display text-2xl text-ink">Class PayMode Setup</h1>
      </div>

      <SectionCard title="Class Pay Mode Setup" icon={Wallet}>
        <div className="space-y-1">
          <label htmlFor="pm-school" className={labelClasses}>
            Select School
          </label>
          <select
            id="pm-school"
            value={schoolID}
            onChange={(e) => setSchoolID(e.target.value)}
            className={inputClasses}
            disabled={schoolsLoading || schools.length === 0}
          >
            <option value="">
              {schoolsLoading ? "Loading schools…" : schools.length === 0 ? "No schools found" : "Select a school"}
            </option>
            {schools.map((s) => (
              <option key={s._id} value={s._id}>
                {s.schName}
              </option>
            ))}
          </select>
        </div>

        {!schoolID ? (
          <div className="py-8 text-center text-sm text-ink-soft">
            Select a school above to view or set up its fee structure.
          </div>
        ) : (
          <>
            {/* Already-configured sessions for this school */}
            <div className="mt-5 border-t border-line pt-4">
              <h3 className="mb-2 text-sm font-medium text-ink">Configured Sessions</h3>
              {setupsLoading ? (
                <p className="text-sm text-ink-soft">Loading…</p>
              ) : setupsError ? (
                <p className="text-sm text-red-600">{setupsError}</p>
              ) : setups.length === 0 ? (
                <p className="text-sm text-ink-soft">No pay mode setup yet for this school.</p>
              ) : (
                <div className="space-y-6">
                  {setups.map((setup) => (
                    <div key={setup._id} className="rounded-md border border-line">
                      <div className="border-b border-line bg-marigold/10 px-4 py-2">
                        <span className="text-sm font-medium text-ink">Session: {setup.session}</span>
                      </div>
                      <div className="overflow-x-auto p-3">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
                              <th className="py-2 pr-4 font-medium">SlNo</th>
                              <th className="py-2 pr-4 font-medium">Class</th>
                              <th className="py-2 pr-4 font-medium">Duration</th>
                              <th className="py-2 pr-4 font-medium">PayMode Duration</th>
                              <th className="py-2 pr-4 font-medium">Installments</th>
                              <th className="py-2 pr-4 font-medium">Update</th>
                              <th className="py-2 pr-4 font-medium">View</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line">
                            {setup.feeStructure.map((fs, idx) => (
                              <SetupEntryRow
                                key={fs._id ?? idx}
                                setupId={setup._id}
                                entry={fs}
                                slNo={idx + 1}
                                onSaved={() => loadSetups(schoolID)}
                                onViewInstallments={() =>
                                  setModal({
                                    classLabel: `${fs.class.classInWord} (${fs.class.className})`,
                                    installments: fs.installment,
                                  })
                                }
                              />
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* New session builder */}
            <div className="mt-5 border-t border-line pt-4">
              <h3 className="mb-2 text-sm font-medium text-ink">Set Up a New Session</h3>

              {draftRows.length === 0 ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1 space-y-1">
                    <label htmlFor="pm-session" className={labelClasses}>
                      Session
                    </label>
                    <select
                      id="pm-session"
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
                        <option key={s._id} value={s.session}>
                          {s.session}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={startNewSession}
                    disabled={!session.trim() || schClassesLoading}
                    className="flex items-center justify-center gap-1.5 rounded-md bg-marigold px-4 py-2 text-sm font-medium text-chalkboard transition hover:bg-marigold-dark disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {schClassesLoading ? "Loading classes…" : "Load Classes"}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-ink-soft">
                    Session <span className="font-medium text-ink">{session}</span> — configure each class below, then save.
                  </p>

                  {schClasses.length === 0 ? (
                    <p className="text-sm text-ink-soft">
                      This school has no classes set up yet. Add classes first under Class/Section Setup.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
                            <th className="py-2 pr-4 font-medium">Class</th>
                            <th className="py-2 pr-4 font-medium">Duration</th>
                            <th className="py-2 pr-4 font-medium">PayMode Duration</th>
                            <th className="py-2 pr-4 font-medium">Installments</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {draftRows.map((row) => (
                            <tr key={row.classID}>
                              <td className="py-2.5 pr-4 font-medium">{row.className}</td>
                              <td className="py-2.5 pr-4">
                                <select
                                  value={row.duration}
                                  onChange={(e) => updateDraftRow(row.classID, { duration: e.target.value })}
                                  className={inputClasses}
                                >
                                  {DURATION_OPTIONS.map((d) => (
                                    <option key={d} value={d}>{d}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="py-2.5 pr-4">
                                <select
                                  value={row.payModeDuration}
                                  onChange={(e) => updateDraftRow(row.classID, { payModeDuration: e.target.value })}
                                  className={inputClasses}
                                >
                                  {PAYMODE_DURATION_OPTIONS.map((d) => (
                                    <option key={d} value={d}>{d}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="py-2.5 pr-4">
                                <input
                                  type="number"
                                  min={0}
                                  max={12}
                                  value={row.installmentCount}
                                  onChange={(e) =>
                                    updateDraftRow(row.classID, { installmentCount: Number(e.target.value) })
                                  }
                                  className={`${inputClasses} w-20`}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {saveError && (
                    <p role="alert" className="rounded-md bg-red-50 px-3.5 py-2 text-sm text-red-600">
                      {saveError}
                    </p>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveFeeStructure}
                      disabled={isSaving || !canSave}
                      className="flex items-center justify-center gap-1.5 rounded-md bg-marigold px-4 py-2 text-sm font-medium text-chalkboard transition hover:bg-marigold-dark disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Plus size={15} />
                      {isSaving ? "Saving…" : "Save Fee Structure"}
                    </button>
                    <button
                      onClick={() => { setDraftRows([]); setSession(""); }}
                      disabled={isSaving}
                      className="rounded-md border border-line px-4 py-2 text-sm text-ink-soft hover:text-ink"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </SectionCard>

      {modal && (
        <InstallmentModal
          classLabel={modal.classLabel}
          installments={modal.installments}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

export default ClassPayModeSetupPage;
