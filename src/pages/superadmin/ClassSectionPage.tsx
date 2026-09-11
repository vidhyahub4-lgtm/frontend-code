import { useMemo, useState, type FormEvent } from "react";
import { Plus, Rows3, School } from "lucide-react";
import { SectionCard } from "../../components/common/SectionCard";
import { EntityTable } from "../../components/common/EntityTable";
import { useEntityCrud } from "../../hooks/useEntityCrud";
import { superAdminService } from "../../services/superadmin.service";
import type { Section, SchoolClass } from "../../types/superadmin.types";

const inputClasses =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-marigold/40";
const labelClasses = "text-sm font-medium text-ink-soft";

function ClassSection({ classes, isLoading, loadError, isCreating, createError, createEntity }: {
  classes: SchoolClass[];
  isLoading: boolean;
  loadError: string | null;
  isCreating: boolean;
  createError: string | null;
  createEntity: (payload: { className: string; classInWord: string }) => Promise<boolean>;
}) {
  const [className, setClassName] = useState("");
  const [classInWord, setClassInWord] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!className.trim() || !classInWord.trim()) return;
    const ok = await createEntity({
      className: className.trim(),
      classInWord: classInWord.trim(),
    });
    if (ok) {
      setClassName("");
      setClassInWord("");
    }
  }

  return (
    <SectionCard title="Class Setup" icon={School}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="space-y-1 sm:w-28">
            <label htmlFor="class-name" className={labelClasses}>
              Class
            </label>
            <input
              id="class-name"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="e.g. 1"
              className={inputClasses}
            />
          </div>
          <div className="flex-1 space-y-1">
            <label htmlFor="class-word" className={labelClasses}>
              In words
            </label>
            <input
              id="class-word"
              value={classInWord}
              onChange={(e) => setClassInWord(e.target.value)}
              placeholder="e.g. First"
              className={inputClasses}
            />
          </div>
          <button
            type="submit"
            disabled={isCreating || !className.trim() || !classInWord.trim()}
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
        <EntityTable<SchoolClass>
          items={classes}
          isLoading={isLoading}
          error={loadError}
          emptyLabel="No classes added yet."
          getRowKey={(item) => item._id}
          columns={[
            { header: "Class", render: (item) => <span className="font-medium">{item.className}</span> },
            { header: "In Words", render: (item) => item.classInWord },
          ]}
        />
      </div>
    </SectionCard>
  );
}

function SectionSection({ classes }: { classes: SchoolClass[] }) {
  const { items, isLoading, loadError, isCreating, createError, createEntity } =
    useEntityCrud<Section, { sectionName: string; classId: string; Maxlimit: string }>({
      fetchList: () => superAdminService.getSections().then((res) => res.sections ?? []),
      create: (payload) => superAdminService.createSection(payload),
    });

  const [sectionName, setSectionName] = useState("");
  const [classId, setClassId] = useState("");
  const [maxLimit, setMaxLimit] = useState("");

  const classNameById = useMemo(() => {
    const map = new Map<string, string>();
    classes.forEach((c) => map.set(c._id, c.className));
    return map;
  }, [classes]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sectionName.trim() || !classId || !maxLimit.trim()) return;

    const ok = await createEntity({
      sectionName: sectionName.trim(),
      classId,
      Maxlimit: maxLimit.trim(),
    });
    if (ok) {
      setSectionName("");
      setMaxLimit("");
    }
  }

  const canSubmit = Boolean(sectionName.trim() && classId && maxLimit.trim());

  return (
    <SectionCard title="Section Setup" icon={Rows3}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <label htmlFor="section-class" className={labelClasses}>
            Class
          </label>
          <select
            id="section-class"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className={inputClasses}
            disabled={classes.length === 0}
          >
            <option value="">
              {classes.length === 0 ? "Add a class first" : "Select a class"}
            </option>
            {classes.map((c) => (
              <option key={c._id} value={c._id}>
                {c.className} ({c.classInWord})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <label htmlFor="section-name" className={labelClasses}>
              Section name
            </label>
            <input
              id="section-name"
              value={sectionName}
              onChange={(e) => setSectionName(e.target.value)}
              placeholder="e.g. A"
              className={inputClasses}
            />
          </div>
          <div className="space-y-1 sm:w-32">
            <label htmlFor="section-max" className={labelClasses}>
              Max limit
            </label>
            <input
              id="section-max"
              value={maxLimit}
              onChange={(e) => setMaxLimit(e.target.value)}
              placeholder="60"
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
        <EntityTable<Section>
          items={items}
          isLoading={isLoading}
          error={loadError}
          emptyLabel="No sections added yet."
          getRowKey={(item) => item._id}
          columns={[
            { header: "Section", render: (item) => <span className="font-medium">{item.sectionName}</span> },
            {
              header: "Class",
              render: (item) => item.classId?.className ?? classNameById.get(item.classId?._id) ?? "—",
            },
            { header: "Max Limit", render: (item) => item.Maxlimit },
          ]}
        />
      </div>
    </SectionCard>
  );
}

function ClassSectionPage() {
  const classCrud = useEntityCrud<SchoolClass, { className: string; classInWord: string }>({
    fetchList: () => superAdminService.getClasses().then((res) => res.classes ?? []),
    create: (payload) => superAdminService.createClass(payload),
  });

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-medium text-marigold-dark">Super Admin · Essential Setting</p>
        <h1 className="mt-1 font-display text-2xl text-ink">Class / Section Setup</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ClassSection
          classes={classCrud.items}
          isLoading={classCrud.isLoading}
          loadError={classCrud.loadError}
          isCreating={classCrud.isCreating}
          createError={classCrud.createError}
          createEntity={classCrud.createEntity}
        />
        <SectionSection classes={classCrud.items} />
      </div>
    </div>
  );
}

export default ClassSectionPage;
