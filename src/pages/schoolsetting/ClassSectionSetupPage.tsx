import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { School as SchoolIcon, Plus } from "lucide-react";
import { SectionCard } from "../../components/common/SectionCard";
import { EntityTable } from "../../components/common/EntityTable";
import { useEntityCrud } from "../../hooks/useEntityCrud";
import { superAdminService } from "../../services/superadmin.service";
import { schoolSettingService } from "../../services/schoolSetting.service";
import { ApiError } from "../../types/api.types";
import type { School, SchoolClass, Section, SchClass } from "../../types/superadmin.types";

const inputClasses =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-marigold/40";
const labelClasses = "text-sm font-medium text-ink-soft";

function ClassSectionSetupPage() {
  // Schools, master Classes and master Sections are all already-built
  // "create one, list many" data — reuse useEntityCrud in read-only mode
  // (fetchList only; create is unused/no-op here).
  const { items: schools, isLoading: schoolsLoading } = useEntityCrud<
    School,
    never
  >({
    fetchList: () => superAdminService.getSchools().then((res) => res.schools ?? []),
    create: () => Promise.resolve(),
  });

  const { items: classes, isLoading: classesLoading } = useEntityCrud<
    SchoolClass,
    never
  >({
    fetchList: () => superAdminService.getClasses().then((res) => res.classes ?? []),
    create: () => Promise.resolve(),
  });

  const { items: sections, isLoading: sectionsLoading } = useEntityCrud<
    Section,
    never
  >({
    fetchList: () => superAdminService.getSections().then((res) => res.sections ?? []),
    create: () => Promise.resolve(),
  });

  const [schoolID, setSchoolID] = useState("");
  const [classID, setClassID] = useState("");
  const [sectionID, setSectionID] = useState("");

  const [schClasses, setSchClasses] = useState<SchClass[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadSchClasses = useCallback((forSchoolID: string) => {
    if (!forSchoolID) {
      setSchClasses([]);
      return;
    }
    setListLoading(true);
    setListError(null);
    schoolSettingService
      .getSchClasses(forSchoolID)
      .then((res) => setSchClasses(res.schClasses ?? []))
      .catch((err) => {
        setListError(err instanceof ApiError ? err.message : "Could not load data.");
      })
      .finally(() => setListLoading(false));
  }, []);

  useEffect(() => {
    setClassID("");
    setSectionID("");
    loadSchClasses(schoolID);
  }, [schoolID, loadSchClasses]);

  // Sections are tied to a Class (classId ref), so filter the section
  // dropdown to only the sections belonging to the selected class —
  // same dependent-dropdown pattern as State → City.
  const sectionsForClass = useMemo(
    () => sections.filter((s) => s.classId._id === classID),
    [sections, classID]
  );

  const selectedSchool = useMemo(
    () => schools.find((s) => s._id === schoolID),
    [schools, schoolID]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!schoolID || !classID || !sectionID || !selectedSchool) return;

    setIsCreating(true);
    setCreateError(null);
    try {
      await schoolSettingService.createSchClass({
        schoolID,
        schCode: selectedSchool.schoolCode,
        classID,
        sectionID,
      });
      setClassID("");
      setSectionID("");
      loadSchClasses(schoolID);
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : "Could not save. Please try again.");
    } finally {
      setIsCreating(false);
    }
  }

  const canSubmit = Boolean(schoolID && classID && sectionID);

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-medium text-marigold-dark">School Setting · Essential Setting</p>
        <h1 className="mt-1 font-display text-2xl text-ink">Class / Section Setup</h1>
      </div>

      <SectionCard title="Class / Section Setup" icon={SchoolIcon}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="scs-school" className={labelClasses}>
              Select School
            </label>
            <select
              id="scs-school"
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

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1">
              <label htmlFor="scs-class" className={labelClasses}>
                Select Class
              </label>
              <select
                id="scs-class"
                value={classID}
                onChange={(e) => setClassID(e.target.value)}
                className={inputClasses}
                disabled={!schoolID || classesLoading || classes.length === 0}
              >
                <option value="">
                  {!schoolID
                    ? "Select a school first"
                    : classesLoading
                    ? "Loading classes…"
                    : "Select a class"}
                </option>
                {classes.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.classInWord} ({c.className})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 space-y-1">
              <label htmlFor="scs-section" className={labelClasses}>
                Select Section
              </label>
              <select
                id="scs-section"
                value={sectionID}
                onChange={(e) => setSectionID(e.target.value)}
                className={inputClasses}
                disabled={!classID || sectionsLoading || sectionsForClass.length === 0}
              >
                <option value="">
                  {!classID
                    ? "Select a class first"
                    : sectionsForClass.length === 0
                    ? "No sections for this class"
                    : "Select a section"}
                </option>
                {sectionsForClass.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.sectionName}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={isCreating || !canSubmit}
              className="flex items-center justify-center gap-1.5 rounded-md bg-marigold px-4 py-2 text-sm font-medium text-chalkboard transition hover:bg-marigold-dark disabled:cursor-not-allowed disabled:opacity-60 sm:mb-0.5"
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
          {!schoolID ? (
            <div className="py-8 text-center text-sm text-ink-soft">
              Select a school above to see its classes and sections.
            </div>
          ) : (
            <EntityTable<SchClass>
              items={schClasses}
              isLoading={listLoading}
              error={listError}
              emptyLabel="No classes added for this school yet."
              getRowKey={(item) => item._id}
              columns={[
                { header: "Class", render: (item) => <span className="font-medium">{item.classID.className}</span> },
                { header: "Class in Words", render: (item) => item.classID.classInWord },
                {
                  header: "Section",
                  render: (item) => (
                    <div className="flex flex-wrap gap-1.5">
                      {item.sectionID.map((section) => (
                        <span
                          key={section._id}
                          className="rounded-full bg-marigold/15 px-2.5 py-0.5 text-xs font-medium text-ink"
                        >
                          {section.sectionName}
                        </span>
                      ))}
                    </div>
                  ),
                },
              ]}
            />
          )}
        </div>
      </SectionCard>
    </div>
  );
}

export default ClassSectionSetupPage;
