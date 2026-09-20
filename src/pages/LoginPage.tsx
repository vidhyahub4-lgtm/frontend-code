import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { clearSessionExpiry, peekSessionExpiry } from "../lib/sessionExpiry";
import { authService } from "../services/auth.service";
import { ApiError } from "../types/api.types";

interface FormErrors {
  username?: string;
  email?: string;
  password?: string;
}

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  // Set when the user was logged out because their session expired.
  const [expiry] = useState(() => peekSessionExpiry());

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function validate(): boolean {
    const nextErrors: FormErrors = {};

    if (!username.trim()) {
      nextErrors.username = "Enter the admin username.";
    }

    if (!email.trim()) {
      nextErrors.email = "Enter the registered email.";
    } else if (!emailPattern.test(email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!password) {
      nextErrors.password = "Enter the password.";
    } else if (password.length < 6) {
      nextErrors.password = "Password must be at least 6 characters.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const response = await authService.login({
        loginUserName: username.trim(),
        email: email.trim(),
        password,
      });

      login(response);
      clearSessionExpiry();
      // Return to the page they were on when the session expired, if any.
      navigate(expiry?.returnTo ?? "/dashboard", { replace: true });
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Something went wrong. Please try again.";
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-paper">
      {/* Brand panel */}
      <div className="relative md:w-1/2 bg-chalkboard text-chalk px-8 py-12 md:p-16 flex flex-col justify-between overflow-hidden">
        <div className="flex items-center gap-3">
          <ChalkMarkIcon />
          <span className="font-display text-2xl tracking-tight">
            VidyaHub
          </span>
        </div>

        <div className="my-16 md:my-0">
          <h1 className="font-display text-4xl md:text-5xl leading-tight max-w-md">
            Every student's record, in one shared register.
          </h1>
          <p className="mt-5 text-chalk/70 max-w-sm text-[15px] leading-relaxed">
            Sign in to manage admissions, attendance and academic records for
            your school.
          </p>
        </div>

        <p className="hidden md:block text-chalk/50 text-sm">
          For school administrators only.
        </p>

        <div className="pointer-events-none absolute -bottom-16 -right-16 opacity-20 md:opacity-30">
          <ChalkBookIllustration />
        </div>
      </div>

      {/* Form panel */}
      <div className="md:w-1/2 flex items-center justify-center px-6 py-12 md:p-16">
        <div className="w-full max-w-sm">
          <h2 className="font-display text-3xl text-ink">Welcome back</h2>
          <p className="mt-2 text-ink-soft text-[15px]">
            Sign in to your administrator account.
          </p>

          <form className="mt-9 space-y-5" onSubmit={handleSubmit} noValidate>
            <Field
              id="username"
              label="Username"
              type="text"
              value={username}
              onChange={setUsername}
              error={errors.username}
              autoComplete="username"
              placeholder="e.g. school_admin"
            />

            <Field
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              error={errors.email}
              autoComplete="email"
              placeholder="you@school.edu"
            />

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-ink"
              >
                Password
              </label>
              <div className="mt-1.5 relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`w-full rounded-md border bg-white px-3.5 py-2.5 pr-11 text-ink placeholder:text-ink-soft/50 outline-none transition focus:border-chalkboard focus:ring-2 focus:ring-chalkboard/15 ${
                    errors.password ? "border-red-400" : "border-line"
                  }`}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={
                    errors.password ? "password-error" : undefined
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink transition"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="mt-1.5 text-sm text-red-500">
                  {errors.password}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between text-sm pt-1">
              <label className="flex items-center gap-2 text-ink-soft">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-line text-chalkboard focus:ring-chalkboard/20"
                />
                Remember me
              </label>
              <a href="#" className="text-ink-soft hover:text-ink transition">
                Forgot password?
              </a>
            </div>

            {expiry && !formError && (
              <p
                role="status"
                className="rounded-md bg-amber-50 px-3.5 py-2 text-sm text-amber-800"
              >
                Your session expired. Please log in again.
              </p>
            )}

            {formError && (
              <p
                role="alert"
                className="rounded-md bg-red-50 px-3.5 py-2.5 text-sm text-red-600"
              >
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-md bg-marigold py-2.5 font-medium text-chalkboard transition hover:bg-marigold-dark disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

interface FieldProps {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoComplete?: string;
  placeholder?: string;
}

function Field({
  id,
  label,
  type,
  value,
  onChange,
  error,
  autoComplete,
  placeholder,
}: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={`mt-1.5 w-full rounded-md border bg-white px-3.5 py-2.5 text-ink placeholder:text-ink-soft/50 outline-none transition focus:border-chalkboard focus:ring-2 focus:ring-chalkboard/15 ${
          error ? "border-red-400" : "border-line"
        }`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}

function ChalkMarkIcon() {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 30 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5 22C5 13 10 6 15 6C20 6 25 13 25 22"
        stroke="#E8A33D"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M9 22C9 15.5 12 10 15 10C18 10 21 15.5 21 22"
        stroke="#F4F1E8"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="15" cy="24" r="1.6" fill="#E8A33D" />
    </svg>
  );
}

function ChalkBookIllustration() {
  return (
    <svg
      width="340"
      height="340"
      viewBox="0 0 340 340"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g stroke="#F4F1E8" strokeWidth="2" strokeLinecap="round">
        <path d="M60 260 L60 100 Q120 80 170 100 L170 260 Q120 240 60 260Z" />
        <path d="M280 260 L280 100 Q220 80 170 100 L170 260 Q220 240 280 260Z" />
        <path d="M80 130 L150 122" strokeDasharray="3 6" />
        <path d="M80 155 L150 147" strokeDasharray="3 6" />
        <path d="M80 180 L150 172" strokeDasharray="3 6" />
        <path d="M190 122 L260 130" strokeDasharray="3 6" />
        <path d="M190 147 L260 155" strokeDasharray="3 6" />
        <path d="M190 172 L260 180" strokeDasharray="3 6" />
      </g>
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1.5 10S4.5 4 10 4s8.5 6 8.5 6-3 6-8.5 6-8.5-6-8.5-6Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2.5 2.5l15 15M8.3 8.4a2.4 2.4 0 0 0 3.3 3.3M6.2 5.3C3.3 6.6 1.5 10 1.5 10s3 6 8.5 6c1.5 0 2.8-.4 3.9-1M14.1 14.1C16.6 12.6 18.5 10 18.5 10s-1.6-3.2-5-4.9"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default LoginPage;
