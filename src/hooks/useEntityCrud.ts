import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../types/api.types";

interface UseEntityCrudOptions<T, TCreate> {
  fetchList: () => Promise<T[]>;
  create: (payload: TCreate) => Promise<T>;
}

interface UseEntityCrudResult<T, TCreate> {
  items: T[];
  isLoading: boolean;
  loadError: string | null;
  isCreating: boolean;
  createError: string | null;
  /** Returns true on success so the caller can reset its form. */
  createEntity: (payload: TCreate) => Promise<boolean>;
  refresh: () => void;
}

/**
 * Shared data layer for simple "create one, list many" screens
 * (Board, Institute Type, State, City, Class, Section, ...).
 * Keeps loading/error/submitting state handling in one place instead
 * of repeating it on every Essential Setting page.
 */
export function useEntityCrud<T, TCreate>({
  fetchList,
  create,
}: UseEntityCrudOptions<T, TCreate>): UseEntityCrudResult<T, TCreate> {
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setIsLoading(true);
    setLoadError(null);
    fetchList()
      .then(setItems)
      .catch((err) => {
        setLoadError(
          err instanceof ApiError ? err.message : "Could not load data."
        );
      })
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createEntity = useCallback(
    async (payload: TCreate): Promise<boolean> => {
      setIsCreating(true);
      setCreateError(null);
      try {
        await create(payload);
        refresh();
        return true;
      } catch (err) {
        setCreateError(
          err instanceof ApiError
            ? err.message
            : "Could not save. Please try again."
        );
        return false;
      } finally {
        setIsCreating(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return { items, isLoading, loadError, isCreating, createError, createEntity, refresh };
}
