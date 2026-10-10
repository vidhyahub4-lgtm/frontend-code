import { useCallback, useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import { Flag, Plus, School as SchoolIcon, Trophy, X } from "lucide-react";
import { useSelectedSchool } from "../../hooks/useSelectedSchool";
import { SectionCard } from "../../components/common/SectionCard";
import { schoolSettingService } from "../../services/schoolSetting.service";
import { ApiError } from "../../types/api.types";
import { houseColor } from "../../lib/houses";

const inputClasses =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-marigold/40";
const labelClasses = "text-sm font-medium text-ink-soft";
const secondaryButtonClasses =
  "flex items-center justify-center gap-1.5 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-ink transition hover:bg-chalk disabled:cursor-not-allowed disabled:opacity-60";

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function initialOf(name: string): string {
  return (name.charAt(0) || "?").toUpperCase();
}

interface HouseClubContentProps {
  schId: string;
}

/** Depends on the selected school; the page below keys it by school so switching remounts and refetches. */
function HouseClubContent({ schId }: HouseClubContentProps) {
  const [houses, setHouses] = useState<string[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchHouses = useCallback(
    () =>
      schoolSettingService
        .getSchHouses(schId)
        .then((res) => {
          const docs = res.schHouse ?? res.schClasses ?? [];
          // The endpoint may return every school's houses, so keep only this school's.
          const mine = docs.filter(
            (doc) => (typeof doc.schId === "string" ? doc.schId : doc.schId?._id) === schId
          );
          setHouses(mine.flatMap((doc) => doc.house ?? []));
          setListError(null);
        })
        .catch((err) => {
          setListError(err instanceof ApiError ? err.message : "Could not load houses.");
        })
        .finally(() => setListLoading(false)),
    [schId]
  );

  useEffect(() => {
    fetchHouses();
  }, [fetchHouses]);

  /** Moves whatever is typed (comma separated allowed) into the pending list. Returns the new list, or null on error. */
  function commitDraft(): string[] | null {
    const names = draft.split(",").map(normalize).filter(Boolean);
    const existing = new Set(houses.map((h) => h.toLowerCase()));
    const next = [...pending];
    for (const name of names) {
      const key = name.toLowerCase();
      if (existing.has(key)) {
        setFormError(`"${name}" already exists.`);
        return null;
      }
      if (next.some((p) => p.toLowerCase() === key)) {
        setFormError(`"${name}" is already in the list.`);
        return null;
      }
      next.push(name);
    }
    setPending(next);
    setDraft("");
    setFormError(null);
    return next;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      setSuccessMessage(null);
      commitDraft();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccessMessage(null);
    const list = commitDraft();
    if (!list) return;
    if (list.length === 0) {
      setFormError("Add at least one house.");
      return;
    }

    setIsSaving(true);
    try {
      await schoolSettingService.createSchHouse({ schId, house: list });
      setPending([]);
      setSuccessMessage(list.length === 1 ? "1 house added." : `${list.length} houses added.`);
      setListLoading(true);
      fetchHouses();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionCard title="Add Houses / Clubs" icon={Flag}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="house-name" className={labelClasses}>
              House / Club Name
            </label>
            <div className="flex gap-2">
              <input
                id="house-name"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. Red House — press Enter to add, or type several separated by commas"
                className={inputClasses}
              />
              <button
                type="button"
                onClick={() => {
                  setSuccessMessage(null);
                  commitDraft();
                }}
                className={secondaryButtonClasses}
              >
                <Plus size={14} /> Add
              </button>
            </div>
          </div>

          {pending.length > 0 && (
            <div className="flex flex-wrap gap-2" aria-label="Houses to be saved">
              {pending.map((name, index) => {
                const color = houseColor(name, houses.length + index);
                return (
                  <span
                    key={name}
                    className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium text-ink"
                    style={{ borderColor: color, backgroundColor: `${color}14` }}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                    {name}
                    <button
                      type="button"
                      aria-label={`Remove ${name}`}
                      onClick={() => setPending((current) => current.filter((p) => p !== name))}
                      className="text-ink-soft hover:text-red-600"
                    >
                      <X size={14} />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          {formError && (
            <p role="alert" className="rounded-md bg-red-50 px-3.5 py-2 text-sm text-red-600">
              {formError}
            </p>
          )}
          {successMessage && (
            <p role="status" className="rounded-md bg-green-50 px-3.5 py-2 text-sm text-green-700">
              {successMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center justify-center gap-1.5 rounded-md bg-marigold px-4 py-2 text-sm font-medium text-chalkboard transition hover:bg-marigold-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Saving…" : pending.length > 1 ? `Save ${pending.length} Houses` : "Save House"}
          </button>
        </form>
      </SectionCard>

      <SectionCard title="Houses / Clubs" icon={Trophy}>
        {listLoading ? (
          <p className="text-sm text-ink-soft">Loading houses…</p>
        ) : listError ? (
          <p role="alert" className="rounded-md bg-red-50 px-3.5 py-2 text-sm text-red-600">
            {listError}
          </p>
        ) : houses.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line px-5 py-8 text-center">
            <Trophy size={26} className="mx-auto text-marigold-dark" />
            <p className="mt-2 font-display text-lg text-ink">No houses yet</p>
            <p className="mt-1 text-sm text-ink-soft">Add your first house or club using the form above.</p>
          </div>
        ) : (
          <>
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {houses.map((name, index) => {
                const color = houseColor(name, index);
                return (
                  <li
                    key={name}
                    className="flex items-center gap-3 rounded-lg border border-line border-l-4 bg-white px-4 py-3 shadow-sm"
                    style={{ borderLeftColor: color }}
                  >
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-lg font-semibold"
                      style={{ backgroundColor: `${color}1f`, color }}
                    >
                      {initialOf(name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{name}</p>
                      <p className="text-xs text-ink-soft">House {index + 1}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-sm text-ink-soft">Total Houses: {houses.length}</p>
          </>
        )}
      </SectionCard>
    </div>
  );
}

function HouseClubSetupPage() {
  const { selectedSchool } = useSelectedSchool();

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-medium text-marigold-dark">School Setting · Essential Setting</p>
        <h1 className="mt-1 font-display text-2xl text-ink">House / Club Setup</h1>
        {selectedSchool && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
            <SchoolIcon size={14} className="text-marigold-dark" />
            {selectedSchool.name}
          </p>
        )}
      </div>

      {selectedSchool ? (
        <HouseClubContent key={selectedSchool.id} schId={selectedSchool.id} />
      ) : (
        <div className="rounded-lg border border-dashed border-line bg-white px-5 py-10 text-center">
          <SchoolIcon size={28} className="mx-auto text-marigold-dark" />
          <p className="mt-3 font-display text-lg text-ink">No school selected</p>
          <p className="mt-1 text-sm text-ink-soft">
            Use the settings icon at the top right to select a school first.
          </p>
        </div>
      )}
    </div>
  );
}

export default HouseClubSetupPage;
