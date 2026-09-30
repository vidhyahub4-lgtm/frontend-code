import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { SectionCard } from "../../components/common/SectionCard";
import { teacherService } from "../../services/teacher.service";
import { ApiError } from "../../types/api.types";
import { TeacherPageShell } from "./TeacherPageShell";
import { inputClasses, labelClasses, primaryButtonClasses } from "./teacherUtils";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

interface AddTeacherFormProps {
  schId: string;
  sessionId: string;
}

function AddTeacherForm({ schId, sessionId }: AddTeacherFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdName, setCreatedName] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setCreatedName(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName) {
      setError("Teacher name is required.");
      return;
    }
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setIsSaving(true);
    try {
      const res = await teacherService.addTeacher({
        name: trimmedName,
        email: trimmedEmail,
        password,
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        schId,
        session: sessionId,
      });
      setCreatedName(res.data.name);
      setName("");
      setEmail("");
      setPhone("");
      setPassword("");
      setShowPassword(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SectionCard title="Add Teacher" icon={UserPlus}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="teacher-name" className={labelClasses}>
              Teacher Name
            </label>
            <input
              id="teacher-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClasses}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="teacher-email" className={labelClasses}>
              Email
            </label>
            <input
              id="teacher-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
              className={inputClasses}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="teacher-phone" className={labelClasses}>
              Phone (optional)
            </label>
            <input
              id="teacher-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClasses}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="teacher-password" className={labelClasses}>
              Login Password
            </label>
            <div className="relative">
              <input
                id="teacher-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className={`${inputClasses} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-ink-soft hover:text-ink"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3.5 py-2 text-sm text-red-600">
            {error}
          </p>
        )}
        {createdName && (
          <div role="status" className="rounded-md bg-green-50 px-3.5 py-3 text-sm text-green-700">
            <p className="font-medium">Teacher “{createdName}” added.</p>
            <p className="mt-1">
              Next:{" "}
              <Link to="/school-setting/teachers-setting/assign-class" className="underline">
                assign classes &amp; subjects
              </Link>{" "}
              or{" "}
              <Link to="/school-setting/teachers-setting/class-teacher" className="underline">
                make a class teacher
              </Link>
              .
            </p>
          </div>
        )}

        <button type="submit" disabled={isSaving} className={primaryButtonClasses}>
          {isSaving ? "Saving…" : "Add Teacher"}
        </button>
      </form>
    </SectionCard>
  );
}

function AddTeacherPage() {
  return (
    <TeacherPageShell title="Add Teacher">
      {({ school, session }) => <AddTeacherForm schId={school.id} sessionId={session.id} />}
    </TeacherPageShell>
  );
}

export default AddTeacherPage;
