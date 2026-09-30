import { useCallback, useEffect, useState } from "react";
import { teacherService } from "../services/teacher.service";
import { schoolSettingService } from "../services/schoolSetting.service";
import { ApiError } from "../types/api.types";
import type { SchClass } from "../types/superadmin.types";
import type { SubjectItem } from "../types/subject.types";
import type { Teacher } from "../types/teacher.types";

function messageOf(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

/*
 * All hooks below only set state inside promise callbacks (never synchronously
 * in an effect), and start with isLoading = true. The teacher pages render them
 * with a key of school + session, so a change remounts and refetches.
 */

/** Teachers of the selected school + session. */
export function useTeachers(schId: string, sessionId: string) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeachers = useCallback(
    () =>
      teacherService
        .getTeachers(schId, sessionId)
        .then((res) => {
          setTeachers(res.data ?? []);
          setError(null);
        })
        .catch((err) => setError(messageOf(err, "Could not load teachers.")))
        .finally(() => setIsLoading(false)),
    [schId, sessionId]
  );

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const reload = useCallback(() => {
    setIsLoading(true);
    return fetchTeachers();
  }, [fetchTeachers]);

  return { teachers, isLoading, error, reload };
}

/** Classes (with their sections) set up for the selected school. */
export function useSchoolClasses(schId: string) {
  const [schClasses, setSchClasses] = useState<SchClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    schoolSettingService
      .getSchClasses(schId)
      .then((res) => {
        if (!cancelled) setSchClasses(res.schClasses ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(messageOf(err, "Could not load classes."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [schId]);

  return { schClasses, isLoading, error };
}

/** Subjects of the selected school + session, plus the `_id` of the document that holds them. */
export function useSchoolSubjects(schId: string, sessionId: string) {
  const [subjectDocId, setSubjectDocId] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    schoolSettingService
      .getSubjects(schId, sessionId)
      .then((res) => {
        if (cancelled) return;
        const docs = res.data ?? [];
        setSubjectDocId(docs[0]?._id ?? null);
        setSubjects(docs.flatMap((doc) => doc.subjects ?? []));
      })
      .catch((err) => {
        if (!cancelled) setError(messageOf(err, "Could not load subjects."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [schId, sessionId]);

  return { subjectDocId, subjects, isLoading, error };
}
