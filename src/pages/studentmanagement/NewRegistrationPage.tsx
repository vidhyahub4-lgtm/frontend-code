import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Camera, CheckCircle2, School, UserPlus } from "lucide-react";
import { SectionCard } from "../../components/common/SectionCard";
import { useSelectedSchool } from "../../hooks/useSelectedSchool";
import { useSelectedSession } from "../../hooks/useSelectedSession";
import { schoolSettingService } from "../../services/schoolSetting.service";
import { ApiError } from "../../types/api.types";
import { encodeClassApplyfor } from "../../lib/classApplyfor";
import { LANGUAGE_GROUPS, RELIGION_GROUPS, type OptionGroup } from "../../lib/registrationOptions";
import type { SchClass } from "../../types/superadmin.types";

const inputClasses =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-marigold/40";
const labelClasses = "text-sm font-medium text-ink-soft";
const requiredLabelClasses = `${labelClasses} after:ml-0.5 after:text-marigold-dark after:content-['*']`;

// Rules below mirror the backend model (models/school-setting/newRegistration.js)
const MOBILE_REGEX = /^[6-9]\d{9}$/;
const AADHAAR_REGEX = /^\d{12}$/;
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PHOTO_MAX_BYTES = 2 * 1024 * 1024; // backend multer limit: 2 MB

/**
 * Only fields the backend actually saves are collected here.
 * Names match the API payload keys exactly.
 */
interface FormValues {
  sname: string;
  fname: string;
  mname: string;
  gname: string;
  gender: "male" | "female" | "other";
  dob: string;
  age: string;
  category: "general" | "obc" | "sc" | "st";
  nationality: string;
  religion: string;
  mothertongue: string;
  secLang: string;
  adharId: string;
  penno: string;
  mob1: string;
  mob2: string;
  whatAppno: string;
  email: string;
  lclass: string;
  lsch: string;
  lper: string;
  lboard: string;
  classApplyfor: string;
  /** Optional. Not a backend field on its own: sent inside `classApplyfor` as `sectionID`. */
  classSection: string;
  registrationdate: string;
}

type FieldKey = keyof FormValues | "session";
type Errors = Partial<Record<FieldKey, string>>;

function emptyValues(): FormValues {
  return {
    sname: "",
    fname: "",
    mname: "",
    gname: "",
    gender: "male",
    dob: "",
    age: "",
    category: "general",
    nationality: "Indian",
    religion: "",
    mothertongue: "",
    secLang: "",
    adharId: "",
    penno: "",
    mob1: "",
    mob2: "",
    whatAppno: "",
    email: "",
    lclass: "",
    lsch: "",
    lper: "",
    lboard: "",
    classApplyfor: "",
    classSection: "",
    registrationdate: new Date().toISOString().slice(0, 10),
  };
}

function ageFromDob(dob: string): string {
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const hadBirthday =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  if (!hadBirthday) age -= 1;
  return age >= 1 ? String(age) : "";
}

function validate(values: FormValues, sessionId: string): Errors {
  const errors: Errors = {};
  const required: [keyof FormValues, string][] = [
    ["sname", "Student name"],
    ["fname", "Father's name"],
    ["mname", "Mother's name"],
    ["gname", "Guardian's name"],
    ["nationality", "Nationality"],
    ["mob1", "Mobile 1"],
    ["whatAppno", "WhatsApp number"],
    ["classApplyfor", "Class applying for"],
  ];

  if (!sessionId) errors.session = "Select a session.";
  required.forEach(([key, label]) => {
    if (!values[key].trim()) errors[key] = `${label} is required.`;
  });

  const age = Number(values.age);
  if (!values.age.trim()) errors.age = "Age is required.";
  else if (!Number.isInteger(age) || age < 1) errors.age = "Enter a valid age (1 or more).";

  if (!errors.mob1 && !MOBILE_REGEX.test(values.mob1)) errors.mob1 = "Enter a valid 10-digit mobile number.";
  if (values.mob2 && !MOBILE_REGEX.test(values.mob2)) errors.mob2 = "Enter a valid 10-digit mobile number.";
  else if (values.mob2 && values.mob2 === values.mob1) errors.mob2 = "Mobile 2 is the same as Mobile 1.";
  if (!errors.whatAppno && !MOBILE_REGEX.test(values.whatAppno))
    errors.whatAppno = "Enter a valid 10-digit WhatsApp number.";
  if (values.adharId && !AADHAAR_REGEX.test(values.adharId)) errors.adharId = "Aadhaar must be 12 digits.";
  if (values.email && !EMAIL_REGEX.test(values.email)) errors.email = "Enter a valid email address.";
  if (values.lper && Number.isNaN(Number(values.lper))) errors.lper = "Enter a number.";

  return errors;
}

const OTHER = "__other__";

/** Dropdown of known options plus "Other", which reveals a text box so any value can still be entered. */
function SelectWithOther({
  id,
  value,
  onChange,
  groups,
  className,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  groups: OptionGroup[];
  className: string;
}) {
  const [other, setOther] = useState(false);
  const known = groups.some((g) => g.options.includes(value));
  const isOther = other || (value !== "" && !known);
  return (
    <div className="space-y-2">
      <select
        id={id}
        value={isOther ? OTHER : value}
        onChange={(e) => {
          if (e.target.value === OTHER) {
            setOther(true);
            onChange("");
          } else {
            setOther(false);
            onChange(e.target.value);
          }
        }}
        className={className}
      >
        <option value="">Select (optional)</option>
        {groups.map((g) => (
          <optgroup key={g.label} label={g.label}>
            {g.options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </optgroup>
        ))}
        <option value={OTHER}>Other (type below)</option>
      </select>
      {isOther && (
        <input
          aria-label="Other value"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type here"
          className={className}
        />
      )}
    </div>
  );
}

function Field({
  id,
  label,
  required,
  error,
  children,
}: {
  id?: string;
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className={required ? requiredLabelClasses : labelClasses}>
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return <h3 className="border-b border-line pb-2 font-display text-base text-ink">{children}</h3>;
}

function RadioGroup<T extends string>({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2">
      {options.map((opt) => (
        <label key={opt.value} className="flex items-center gap-1.5 text-sm text-ink">
          <input
            type="radio"
            name={name}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="h-3.5 w-3.5 accent-marigold"
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}

interface Photo {
  file: File;
  previewUrl: string;
}

/**
 * The form itself. Rendered with key={schId} by the page below so switching
 * school resets everything.
 */
function RegistrationForm({ schId, schCode }: { schId: string; schCode: string }) {
  const { selectedSession } = useSelectedSession();
  const globalSessionId = selectedSession?.id ?? "";

  const [values, setValues] = useState<FormValues>(emptyValues);
  const [errors, setErrors] = useState<Errors>({});
  const [photo, setPhoto] = useState<Photo | null>(null);
  // Which mobile number WhatsApp mirrors ("Same as Mobile 1/2"); null = typed separately.
  const [waSource, setWaSource] = useState<"mob1" | "mob2" | null>(null);
  // Bumped after a successful save so the dropdowns drop their "Other" mode.
  const [formVersion, setFormVersion] = useState(0);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // "Class Applying For" dropdown options — classes assigned to this school
  // (Class/Section Setup). The value submitted is the global Class's _id
  // (sent to the backend as JSON `{ classID }` — see lib/classApplyfor.ts).
  const [schClasses, setSchClasses] = useState<SchClass[]>([]);
  const [schClassesLoading, setSchClassesLoading] = useState(true);
  const [schClassesError, setSchClassesError] = useState<string | null>(null);

  // Session is non-editable here: it always follows the globally selected
  // session (settings panel), same as the school it belongs to.
  const sessionId = globalSessionId;

  useEffect(() => {
    let cancelled = false;
    schoolSettingService
      .getSchClasses(schId)
      .then((res) => {
        if (!cancelled) setSchClasses(res.schClasses ?? []);
      })
      .catch((err) => {
        if (!cancelled)
          setSchClassesError(
            err instanceof ApiError ? err.message : "Could not load classes."
          );
      })
      .finally(() => {
        if (!cancelled) setSchClassesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [schId]);

  // Sections of the currently selected class (same API response, no extra call).
  const sectionOptions =
    schClasses.find((c) => c.classID._id === values.classApplyfor)?.sectionID ?? [];

  // Free the photo's preview URL when the form goes away.
  const previewUrlRef = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    []
  );

  function setValue<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    const mirrors = waSource !== null && key === waSource;
    setValues((prev) => ({ ...prev, [key]: value, ...(mirrors ? { whatAppno: value as string } : {}) }));
    setErrors((prev) =>
      prev[key] || (mirrors && prev.whatAppno)
        ? { ...prev, [key]: undefined, ...(mirrors ? { whatAppno: undefined } : {}) }
        : prev
    );
  }

  // Changing the class invalidates the previously chosen section.
  function handleClassChange(classId: string) {
    setValue("classApplyfor", classId);
    setValue("classSection", "");
  }

  function handleDobChange(dob: string) {
    setValue("dob", dob);
    // Convenience: fill age from DOB (still editable).
    const age = ageFromDob(dob);
    if (age) setValue("age", age);
  }

  function digitsOnly(value: string, max: number) {
    return value.replace(/\D/g, "").slice(0, max);
  }

  function clearPhoto() {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setPhoto(null);
  }

  function handlePhotoChange(file: File | undefined) {
    setPhotoError(null);
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type)) {
      setPhotoError("Only JPG, PNG or WEBP images are allowed.");
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      setPhotoError("Photo must be 2 MB or smaller.");
      return;
    }
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const previewUrl = URL.createObjectURL(file);
    previewUrlRef.current = previewUrl;
    setPhoto({ file, previewUrl });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setSuccessMessage(null);

    const found = validate(values, sessionId);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      setSubmitError("Please fix the highlighted fields.");
      const firstKey = Object.keys(found)[0];
      document.getElementById(`reg-${firstKey}`)?.focus();
      return;
    }

    const formData = new FormData();
    formData.append("schId", schId);
    formData.append("schCode", schCode);
    formData.append("session", sessionId);
    (Object.keys(values) as (keyof FormValues)[]).forEach((key) => {
      const value = values[key].trim();
      if (!value) return; // skip empty optional fields
      if (key === "classSection") return; // travels inside classApplyfor
      // Backend JSON.parse()s this field and expects { classID, sectionID? }.
      formData.append(
        key,
        key === "classApplyfor"
          ? encodeClassApplyfor(value, values.classSection.trim() || undefined)
          : value
      );
    });
    if (photo) formData.append("Image", photo.file);

    setIsSubmitting(true);
    try {
      const res = await schoolSettingService.createNewRegistration(formData);
      const regno = res.data?.regno;
      setSuccessMessage(
        regno !== undefined
          ? `Registration saved. Registration No: ${regno}`
          : "Registration saved successfully."
      );
      setValues(emptyValues());
      setWaSource(null);
      setFormVersion((v) => v + 1);
      setErrors({});
      clearPhoto();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Could not save the registration.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const cls = (key: FieldKey) => `${inputClasses} ${errors[key] ? "border-red-400" : ""}`;

  return (
    <SectionCard title="Student Registration" icon={UserPlus}>
      <form onSubmit={handleSubmit} noValidate className="space-y-7">
        {successMessage && (
          <p
            role="status"
            className="flex items-center gap-2 rounded-md bg-green-50 px-3.5 py-2.5 text-sm text-green-700"
          >
            <CheckCircle2 size={16} /> {successMessage}
          </p>
        )}

        {/* Registration details */}
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Registration No">
            <input
              value="Auto-generated on save"
              readOnly
              className={`${inputClasses} cursor-not-allowed bg-chalk/60 text-ink-soft`}
            />
          </Field>
          <Field id="reg-session" label="Session" required error={errors.session ?? undefined}>
            <input
              id="reg-session"
              value={selectedSession?.name ?? ""}
              readOnly
              disabled
              placeholder="Select session from settings"
              className={`${inputClasses} cursor-not-allowed bg-line/40 text-ink-soft`}
            />
          </Field>
          <Field id="reg-registrationdate" label="Registration Date">
            <input
              id="reg-registrationdate"
              type="date"
              value={values.registrationdate}
              onChange={(e) => setValue("registrationdate", e.target.value)}
              className={inputClasses}
            />
          </Field>
        </div>

        {/* Student details */}
        <section className="space-y-4">
          <SectionHeading>Student Details</SectionHeading>

          <div className="grid gap-5 md:grid-cols-[1fr_auto]">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field id="reg-sname" label="Student's Name" required error={errors.sname}>
                  <input
                    id="reg-sname"
                    value={values.sname}
                    onChange={(e) => setValue("sname", e.target.value)}
                    className={cls("sname")}
                  />
                </Field>
              </div>
              <Field id="reg-fname" label="Father's Name" required error={errors.fname}>
                <input
                  id="reg-fname"
                  value={values.fname}
                  onChange={(e) => setValue("fname", e.target.value)}
                  className={cls("fname")}
                />
              </Field>
              <Field id="reg-mname" label="Mother's Name" required error={errors.mname}>
                <input
                  id="reg-mname"
                  value={values.mname}
                  onChange={(e) => setValue("mname", e.target.value)}
                  className={cls("mname")}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field id="reg-gname" label="Guardian's Name" required error={errors.gname}>
                  <input
                    id="reg-gname"
                    value={values.gname}
                    onChange={(e) => setValue("gname", e.target.value)}
                    className={cls("gname")}
                  />
                </Field>
              </div>
            </div>

            {/* Photo upload */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-md border border-dashed border-line bg-chalk/60 text-ink-soft">
                {photo ? (
                  <img src={photo.previewUrl} alt="Student preview" className="h-full w-full object-cover" />
                ) : (
                  <Camera size={24} />
                )}
              </div>
              <div className="flex items-center gap-2">
                <label className="cursor-pointer rounded-md border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-chalk">
                  {photo ? "Change" : "Upload Photo"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      handlePhotoChange(e.target.files?.[0]);
                      e.target.value = ""; // allow re-picking the same file
                    }}
                  />
                </label>
                {photo && (
                  <button
                    type="button"
                    onClick={clearPhoto}
                    className="text-xs font-medium text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="max-w-[9rem] text-center text-[11px] text-ink-soft">JPG, PNG or WEBP, up to 2 MB</p>
              {photoError && <p className="max-w-[9rem] text-center text-xs text-red-600">{photoError}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Gender" required>
              <RadioGroup
                name="gender"
                value={values.gender}
                onChange={(v) => setValue("gender", v)}
                options={[
                  { value: "male", label: "Male" },
                  { value: "female", label: "Female" },
                  { value: "other", label: "Other" },
                ]}
              />
            </Field>
            <Field id="reg-dob" label="Date of Birth" error={errors.dob}>
              <input
                id="reg-dob"
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                value={values.dob}
                onChange={(e) => handleDobChange(e.target.value)}
                className={cls("dob")}
              />
            </Field>
            <Field id="reg-age" label="Age" required error={errors.age}>
              <input
                id="reg-age"
                inputMode="numeric"
                value={values.age}
                onChange={(e) => setValue("age", digitsOnly(e.target.value, 2))}
                className={cls("age")}
              />
            </Field>
          </div>

          <Field label="Category" required>
            <RadioGroup
              name="category"
              value={values.category}
              onChange={(v) => setValue("category", v)}
              options={[
                { value: "general", label: "General" },
                { value: "obc", label: "OBC" },
                { value: "sc", label: "SC" },
                { value: "st", label: "ST" },
              ]}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field id="reg-nationality" label="Nationality" required error={errors.nationality}>
              <input
                id="reg-nationality"
                value={values.nationality}
                onChange={(e) => setValue("nationality", e.target.value)}
                className={cls("nationality")}
              />
            </Field>
            <Field id="reg-religion" label="Religion" error={errors.religion}>
              <SelectWithOther
                key={`religion-${formVersion}`}
                id="reg-religion"
                value={values.religion}
                onChange={(v) => setValue("religion", v)}
                groups={RELIGION_GROUPS}
                className={cls("religion")}
              />
            </Field>
            <Field id="reg-mothertongue" label="Mother Tongue" error={errors.mothertongue}>
              <SelectWithOther
                key={`tongue-${formVersion}`}
                id="reg-mothertongue"
                value={values.mothertongue}
                onChange={(v) => setValue("mothertongue", v)}
                groups={LANGUAGE_GROUPS}
                className={cls("mothertongue")}
              />
            </Field>
            <Field id="reg-secLang" label="Second Language">
              <input
                id="reg-secLang"
                value={values.secLang}
                onChange={(e) => setValue("secLang", e.target.value)}
                className={inputClasses}
              />
            </Field>
            <Field id="reg-adharId" label="Aadhaar No" error={errors.adharId}>
              <input
                id="reg-adharId"
                inputMode="numeric"
                placeholder="12 digits"
                value={values.adharId}
                onChange={(e) => setValue("adharId", digitsOnly(e.target.value, 12))}
                className={cls("adharId")}
              />
            </Field>
            <Field id="reg-penno" label="PEN No">
              <input
                id="reg-penno"
                value={values.penno}
                onChange={(e) => setValue("penno", e.target.value)}
                className={inputClasses}
              />
            </Field>
          </div>
        </section>

        {/* Contact */}
        <section className="space-y-4">
          <SectionHeading>Contact Details</SectionHeading>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field id="reg-mob1" label="Mobile 1" required error={errors.mob1}>
              <input
                id="reg-mob1"
                inputMode="numeric"
                placeholder="10 digits"
                value={values.mob1}
                onChange={(e) => setValue("mob1", digitsOnly(e.target.value, 10))}
                className={cls("mob1")}
              />
            </Field>
            <Field id="reg-mob2" label="Mobile 2" error={errors.mob2}>
              <input
                id="reg-mob2"
                inputMode="numeric"
                placeholder="10 digits"
                value={values.mob2}
                onChange={(e) => setValue("mob2", digitsOnly(e.target.value, 10))}
                className={cls("mob2")}
              />
            </Field>
            <Field id="reg-whatAppno" label="WhatsApp No" required error={errors.whatAppno}>
              <input
                id="reg-whatAppno"
                inputMode="numeric"
                placeholder="10 digits"
                value={values.whatAppno}
                onChange={(e) => setValue("whatAppno", digitsOnly(e.target.value, 10))}
                readOnly={waSource !== null}
                className={`${cls("whatAppno")} ${waSource !== null ? "bg-paper text-ink-soft" : ""}`}
              />
              <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
                {(["mob1", "mob2"] as const).map(
                  (src) =>
                    (waSource === src || MOBILE_REGEX.test(values[src])) && (
                      <label key={src} className="flex cursor-pointer items-center gap-1.5 text-xs text-ink-soft">
                        <input
                          type="checkbox"
                          checked={waSource === src}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setWaSource(src);
                              setValues((prev) => ({ ...prev, whatAppno: prev[src] }));
                              setErrors((prev) => ({ ...prev, whatAppno: undefined }));
                            } else {
                              setWaSource(null);
                            }
                          }}
                        />
                        Same as Mobile {src === "mob1" ? 1 : 2}
                      </label>
                    )
                )}
              </div>
            </Field>
            <Field id="reg-email" label="Email" error={errors.email}>
              <input
                id="reg-email"
                type="email"
                value={values.email}
                onChange={(e) => setValue("email", e.target.value)}
                className={cls("email")}
              />
            </Field>
          </div>
        </section>

        {/* Previous school */}
        <section className="space-y-4">
          <SectionHeading>Previous School Details</SectionHeading>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field id="reg-lclass" label="Last Class">
              <input
                id="reg-lclass"
                value={values.lclass}
                onChange={(e) => setValue("lclass", e.target.value)}
                className={inputClasses}
              />
            </Field>
            <Field id="reg-lsch" label="Last School">
              <input
                id="reg-lsch"
                value={values.lsch}
                onChange={(e) => setValue("lsch", e.target.value)}
                className={inputClasses}
              />
            </Field>
            <Field id="reg-lper" label="Last School Percentage" error={errors.lper}>
              <input
                id="reg-lper"
                inputMode="decimal"
                value={values.lper}
                onChange={(e) => setValue("lper", e.target.value)}
                className={cls("lper")}
              />
            </Field>
            <Field id="reg-lboard" label="Last School Board">
              <input
                id="reg-lboard"
                value={values.lboard}
                onChange={(e) => setValue("lboard", e.target.value)}
                className={inputClasses}
              />
            </Field>
          </div>
        </section>

        {/* Admission */}
        <section className="space-y-4">
          <SectionHeading>Admission Details</SectionHeading>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field
              id="reg-classApplyfor"
              label="Class Applying For"
              required
              error={errors.classApplyfor ?? schClassesError ?? undefined}
            >
              <select
                id="reg-classApplyfor"
                value={values.classApplyfor}
                onChange={(e) => handleClassChange(e.target.value)}
                disabled={schClassesLoading}
                className={cls("classApplyfor")}
              >
                <option value="">
                  {schClassesLoading ? "Loading classes…" : "Select a class"}
                </option>
                {schClasses.map((schClass) => (
                  <option key={schClass._id} value={schClass.classID._id}>
                    {schClass.classID.className}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="reg-classSection" label="Section Applying For">
              <select
                id="reg-classSection"
                value={values.classSection}
                onChange={(e) => setValue("classSection", e.target.value)}
                disabled={!values.classApplyfor || sectionOptions.length === 0}
                className={inputClasses}
              >
                <option value="">
                  {!values.classApplyfor
                    ? "Select a class first"
                    : sectionOptions.length === 0
                      ? "No sections for this class"
                      : "Select a section (optional)"}
                </option>
                {sectionOptions.map((section) => (
                  <option key={section._id} value={section._id}>
                    {section.sectionName}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        <div className="space-y-3">
          {submitError && (
            <p role="alert" className="rounded-md bg-red-50 px-3.5 py-2 text-sm text-red-600">
              {submitError}
            </p>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center justify-center gap-1.5 rounded-md bg-marigold px-4 py-2 text-sm font-medium text-chalkboard transition hover:bg-marigold-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            <UserPlus size={15} />
            {isSubmitting ? "Saving…" : "Save Registration"}
          </button>
        </div>
      </form>
    </SectionCard>
  );
}

function NewRegistrationPage() {
  const { selectedSchool } = useSelectedSchool();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-marigold-dark">Student Management · Registration</p>
        <h1 className="mt-1 font-display text-2xl text-ink">New Registration</h1>
        {selectedSchool && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
            <School size={14} className="text-marigold-dark" />
            {selectedSchool.name}
          </p>
        )}
      </div>

      {selectedSchool ? (
        <RegistrationForm
          key={selectedSchool.id}
          schId={selectedSchool.id}
          schCode={selectedSchool.schoolCode}
        />
      ) : (
        <div className="rounded-lg border border-dashed border-line bg-white px-5 py-10 text-center">
          <School size={28} className="mx-auto text-marigold-dark" />
          <p className="mt-3 font-display text-lg text-ink">No school selected</p>
          <p className="mt-1 text-sm text-ink-soft">
            Use the settings icon at the top right to select a school first.
          </p>
        </div>
      )}
    </div>
  );
}

export default NewRegistrationPage;
