/**
 * Central place to read and validate environment variables.
 * Never read `import.meta.env` directly elsewhere in the app —
 * import `env` from here instead. This way, if a required
 * variable is missing, the app fails fast with a clear error
 * instead of breaking silently deep inside some API call.
 */

function readEnvVar(key: string, fallback?: string): string {
  const value = import.meta.env[key] ?? fallback;

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}. Did you create a .env file? See .env.example.`
    );
  }

  return value;
}

export const env = {
  apiBaseUrl: readEnvVar("VITE_API_BASE_URL"),
} as const;
