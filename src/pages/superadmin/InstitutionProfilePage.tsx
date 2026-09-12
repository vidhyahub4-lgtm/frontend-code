import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Landmark, Plus, RefreshCw } from "lucide-react";
import { SectionCard } from "../../components/common/SectionCard";
import { EntityTable } from "../../components/common/EntityTable";
import { useEntityCrud } from "../../hooks/useEntityCrud";
import { useSchoolCode } from "../../hooks/useSchoolCode";
import { superAdminService } from "../../services/superadmin.service";
import { userService } from "../../services/user.service";
import { ApiError } from "../../types/api.types";
import type {
  Board,
  City,
  CreateSchoolRequest,
  InstituteType,
  School,
  State,
} from "../../types/superadmin.types";
import type { User } from "../../types/user.types";

const inputClasses =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-marigold/40";
const labelClasses = "text-sm font-medium text-ink-soft";

const EMPTY_FORM = {
  schName: "",
  schAdd: "",
  schInfo: "",
  stateId: "",
  cityId: "",
  websiteUrl: "",
  contact1: "",
  contact2: "",
  schemail: "",
  admin: "",
  selectBoard: "",
  instituteType: "",
};

/** Reference lists this form's dropdowns are built from. Read-only here —
 * each has its own dedicated setup page for actually creating entries. */
function useReferenceData() {
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [instituteTypes, setInstituteTypes] = useState<InstituteType[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      superAdminService.getStates(),
      superAdminService.getCities(),
      superAdminService.getBoards(),
      superAdminService.getInstituteTypes(),
      userService.getUsers(),
    ])
      .then(([statesRes, citiesRes, boardsRes, typesRes, usersRes]) => {
        if (cancelled) return;
        setStates(statesRes.states ?? []);
        setCities(citiesRes.cities ?? []);
        setBoards(boardsRes.boards ?? []);
        setInstituteTypes(typesRes.instituteTypes ?? []);
        setUsers(usersRes.users ?? []);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : "Could not load form data."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { states, cities, boards, instituteTypes, users, isLoading, error };
}

function InstitutionProfilePage() {
  const refs = useReferenceData();
  const schoolCode = useSchoolCode();
  const { items, isLoading, loadError, isCreating, createError, createEntity } =
    useEntityCrud<School, CreateSchoolRequest>({
      fetchList: () => superAdminService.getSchools().then((res) => res.schools ?? []),
      create: (payload) => superAdminService.createSchool(payload),
    });

  const [form, setForm] = useState(EMPTY_FORM);

  function updateField<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
      // Changing the state should reset an already-picked city from a
      // different state.
      ...(key === "stateId" ? { cityId: "" } : {}),
    }));
  }

  const citiesInSelectedState = useMemo(
    () => refs.cities.filter((c) => c.stateId._id === form.stateId),
    [refs.cities, form.stateId]
  );

  const adminNameById = useMemo(() => {
    const map = new Map<string, string>();
    refs.users.forEach((u) => map.set(u._id, `${u.firstname} ${u.lastname}`));
    return map;
  }, [refs.users]);

  const canSubmit = Boolean(
    form.schName.trim() &&
      form.schAdd.trim() &&
      form.stateId &&
      form.cityId &&
      schoolCode.code &&
      form.contact1.trim() &&
      form.schemail.trim() &&
      form.admin &&
      form.selectBoard &&
      form.instituteType
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    const ok = await createEntity({
      schName: form.schName.trim(),
      schAdd: form.schAdd.trim(),
      schInfo: form.schInfo.trim() || undefined,
      cityId: form.cityId,
      stateId: form.stateId,
      schoolCode: schoolCode.code,
      websiteUrl: form.websiteUrl.trim() || undefined,
      contact1: form.contact1.trim(),
      contact2: form.contact2.trim() || undefined,
      schemail: form.schemail.trim(),
      admin: form.admin,
      selectBoard: form.selectBoard,
      instituteType: form.instituteType,
    });

    if (ok) {
      setForm(EMPTY_FORM);
      schoolCode.regenerate();
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-marigold-dark">Super Admin</p>
        <h1 className="mt-1 font-display text-2xl text-ink">Institution Profile</h1>
      </div>

      <SectionCard title="Add Institution" icon={Landmark}>
        {refs.error && (
          <p role="alert" className="mb-4 rounded-md bg-red-50 px-3.5 py-2 text-sm text-red-600">
            {refs.error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="schName" className={labelClasses}>School name</label>
              <input
                id="schName"
                value={form.schName}
                onChange={(e) => updateField("schName", e.target.value)}
                placeholder="Demo School"
                className={inputClasses}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="schoolCode" className={labelClasses}>School code (auto-generated)</label>
              <div className="flex items-center gap-2">
                <input
                  id="schoolCode"
                  value={schoolCode.isGenerating ? "Generating…" : schoolCode.code}
                  readOnly
                  className={`${inputClasses} cursor-not-allowed bg-chalk/60 font-mono tracking-wide text-ink-soft`}
                />
                <button
                  type="button"
                  onClick={schoolCode.regenerate}
                  disabled={schoolCode.isGenerating}
                  title="Generate a new code"
                  aria-label="Generate a new code"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line bg-white text-ink-soft transition hover:bg-chalk disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw size={15} className={schoolCode.isGenerating ? "animate-spin" : ""} />
                </button>
              </div>
              {schoolCode.error && (
                <p role="alert" className="text-xs text-red-600">{schoolCode.error}</p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="schAdd" className={labelClasses}>Address</label>
            <input
              id="schAdd"
              value={form.schAdd}
              onChange={(e) => updateField("schAdd", e.target.value)}
              placeholder="123 Main Road, Dehradun"
              className={inputClasses}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="schInfo" className={labelClasses}>Institution info (optional)</label>
            <input
              id="schInfo"
              value={form.schInfo}
              onChange={(e) => updateField("schInfo", e.target.value)}
              placeholder="CBSE affiliated, est. 1998"
              className={inputClasses}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="stateId" className={labelClasses}>State</label>
              <select
                id="stateId"
                value={form.stateId}
                onChange={(e) => updateField("stateId", e.target.value)}
                className={inputClasses}
                disabled={refs.states.length === 0}
              >
                <option value="">Select a state</option>
                {refs.states.map((s) => (
                  <option key={s._id} value={s._id}>{s.stateName}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="cityId" className={labelClasses}>City</label>
              <select
                id="cityId"
                value={form.cityId}
                onChange={(e) => updateField("cityId", e.target.value)}
                className={inputClasses}
                disabled={!form.stateId}
              >
                <option value="">
                  {form.stateId ? "Select a city" : "Select a state first"}
                </option>
                {citiesInSelectedState.map((c) => (
                  <option key={c._id} value={c._id}>{c.cityName}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="selectBoard" className={labelClasses}>Board</label>
              <select
                id="selectBoard"
                value={form.selectBoard}
                onChange={(e) => updateField("selectBoard", e.target.value)}
                className={inputClasses}
                disabled={refs.boards.length === 0}
              >
                <option value="">Select a board</option>
                {refs.boards.map((b) => (
                  <option key={b._id} value={b._id}>{b.boardName}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="instituteType" className={labelClasses}>Institution type</label>
              <select
                id="instituteType"
                value={form.instituteType}
                onChange={(e) => updateField("instituteType", e.target.value)}
                className={inputClasses}
                disabled={refs.instituteTypes.length === 0}
              >
                <option value="">Select a type</option>
                {refs.instituteTypes.map((t) => (
                  <option key={t._id} value={t.instituteType}>{t.instituteType}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="admin" className={labelClasses}>Institution admin</label>
            <select
              id="admin"
              value={form.admin}
              onChange={(e) => updateField("admin", e.target.value)}
              className={inputClasses}
              disabled={refs.users.length === 0}
            >
              <option value="">Select an admin user</option>
              {refs.users.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.firstname} {u.lastname} ({u.loginUserName})
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="contact1" className={labelClasses}>Primary contact</label>
              <input
                id="contact1"
                value={form.contact1}
                onChange={(e) => updateField("contact1", e.target.value)}
                placeholder="9876543210"
                inputMode="tel"
                className={inputClasses}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="contact2" className={labelClasses}>Secondary contact (optional)</label>
              <input
                id="contact2"
                value={form.contact2}
                onChange={(e) => updateField("contact2", e.target.value)}
                placeholder="9123456780"
                inputMode="tel"
                className={inputClasses}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="schemail" className={labelClasses}>School email</label>
              <input
                id="schemail"
                type="email"
                value={form.schemail}
                onChange={(e) => updateField("schemail", e.target.value)}
                placeholder="info@demoschool.com"
                className={inputClasses}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="websiteUrl" className={labelClasses}>Website (optional)</label>
              <input
                id="websiteUrl"
                value={form.websiteUrl}
                onChange={(e) => updateField("websiteUrl", e.target.value)}
                placeholder="https://demoschool.com"
                className={inputClasses}
              />
            </div>
          </div>

          {createError && (
            <p role="alert" className="rounded-md bg-red-50 px-3.5 py-2 text-sm text-red-600">
              {createError}
            </p>
          )}

          <button
            type="submit"
            disabled={isCreating || !canSubmit || refs.isLoading}
            className="flex items-center justify-center gap-1.5 rounded-md bg-marigold px-4 py-2 text-sm font-medium text-chalkboard transition hover:bg-marigold-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus size={15} />
            {isCreating ? "Saving…" : "Add Institution"}
          </button>
        </form>
      </SectionCard>

      <SectionCard title="All Institutions" icon={Landmark}>
        <EntityTable<School>
          items={items}
          isLoading={isLoading}
          error={loadError}
          emptyLabel="No institutions added yet."
          getRowKey={(item) => item._id}
          columns={[
            { header: "School", render: (item) => <span className="font-medium">{item.schName}</span> },
            { header: "Code", render: (item) => item.schoolCode },
            {
              header: "Location",
              render: (item) => `${item.cityId?.cityName ?? "—"}, ${item.stateId?.stateName ?? "—"}`,
            },
            { header: "Board", render: (item) => item.selectBoard?.boardName ?? "—" },
            { header: "Type", render: (item) => item.instituteType },
            {
              header: "Admin",
              render: (item) => adminNameById.get(item.admin) ?? "—",
            },
          ]}
        />
      </SectionCard>
    </div>
  );
}

export default InstitutionProfilePage;
