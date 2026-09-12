import { useCallback, useEffect, useState } from "react";
import { generateSchoolCode } from "../lib/schoolCode";
import { superAdminService } from "../services/superadmin.service";
import { ApiError } from "../types/api.types";

const MAX_ATTEMPTS = 5;

interface UseSchoolCodeResult {
  code: string;
  isGenerating: boolean;
  error: string | null;
  regenerate: () => void;
}

/**
 * Generates an 8-character school code client-side and confirms/reserves
 * it with the backend (POST /check-school-code). On the rare chance of a
 * collision, it retries with a fresh code instead of surfacing an error.
 */
export function useSchoolCode(): UseSchoolCodeResult {
  const [code, setCode] = useState("");
  const [isGenerating, setIsGenerating] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(() => {
    setIsGenerating(true);
    setError(null);
    setCode("");

    (async () => {
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const candidate = generateSchoolCode();
        try {
          const res = await superAdminService.checkSchoolCode(candidate);
          if (res.available) {
            setCode(res.code);
            setIsGenerating(false);
            return;
          }
          // Collision — loop and try another candidate.
        } catch (err) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Could not generate a school code. Please try again."
          );
          setIsGenerating(false);
          return;
        }
      }
      setError("Could not find an available school code. Please try again.");
      setIsGenerating(false);
    })();
  }, []);

  useEffect(() => {
    generate();
  }, [generate]);

  return { code, isGenerating, error, regenerate: generate };
}
