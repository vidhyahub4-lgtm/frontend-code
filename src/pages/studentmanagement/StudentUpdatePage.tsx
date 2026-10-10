import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Pencil, School, Search, UserCog } from "lucide-react";
import { SectionCard } from "../../components/common/SectionCard";
import { EntityTable } from "../../components/common/EntityTable";
import { SelectWithOther } from "../../components/common/SelectWithOther";
import { env } from "../../config/env";
import { useSelectedSchool } from "../../hooks/useSelectedSchool";
import { useSelectedSession } from "../../hooks/useSelectedSession";
import { LANGUAGE_GROUPS, RELIGION_GROUPS } from "../../lib/registrationOptions";
import { schoolSettingService } from "../../services/schoolSetting.service";
import { ApiError } from "../../types/api.types";
import type { SchClass } from "../../types/superadmin.types";
import type { EnrolledStudentRow, ListedStudentReg } from "../../types/studentList.types";

const MOBILE_REGEX = /^[6-9]\d{9}$/;
const AADHAAR_REGEX = /^\d{12}$/;
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PHOTO_MAX_BYTES = 2 * 1024 * 1024; // backend multer limit: 2 MB
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const inputClasses =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-marigold/40 disabled:opacity-60";
const labelClasses = "text-sm font-medium text-ink-soft";

const FIELDS = [
  "sname", "fname", "mname", "gname", "gender", "category", "dob", "age", "nationality", "religion",
  "mothertongue", "secLang", "adharId", "penno", "mob1", "mob2", "whatAppno", "email",
  "lclass", "lsch", "lper", "lboard",
] as const;
type FieldName = (typeof FIELDS)[number];
type FormValues = Record<FieldName, string>;
type Errors = Partial<Record<FieldName, string>>;

const REQUIRED: [FieldName, string][] = [
  ["sname", "Student name"], ["fname", "Father's name"], ["mname", "Mother's name"], ["gname", "Guardian's name"],
  ["gender", "Gender"], ["category", "Category"], ["nationality", "Nationality"], ["mob1", "Mobile 1"], ["whatAppno", "WhatsApp number"],
];

function toForm(reg: ListedStudentReg | null | undefined): FormValues {
  const get = (k: FieldName) => {
    const v = (reg as Record<string, unknown> | null | undefined)?.[k];
    return v === undefined || v === null ? "" : String(v);
  };
  const values = Object.fromEntries(FIELDS.map((f) => [f, get(f)])) as FormValues;
  values.dob = normalizeDob(values.dob);
  return values;
}

/** The date input needs "YYYY-MM-DD". Older saves stored dob as a long date string, so parse those too. */
function normalizeDob(raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  if (ISO_DATE.test(value.slice(0, 10))) return value.slice(0, 10);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
}

function ageFromDob(dob: string): string {
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const hadBirthday =
    today.getMonth() > birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  if (!hadBirthday) age -= 1;
  return age >= 1 ? String(age) : "";
}

function validate(v: FormValues): Errors {
  const errors: Errors = {};
  REQUIRED.forEach(([k, label]) => {
    if (!v[k].trim()) errors[k] = `${label} is required.`;
  });
  const age = Number(v.age);
  if (!v.age.trim()) errors.age = "Age is required.";
  else if (!Number.isInteger(age) || age < 1) errors.age = "Enter a valid age (1 or more).";
  if (v.mob1 && !MOBILE_REGEX.test(v.mob1)) errors.mob1 = "Enter a valid 10-digit mobile number.";
  if (v.mob2 && !MOBILE_REGEX.test(v.mob2)) errors.mob2 = "Enter a valid 10-digit mobile number.";
  else if (v.mob2 && v.mob2 === v.mob1) errors.mob2 = "Mobile 2 is the same as Mobile 1.";
  if (v.whatAppno && !MOBILE_REGEX.test(v.whatAppno)) errors.whatAppno = "Enter a valid 10-digit WhatsApp number.";
  if (v.adharId && !AADHAAR_REGEX.test(v.adharId)) errors.adharId = "Aadhaar must be 12 digits.";
  if (v.email && !EMAIL_REGEX.test(v.email)) errors.email = "Enter a valid email address.";
  if (v.lper && (Number.isNaN(Number(v.lper)) || Number(v.lper) < 0 || Number(v.lper) > 100)) errors.lper = "Enter a percentage between 0 and 100.";
  return errors;
}

function photoUrl(image?: string): string | null {
  return image ? `${env.apiBaseUrl}/uploads/studentImage/${encodeURIComponent(image)}` : null;
}

function Field({ id, label, required, error, children }: { id: string; label: string; required?: boolean; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className={labelClasses}>
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      {children}
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-3 rounded-lg border border-line p-4">
      <legend className="px-2 text-sm font-semibold text-ink">{title}</legend>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </fieldset>
  );
}

function StudentEditor({
  schId,
  row,
  onBack,
  onSaved,
}: {
  schId: string;
  row: EnrolledStudentRow;
  onBack: () => void;
  onSaved: (reg: ListedStudentReg) => void;
}) {
  const reg = row.studentId?.regno ?? null;
  const original = useMemo(() => toForm(reg), [reg]);
  const [values, setValues] = useState<FormValues>(original);
  const [errors, setErrors] = useState<Errors>({});
  const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.preview); }, [photo]);

  const changed = FIELDS.filter((f) => values[f].trim() !== original[f].trim());
  const dirty = changed.length > 0 || photo !== null;

  function setValue(key: FieldName, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
    setSaveMessage(null);
  }
  const digits = (value: string, max: number) => value.replace(/\D/g, "").slice(0, max);
  const cls = (key: FieldName) => `${inputClasses} ${errors[key] ? "border-red-400" : ""}`;

  function handlePhoto(file: File | undefined) {
    setPhotoError(null);
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type)) {
      setPhotoError("Photo must be a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      setPhotoError("Photo must be 2 MB or smaller.");
      return;
    }
    setPhoto({ file, preview: URL.createObjectURL(file) });
    setSaveMessage(null);
  }

  async function handleSave() {
    if (isSaving || !dirty) return;
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setSaveError("Please fix the highlighted fields.");
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    // Only the fields that actually changed are sent.
    const formData = new FormData();
    formData.append("schId", schId);
    changed.forEach((f) => formData.append(f, values[f].trim()));
    // A dob saved in the old long format gets rewritten as YYYY-MM-DD along with this save.
    const storedDob = String((reg as { dob?: unknown } | null)?.dob ?? "").trim();
    if (storedDob && !ISO_DATE.test(storedDob) && values.dob && !changed.includes("dob")) {
      formData.append("dob", values.dob);
    }
    if (photo) formData.append("Image", photo.file);
    try {
      const res = await schoolSettingService.updateStudent(reg?._id ?? "", formData);
      onSaved(res.data);
      setSaveMessage(res.message || "Student details updated.");
      setPhoto(null);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Could not update the student.");
    } finally {
      setIsSaving(false);
    }
  }

  const currentPhoto = photo?.preview ?? photoUrl(reg?.Image);

  return (
    <SectionCard title="Edit Student" icon={UserCog}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-marigold-dark hover:underline">
            <ArrowLeft size={14} /> Back to list
          </button>
          <p className="text-sm text-ink-soft">
            Adm No <span className="font-medium text-ink">{row.studentId?.admno || "—"}</span>
            {reg?.regno && <> · Reg No <span className="font-medium text-ink">{reg.regno}</span></>}
          </p>
        </div>

        <div className="flex items-center gap-4 rounded-lg bg-paper p-4">
          {currentPhoto ? (
            <img src={currentPhoto} alt="" className="h-20 w-20 rounded-lg border border-line object-cover" />
          ) : (
            <span className="flex h-20 w-20 items-center justify-center rounded-lg border border-line bg-white text-2xl font-display text-ink-soft">
              {(values.sname.charAt(0) || "?").toUpperCase()}
            </span>
          )}
          <div className="space-y-1">
            <p className="font-display text-lg text-ink">{values.sname || "Student"}</p>
            <label htmlFor="su-photo" className="cursor-pointer text-sm font-medium text-marigold-dark hover:underline">
              {photo ? "Choose a different photo" : "Change photo"}
            </label>
            <input id="su-photo" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => handlePhoto(e.target.files?.[0])} />
            {photoError && <p className="text-xs text-red-600">{photoError}</p>}
            {photo && <p className="text-xs text-ink-soft">New photo will be saved with the changes.</p>}
          </div>
        </div>

        <Group title="Personal details">
          <Field id="su-sname" label="Student Name" required error={errors.sname}>
            <input id="su-sname" value={values.sname} onChange={(e) => setValue("sname", e.target.value)} className={cls("sname")} />
          </Field>
          <Field id="su-gender" label="Gender" required error={errors.gender}>
            <select id="su-gender" value={values.gender} onChange={(e) => setValue("gender", e.target.value)} className={cls("gender")}>
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field id="su-category" label="Category" required error={errors.category}>
            <select id="su-category" value={values.category} onChange={(e) => setValue("category", e.target.value)} className={cls("category")}>
              <option value="">Select</option>
              <option value="general">General</option>
              <option value="obc">OBC</option>
              <option value="sc">SC</option>
              <option value="st">ST</option>
            </select>
          </Field>
          <Field id="su-dob" label="Date of Birth" error={errors.dob}>
            <input
              id="su-dob"
              type="date"
              value={values.dob}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => {
                setValue("dob", e.target.value);
                const age = ageFromDob(e.target.value);
                if (age) setValue("age", age);
              }}
              className={cls("dob")}
            />
          </Field>
          <Field id="su-age" label="Age" required error={errors.age}>
            <input id="su-age" inputMode="numeric" value={values.age} onChange={(e) => setValue("age", digits(e.target.value, 3))} className={cls("age")} />
          </Field>
          <Field id="su-nationality" label="Nationality" required error={errors.nationality}>
            <input id="su-nationality" value={values.nationality} onChange={(e) => setValue("nationality", e.target.value)} className={cls("nationality")} />
          </Field>
          <Field id="su-religion" label="Religion" error={errors.religion}>
            <SelectWithOther id="su-religion" value={values.religion} onChange={(v) => setValue("religion", v)} groups={RELIGION_GROUPS} className={cls("religion")} />
          </Field>
          <Field id="su-tongue" label="Mother Tongue" error={errors.mothertongue}>
            <SelectWithOther id="su-tongue" value={values.mothertongue} onChange={(v) => setValue("mothertongue", v)} groups={LANGUAGE_GROUPS} className={cls("mothertongue")} />
          </Field>
          <Field id="su-seclang" label="Second Language" error={errors.secLang}>
            <SelectWithOther id="su-seclang" value={values.secLang} onChange={(v) => setValue("secLang", v)} groups={LANGUAGE_GROUPS} className={cls("secLang")} />
          </Field>
          <Field id="su-adhar" label="Aadhaar No." error={errors.adharId}>
            <input id="su-adhar" inputMode="numeric" value={values.adharId} onChange={(e) => setValue("adharId", digits(e.target.value, 12))} className={cls("adharId")} />
          </Field>
          <Field id="su-penno" label="PEN No." error={errors.penno}>
            <input id="su-penno" value={values.penno} onChange={(e) => setValue("penno", e.target.value)} className={cls("penno")} />
          </Field>
        </Group>

        <Group title="Family">
          <Field id="su-fname" label="Father's Name" required error={errors.fname}>
            <input id="su-fname" value={values.fname} onChange={(e) => setValue("fname", e.target.value)} className={cls("fname")} />
          </Field>
          <Field id="su-mname" label="Mother's Name" required error={errors.mname}>
            <input id="su-mname" value={values.mname} onChange={(e) => setValue("mname", e.target.value)} className={cls("mname")} />
          </Field>
          <Field id="su-gname" label="Guardian's Name" required error={errors.gname}>
            <input id="su-gname" value={values.gname} onChange={(e) => setValue("gname", e.target.value)} className={cls("gname")} />
          </Field>
        </Group>

        <Group title="Contact">
          <Field id="su-mob1" label="Mobile 1" required error={errors.mob1}>
            <input id="su-mob1" inputMode="numeric" value={values.mob1} onChange={(e) => setValue("mob1", digits(e.target.value, 10))} className={cls("mob1")} />
          </Field>
          <Field id="su-mob2" label="Mobile 2" error={errors.mob2}>
            <input id="su-mob2" inputMode="numeric" value={values.mob2} onChange={(e) => setValue("mob2", digits(e.target.value, 10))} className={cls("mob2")} />
          </Field>
          <Field id="su-wa" label="WhatsApp No." required error={errors.whatAppno}>
            <input id="su-wa" inputMode="numeric" value={values.whatAppno} onChange={(e) => setValue("whatAppno", digits(e.target.value, 10))} className={cls("whatAppno")} />
            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
              {(["mob1", "mob2"] as const).map(
                (src) =>
                  MOBILE_REGEX.test(values[src]) &&
                  values.whatAppno !== values[src] && (
                    <label key={src} className="flex cursor-pointer items-center gap-1.5 text-xs text-ink-soft">
                      <input type="checkbox" checked={false} onChange={() => setValue("whatAppno", values[src])} />
                      Same as Mobile {src === "mob1" ? 1 : 2}
                    </label>
                  )
              )}
            </div>
          </Field>
          <Field id="su-email" label="Email" error={errors.email}>
            <input id="su-email" type="email" value={values.email} onChange={(e) => setValue("email", e.target.value)} className={cls("email")} />
          </Field>
        </Group>

        <Group title="Previous school">
          <Field id="su-lsch" label="School Name" error={errors.lsch}>
            <input id="su-lsch" value={values.lsch} onChange={(e) => setValue("lsch", e.target.value)} className={cls("lsch")} />
          </Field>
          <Field id="su-lclass" label="Last Class" error={errors.lclass}>
            <input id="su-lclass" value={values.lclass} onChange={(e) => setValue("lclass", e.target.value)} className={cls("lclass")} />
          </Field>
          <Field id="su-lper" label="Percentage" error={errors.lper}>
            <input id="su-lper" inputMode="decimal" value={values.lper} onChange={(e) => setValue("lper", e.target.value.replace(/[^\d.]/g, "").slice(0, 5))} className={cls("lper")} />
          </Field>
          <Field id="su-lboard" label="Board" error={errors.lboard}>
            <input id="su-lboard" value={values.lboard} onChange={(e) => setValue("lboard", e.target.value)} className={cls("lboard")} />
          </Field>
        </Group>

        {saveError && (
          <p role="alert" className="flex items-center gap-1.5 text-sm text-red-700">
            <AlertCircle size={14} /> {saveError}
          </p>
        )}
        {saveMessage && (
          <p role="status" className="flex items-center gap-1.5 text-sm text-emerald-700">
            <CheckCircle2 size={14} /> {saveMessage}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || isSaving}
            aria-busy={isSaving}
            className="inline-flex items-center gap-1.5 rounded-md bg-marigold px-4 py-2 text-sm font-medium text-ink hover:bg-marigold-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving && <Loader2 size={14} className="animate-spin" />}
            {isSaving ? "Saving…" : "Save Changes"}
          </button>
          <button type="button" onClick={() => { setValues(original); setPhoto(null); setErrors({}); setSaveError(null); }} disabled={!dirty || isSaving} className="rounded-md border border-line bg-white px-4 py-2 text-sm text-ink hover:bg-chalk disabled:opacity-50">
            Reset
          </button>
          {dirty && <span className="text-xs text-ink-soft">{changed.length + (photo ? 1 : 0)} unsaved change(s)</span>}
        </div>
      </div>
    </SectionCard>
  );
}

function StudentUpdateContent({ schId, sessionId }: { schId: string; sessionId: string }) {
  const [schClasses, setSchClasses] = useState<SchClass[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [classesError, setClassesError] = useState<string | null>(null);
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [students, setStudents] = useState<EnrolledStudentRow[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    schoolSettingService
      .getSchClasses(schId)
      .then((res) => { if (!cancelled) setSchClasses(res.schClasses ?? []); })
      .catch((err) => { if (!cancelled) setClassesError(err instanceof ApiError ? err.message : "Could not load classes."); })
      .finally(() => { if (!cancelled) setClassesLoading(false); });
    return () => { cancelled = true; };
  }, [schId]);

  const sectionOptions = schClasses.find((c) => c.classID._id === classId)?.sectionID ?? [];

  async function handleShow() {
    setIsLoading(true);
    setError(null);
    setEditingId(null);
    try {
      const res = await schoolSettingService.getEnrolledStudentsOfClass({ schId, session: sessionId, classID: classId, sectionId });
      setStudents(res.data ?? []);
    } catch (err) {
      setStudents(null);
      setError(err instanceof ApiError ? err.message : "Could not load students.");
    } finally {
      setIsLoading(false);
    }
  }

  const editing = students?.find((r) => r._id === editingId) ?? null;
  const q = query.trim().toLowerCase();
  const visible = (students ?? []).filter(
    (r) =>
      !q ||
      (r.studentId?.regno?.sname ?? "").toLowerCase().includes(q) ||
      (r.studentId?.admno ?? "").toLowerCase().includes(q) ||
      (r.studentId?.regno?.fname ?? "").toLowerCase().includes(q)
  );

  if (editing) {
    return (
      <StudentEditor
        key={editing._id}
        schId={schId}
        row={editing}
        onBack={() => setEditingId(null)}
        onSaved={(reg) =>
          setStudents((prev) =>
            prev
              ? prev.map((r) => (r._id === editing._id && r.studentId ? { ...r, studentId: { ...r.studentId, regno: { ...r.studentId.regno, ...reg } } } : r))
              : prev
          )
        }
      />
    );
  }

  return (
    <SectionCard title="Student Update" icon={UserCog}>
      <div className="space-y-4">
        {classesError && (
          <p className="flex items-center gap-1.5 text-sm text-red-700">
            <AlertCircle size={14} /> {classesError}
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-3 sm:items-end">
          <div className="space-y-1">
            <label htmlFor="su-class" className={labelClasses}>Class</label>
            <select
              id="su-class"
              value={classId}
              onChange={(e) => { setClassId(e.target.value); setSectionId(""); setStudents(null); setError(null); }}
              disabled={classesLoading}
              className={inputClasses}
            >
              <option value="">{classesLoading ? "Loading classes…" : "Select a class"}</option>
              {schClasses.map((c) => (
                <option key={c.classID._id} value={c.classID._id}>{c.classID.className}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="su-section" className={labelClasses}>Section</label>
            <select
              id="su-section"
              value={sectionId}
              onChange={(e) => { setSectionId(e.target.value); setStudents(null); }}
              disabled={!classId || sectionOptions.length === 0}
              className={inputClasses}
            >
              <option value="">
                {!classId ? "Select a class first" : sectionOptions.length === 0 ? "No sections for this class" : "Select a section"}
              </option>
              {sectionOptions.map((s) => (
                <option key={s._id} value={s._id}>{s.sectionName}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleShow}
            disabled={!classId || !sectionId || isLoading}
            className="rounded-md bg-marigold px-4 py-2 text-sm font-medium text-ink hover:bg-marigold-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Loading…" : "Show Students"}
          </button>
        </div>

        {students && students.length > 0 && (
          <div className="relative max-w-sm">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, father's name or adm no."
              aria-label="Search students"
              className="w-full rounded-md border border-line bg-white py-2 pl-8 pr-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-marigold/40"
            />
          </div>
        )}

        {(students !== null || isLoading || error) && (
          <EntityTable
            items={visible}
            isLoading={isLoading}
            error={error}
            emptyLabel={q ? "No student matches your search." : "No students enrolled in this class and section."}
            getRowKey={(r) => r._id}
            columns={[
              { header: "Roll", render: (r) => (Number(r.rollNo) ? r.rollNo : "—") },
              { header: "Adm No", render: (r) => r.studentId?.admno || "—" },
              { header: "Student Name", render: (r) => r.studentId?.regno?.sname || "—" },
              { header: "Father's Name", render: (r) => r.studentId?.regno?.fname || "—" },
              { header: "Mobile", render: (r) => r.studentId?.regno?.mob1 || "—" },
              {
                header: "Action",
                render: (r) => (
                  <button
                    type="button"
                    onClick={() => setEditingId(r._id)}
                    disabled={!r.studentId?.regno}
                    className="inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-3 py-1 text-sm text-ink hover:bg-chalk disabled:opacity-50"
                  >
                    <Pencil size={13} /> Edit
                  </button>
                ),
              },
            ]}
          />
        )}
      </div>
    </SectionCard>
  );
}

function StudentUpdatePage() {
  const { selectedSchool } = useSelectedSchool();
  const { selectedSession } = useSelectedSession();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-marigold-dark">Student Management · Manage / Update</p>
        <h1 className="mt-1 font-display text-2xl text-ink">Student Update</h1>
        {selectedSchool && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
            <School size={14} className="text-marigold-dark" />
            {selectedSchool.name}
            {selectedSession && ` · Session ${selectedSession.name}`}
          </p>
        )}
      </div>

      {selectedSchool && selectedSession ? (
        <StudentUpdateContent key={`${selectedSchool.id}:${selectedSession.id}`} schId={selectedSchool.id} sessionId={selectedSession.id} />
      ) : (
        <div className="rounded-lg border border-dashed border-line bg-white px-5 py-10 text-center">
          <AlertCircle size={28} className="mx-auto text-marigold-dark" />
          <p className="mt-3 font-display text-lg text-ink">
            {selectedSchool ? "No session selected" : "No school selected"}
          </p>
          <p className="mt-1 text-sm text-ink-soft">Use the settings icon at the top right to select a school and session first.</p>
        </div>
      )}
    </div>
  );
}

export default StudentUpdatePage;
