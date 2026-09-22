import { useCallback, useEffect, useState } from "react";
import { Wallet, Plus, X } from "lucide-react";
import { SectionCard } from "../../components/common/SectionCard";
import { useSelectedSchool } from "../../hooks/useSelectedSchool";
import { useSelectedSession } from "../../hooks/useSelectedSession";
import { superAdminService } from "../../services/superadmin.service";
import { schoolSettingService } from "../../services/schoolSetting.service";
import { ApiError } from "../../types/api.types";
import type {
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

/** One month a class may be billed for. Unticked = no installment that month (e.g. holiday). */
interface InstallmentSlot {
  name: string;
  active: boolean;
}

/** Per-class draft row while building a new session's fee structure. */
interface DraftRow {
  classID: string;
  className: string;
  duration: string;
  payModeDuration: string;
  installmentSlots: InstallmentSlot[];
  /** Whether this class is included in the next "Save Fee Structure" —
   * lets the user save only a subset of the loaded classes at a time. */
  included: boolean;
}

/** New rows start with every month ticked; the user unticks holidays. */
function allMonthSlots(): InstallmentSlot[] {
  return MONTHS.map((name) => ({ name, active: true }));
}

/** Rebuild the tick state from installments already saved on the backend. */
function slotsFromInstallments(existing: PayModeInstallment[]): InstallmentSlot[] {
  const saved = new Set(existing.map((i) => i.installment.trim().toLowerCase()));
  const months = MONTHS.map((name) => ({ name, active: saved.has(name.toLowerCase()) }));
  // Keep any saved installment that isn't a plain month name, so it isn't lost.
  const extras = existing
    .filter((i) => !MONTHS.some((m) => m.toLowerCase() === i.installment.trim().toLowerCase()))
    .map((i) => ({ name: i.installment, active: true }));
  return [...months, ...extras];
}

function countActive(slots: InstallmentSlot[]): number {
  return slots.filter((s) => s.active).length;
}

/** Ticked months -> API payload; ids are the installment numbers 1..n. */
function buildInstallments(slots: InstallmentSlot[]): { id: number; installment: string }[] {
  return slots.filter((s) => s.active).map((s, i) => ({ id: i + 1, installment: s.name }));
}

/** Popup to tick/untick the months a class pays installments for. */
function InstallmentPickerModal({
  classLabel,
  slots,
  onSave,
  onClose,
}: {
  classLabel: string;
  slots: InstallmentSlot[];
  onSave: (slots: InstallmentSlot[]) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(slots);
  const selected = countActive(draft);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function toggle(index: number) {
    setDraft((prev) => prev.map((slot, i) => (i === index ? { ...slot, active: !slot.active } : slot)));
  }

  function setAll(active: boolean) {
    setDraft((prev) => prev.map((slot) => ({ ...slot, active })));
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Installments for class ${classLabel}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-chalkboard/50 p-4"
    >
      <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-lg bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-line bg-marigold/10 px-5 py-3">
          <h3 className="font-display text-base text-ink">Class ({classLabel}) Installments</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-ink-soft hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center justify-between px-5 pt-3 text-xs">
          <span className="text-ink-soft">Untick a month to skip its installment (e.g. holiday).</span>
          <span className="flex shrink-0 gap-3">
            <button type="button" onClick={() => setAll(true)} className="font-medium text-marigold-dark hover:underline">
              All
            </button>
            <button type="button" onClick={() => setAll(false)} className="font-medium text-marigold-dark hover:underline">
              None
            </button>
          </span>
        </div>

        <div className="overflow-y-auto px-5 py-2">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
                <th className="py-2 pr-4 font-medium">SlNo</th>
                <th className="py-2 pr-4 font-medium">Installment</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 text-center font-medium">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {draft.map((slot, index) => (
                <tr key={`${slot.name}-${index}`} className={slot.active ? "" : "text-ink-soft"}>
                  <td className="py-2 pr-4">{index + 1}</td>
                  <td className="py-2 pr-4 font-medium">{slot.name}</td>
                  <td className="py-2 pr-4">{slot.active ? "Active" : "Inactive"}</td>
                  <td className="py-2 text-center">
                    <input
                      type="checkbox"
                      checked={slot.active}
                      onChange={() => toggle(index)}
                      aria-label={`${slot.name} installment`}
                      className="h-4 w-4 accent-marigold"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
          <span className={`text-xs ${selected === 0 ? "text-red-600" : "text-ink-soft"}`}>
            {selected === 0 ? "Select at least one month" : `${selected} of ${draft.length} selected`}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-line px-4 py-1.5 text-sm text-ink-soft hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onSave(draft)}
              disabled={selected === 0}
              className="rounded-md bg-marigold px-4 py-1.5 text-sm font-medium text-chalkboard transition hover:bg-marigold-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** "View Installment" button + how many months are ticked. */
function InstallmentSummary({ slots, onView }: { slots: InstallmentSlot[]; onView: () => void }) {
  const count = countActive(slots);
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onView}
        className="rounded-md border border-line px-3 py-1.5 text-xs text-ink-soft hover:border-marigold hover:text-marigold-dark"
      >
        View Installment
      </button>
      <span className={`text-xs ${count === 0 ? "text-red-600" : "text-ink-soft"}`}>
        {count} selected
      </span>
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
}: {
  setupId: string;
  entry: PayModeFeeStructureEntry;
  slNo: number;
  onSaved: () => void;
}) {
  const [duration, setDuration] = useState(entry.duration);
  const [payModeDuration, setPayModeDuration] = useState(entry.payModeDuration);
  const [installmentSlots, setInstallmentSlots] = useState(() => slotsFromInstallments(entry.installment));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpdate() {
    if (countActive(installmentSlots) === 0) {
      setError("Select at least one installment month.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await superAdminService.updateFeeStructureEntry({
        setupId,
        entryId: entry._id ?? "",
        duration,
        payModeDuration,
        installment: buildInstallments(installmentSlots),
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
        <InstallmentSummary slots={installmentSlots} onView={() => setPickerOpen(true)} />
        {pickerOpen && (
          <InstallmentPickerModal
            classLabel={`${entry.class.classInWord} (${entry.class.className})`}
            slots={installmentSlots}
            onSave={(slots) => {
              setInstallmentSlots(slots);
              setPickerOpen(false);
            }}
            onClose={() => setPickerOpen(false)}
          />
        )}
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
      {error && (
        <td className="py-2.5 pr-4 text-xs text-red-600">
          {error}
        </td>
      )}
    </tr>
  );
}


function ClassPayModeSetupPage() {
  const { selectedSchool } = useSelectedSchool();
  const { selectedSession } = useSelectedSession();
  const schoolID = selectedSchool?.id ?? "";

  const [setups, setSetups] = useState<SchoolPayModeSetup[]>([]);
  const [setupsError, setSetupsError] = useState<string | null>(null);

  const [schClasses, setSchClasses] = useState<SchClass[]>([]);
  const [schClassesLoading, setSchClassesLoading] = useState(false);

  const session = selectedSession?.name ?? "";
  const [draftRows, setDraftRows] = useState<DraftRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [pickerClassId, setPickerClassId] = useState<string | null>(null);

  const loadSetups = useCallback((forSchoolID: string) => {
    if (!forSchoolID) {
      setSetups([]);
      return;
    }
    setSetupsError(null);
    superAdminService
      .getSchoolPayMode(forSchoolID)
      .then((res) => setSetups(res.feeStructure ?? []))
      .catch((err) => setSetupsError(err instanceof ApiError ? err.message : "Could not load data."))
  }, []);

  useEffect(() => {
    setDraftRows([]);
    setSaveError(null);
    loadSetups(schoolID);
  }, [schoolID, loadSetups]);

  function startNewSession() {
    if (!schoolID || !session || draftRows.length > 0) return;
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
            installmentSlots: allMonthSlots(),
            included: true,
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
    const rowsToSave = draftRows.filter((r) => r.included);
    if (!schoolID || !selectedSchool || !session.trim() || rowsToSave.length === 0) return;

    setIsSaving(true);
    setSaveError(null);
    try {
      const feeStructure: CreatePayModeFeeStructureEntry[] = rowsToSave.map((r) => ({
        class: r.classID,
        duration: r.duration,
        payModeDuration: r.payModeDuration,
        installment: buildInstallments(r.installmentSlots),
      }));

      await superAdminService.createSchoolPayMode({
        schId: schoolID,
        schCode: selectedSchool.schoolCode,
        session: session.trim(),
        feeStructure,
      });

      // Only drop the rows we just saved — any classes the user left
      // unticked stay in the draft so they can be saved later.
      const remaining = draftRows.filter((r) => !r.included);
      setDraftRows(remaining);
      loadSetups(schoolID);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Could not save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  const pickerRow = draftRows.find((r) => r.classID === pickerClassId);

  const includedCount = draftRows.filter((r) => r.included).length;
  const canSave = Boolean(
    session.trim() &&
      includedCount > 0 &&
      draftRows.filter((r) => r.included).every((r) => countActive(r.installmentSlots) > 0)
  );

  function setAllIncluded(included: boolean) {
    setDraftRows((rows) => rows.map((r) => ({ ...r, included })));
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-medium text-marigold-dark">Super Admin · Fee Setting</p>
        <h1 className="mt-1 font-display text-2xl text-ink">Class PayMode Setup</h1>
      </div>

      <SectionCard title="Class Pay Mode Setup" icon={Wallet}>
        <div className="space-y-1">
          <label className={labelClasses}>Select School</label>
          <div className={`${inputClasses} cursor-not-allowed bg-chalk/60 text-ink`}>{selectedSchool?.name}</div>
        </div>

        {!schoolID || !session ? (
          <div className="py-8 text-center text-sm text-ink-soft">
            {!schoolID ? "Select a school" : "Select a session"} from the settings icon at the top right first.
          </div>
        ) : (
          <>
            {/* Already-configured sessions for this school (hidden while there are none) */}
            {(setupsError || setups.length > 0) && (
            <div className="mt-5 border-t border-line pt-4">
              <h3 className="mb-2 text-sm font-medium text-ink">Configured Sessions</h3>
              {setupsError ? (
                <p className="text-sm text-red-600">{setupsError}</p>
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
            )}

            {/* New session builder */}
            <div className="mt-5 border-t border-line pt-4">
              <h3 className="mb-2 text-sm font-medium text-ink">Set Up a New Session</h3>

              {draftRows.length === 0 ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1 space-y-1">
                    <label className={labelClasses}>Session</label>
                    <div className={`${inputClasses} cursor-not-allowed bg-chalk/60 text-ink`}>{session}</div>
                  </div>
                  <button
                    onClick={startNewSession}
                    disabled={schClassesLoading}
                    className="flex items-center justify-center gap-1.5 rounded-md bg-marigold px-4 py-2 text-sm font-medium text-chalkboard transition hover:bg-marigold-dark disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {schClassesLoading ? "Loading classes…" : "Load Classes"}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-ink-soft">
                      Session <span className="font-medium text-ink">{session}</span> — tick the classes you want to
                      save now, configure each, then save. Untick a class to leave it for later.
                    </p>
                    <span className="flex shrink-0 gap-3 text-xs">
                      <button
                        type="button"
                        onClick={() => setAllIncluded(true)}
                        className="font-medium text-marigold-dark hover:underline"
                      >
                        Select all
                      </button>
                      <button
                        type="button"
                        onClick={() => setAllIncluded(false)}
                        className="font-medium text-marigold-dark hover:underline"
                      >
                        Select none
                      </button>
                    </span>
                  </div>

                  {schClasses.length === 0 ? (
                    <p className="text-sm text-ink-soft">
                      This school has no classes set up yet. Add classes first under Class/Section Setup.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
                            <th className="py-2 pr-4 font-medium">Save?</th>
                            <th className="py-2 pr-4 font-medium">Class</th>
                            <th className="py-2 pr-4 font-medium">Duration</th>
                            <th className="py-2 pr-4 font-medium">PayMode Duration</th>
                            <th className="py-2 pr-4 font-medium">Installments</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {draftRows.map((row) => (
                            <tr key={row.classID} className={row.included ? "" : "text-ink-soft"}>
                              <td className="py-2.5 pr-4">
                                <input
                                  type="checkbox"
                                  checked={row.included}
                                  onChange={(e) => updateDraftRow(row.classID, { included: e.target.checked })}
                                  aria-label={`Include ${row.className} in this save`}
                                  className="h-4 w-4 accent-marigold"
                                />
                              </td>
                              <td className="py-2.5 pr-4 font-medium">{row.className}</td>
                              <td className="py-2.5 pr-4">
                                <select
                                  value={row.duration}
                                  onChange={(e) => updateDraftRow(row.classID, { duration: e.target.value })}
                                  disabled={!row.included}
                                  className={`${inputClasses} disabled:opacity-50`}
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
                                  disabled={!row.included}
                                  className={`${inputClasses} disabled:opacity-50`}
                                >
                                  {PAYMODE_DURATION_OPTIONS.map((d) => (
                                    <option key={d} value={d}>{d}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="py-2.5 pr-4">
                                <InstallmentSummary
                                  slots={row.installmentSlots}
                                  onView={() => setPickerClassId(row.classID)}
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
                      {isSaving
                        ? "Saving…"
                        : `Save Fee Structure${includedCount > 0 ? ` (${includedCount})` : ""}`}
                    </button>
                    <button
                      onClick={() => setDraftRows([])}
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

      {pickerRow && (
        <InstallmentPickerModal
          classLabel={pickerRow.className}
          slots={pickerRow.installmentSlots}
          onSave={(slots) => {
            updateDraftRow(pickerRow.classID, { installmentSlots: slots });
            setPickerClassId(null);
          }}
          onClose={() => setPickerClassId(null)}
        />
      )}
    </div>
  );
}

export default ClassPayModeSetupPage;
