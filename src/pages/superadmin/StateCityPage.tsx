import { useMemo, useState, type FormEvent } from "react";
import { Map as MapIcon, MapPin, Plus } from "lucide-react";
import { SectionCard } from "../../components/common/SectionCard";
import { EntityTable } from "../../components/common/EntityTable";
import { useEntityCrud } from "../../hooks/useEntityCrud";
import { superAdminService } from "../../services/superadmin.service";
import type { City, State } from "../../types/superadmin.types";

const inputClasses =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-marigold/40";
const labelClasses = "text-sm font-medium text-ink-soft";

function StateSection({ states, isLoading, loadError, isCreating, createError, createEntity }: {
  states: State[];
  isLoading: boolean;
  loadError: string | null;
  isCreating: boolean;
  createError: string | null;
  createEntity: (payload: { stateName: string }) => Promise<boolean>;
}) {
  const [stateName, setStateName] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stateName.trim()) return;
    const ok = await createEntity({ stateName: stateName.trim() });
    if (ok) setStateName("");
  }

  return (
    <SectionCard title="State Setup" icon={MapIcon}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <label htmlFor="state-name" className={labelClasses}>
              State name
            </label>
            <input
              id="state-name"
              value={stateName}
              onChange={(e) => setStateName(e.target.value)}
              placeholder="e.g. Uttarakhand"
              className={inputClasses}
            />
          </div>
          <button
            type="submit"
            disabled={isCreating || !stateName.trim()}
            className="flex items-center justify-center gap-1.5 rounded-md bg-marigold px-4 py-2 text-sm font-medium text-chalkboard transition hover:bg-marigold-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus size={15} />
            {isCreating ? "Adding…" : "Add"}
          </button>
        </div>
        {createError && (
          <p role="alert" className="rounded-md bg-red-50 px-3.5 py-2 text-sm text-red-600">
            {createError}
          </p>
        )}
      </form>

      <div className="mt-5 border-t border-line pt-4">
        <EntityTable<State>
          items={states}
          isLoading={isLoading}
          error={loadError}
          emptyLabel="No states added yet."
          getRowKey={(item) => item._id}
          columns={[
            { header: "State", render: (item) => <span className="font-medium">{item.stateName}</span> },
          ]}
        />
      </div>
    </SectionCard>
  );
}

function CitySection({ states }: { states: State[] }) {
  const { items, isLoading, loadError, isCreating, createError, createEntity } =
    useEntityCrud<City, { cityName: string; stateId: string; pinCode: string }>({
      fetchList: () => superAdminService.getCities().then((res) => res.cities ?? []),
      create: (payload) => superAdminService.createCity(payload),
    });

  const [cityName, setCityName] = useState("");
  const [stateId, setStateId] = useState("");
  const [pinCode, setPinCode] = useState("");

  const stateNameById = useMemo(() => {
    const map = new Map<string, string>();
    states.forEach((s) => map.set(s._id, s.stateName));
    return map;
  }, [states]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cityName.trim() || !stateId || !pinCode.trim()) return;

    const ok = await createEntity({
      cityName: cityName.trim(),
      stateId,
      pinCode: pinCode.trim(),
    });
    if (ok) {
      setCityName("");
      setPinCode("");
    }
  }

  const canSubmit = Boolean(cityName.trim() && stateId && pinCode.trim());

  return (
    <SectionCard title="City Setup" icon={MapPin}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <label htmlFor="city-state" className={labelClasses}>
            State
          </label>
          <select
            id="city-state"
            value={stateId}
            onChange={(e) => setStateId(e.target.value)}
            className={inputClasses}
            disabled={states.length === 0}
          >
            <option value="">
              {states.length === 0 ? "Add a state first" : "Select a state"}
            </option>
            {states.map((s) => (
              <option key={s._id} value={s._id}>
                {s.stateName}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <label htmlFor="city-name" className={labelClasses}>
              City name
            </label>
            <input
              id="city-name"
              value={cityName}
              onChange={(e) => setCityName(e.target.value)}
              placeholder="e.g. Dehradun"
              className={inputClasses}
            />
          </div>
          <div className="space-y-1 sm:w-32">
            <label htmlFor="city-pincode" className={labelClasses}>
              Pin code
            </label>
            <input
              id="city-pincode"
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value)}
              placeholder="248001"
              inputMode="numeric"
              className={inputClasses}
            />
          </div>
          <button
            type="submit"
            disabled={isCreating || !canSubmit}
            className="flex items-center justify-center gap-1.5 rounded-md bg-marigold px-4 py-2 text-sm font-medium text-chalkboard transition hover:bg-marigold-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus size={15} />
            {isCreating ? "Adding…" : "Add"}
          </button>
        </div>
        {createError && (
          <p role="alert" className="rounded-md bg-red-50 px-3.5 py-2 text-sm text-red-600">
            {createError}
          </p>
        )}
      </form>

      <div className="mt-5 border-t border-line pt-4">
        <EntityTable<City>
          items={items}
          isLoading={isLoading}
          error={loadError}
          emptyLabel="No cities added yet."
          getRowKey={(item) => item._id}
          columns={[
            { header: "City", render: (item) => <span className="font-medium">{item.cityName}</span> },
            { header: "State", render: (item) => stateNameById.get(item.stateId._id) ?? "—" },
            { header: "Pin Code", render: (item) => item.pinCode },
          ]}
        />
      </div>
    </SectionCard>
  );
}

function StateCityPage() {
  const stateCrud = useEntityCrud<State, { stateName: string }>({
    fetchList: () => superAdminService.getStates().then((res) => res.states ?? []),
    create: (payload) => superAdminService.createState(payload),
  });

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-medium text-marigold-dark">Super Admin · Essential Setting</p>
        <h1 className="mt-1 font-display text-2xl text-ink">State City Setup</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <StateSection
          states={stateCrud.items}
          isLoading={stateCrud.isLoading}
          loadError={stateCrud.loadError}
          isCreating={stateCrud.isCreating}
          createError={stateCrud.createError}
          createEntity={stateCrud.createEntity}
        />
        <CitySection states={stateCrud.items} />
      </div>
    </div>
  );
}

export default StateCityPage;
