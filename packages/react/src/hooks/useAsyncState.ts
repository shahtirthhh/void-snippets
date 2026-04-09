import { useCallback, useMemo, useState } from "react";
import { catchError } from "@void-snippets/core";

export type VSAsyncStatus = "idle" | "pending" | "success" | "error";

interface VSAsyncState<T> {
  data: T | null;
  status: VSAsyncStatus;
  error: Error | null;
}

export interface VSUseAsyncStateReturn<T> extends VSAsyncState<T> {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;

  setData: (data: T | null) => void;
  setError: (error: Error | null) => void;
  reset: () => void;

  /**
   * Executes an async function, updates state, and returns a [err, data] tuple.
   * Allows immediate result handling without try/catch.
   *
   * @example
   * const [err, data] = await execute(() => ContactsApis.create(payload));
   * if (err) return showAlert(err.message, 'error');
   * showAlert('Created!', 'success');
   */
  execute: (
    asyncFn: () => Promise<T>,
    options?: {
      onSuccess?: (data: T) => void;
      onError?: (error: Error) => void;
    }
  ) => Promise<[Error, null] | [null, T]>;
}

/**
 * Generic async state machine — tracks data, status, and error for any async operation.
 * Pair with any async function: API calls, file reads, timers, etc.
 *
 * @param initialData - Optional initial data value. Default: null
 *
 * @example
 * const { data, isLoading, isError, execute } = useAsyncState<User>();
 *
 * const handleSubmit = async () => {
 *   const [err, user] = await execute(() => fetchUser(id));
 *   if (err) return;
 *   console.log(user.name);
 * };
 */
export function useAsyncState<T>(
  initialData: T | null = null
): VSUseAsyncStateReturn<T> {
  const [state, setState] = useState<VSAsyncState<T>>({
    data: initialData,
    status: "idle",
    error: null,
  });

  const setData = useCallback((data: T | null) => {
    setState({ data, status: "success", error: null });
  }, []);

  const setError = useCallback((error: Error | null) => {
    setState((prev) => ({ ...prev, error, status: "error" }));
  }, []);

  const reset = useCallback(() => {
    setState({ data: initialData, status: "idle", error: null });
  }, [initialData]);

  const execute = useCallback(
    async (
      asyncFn: () => Promise<T>,
      options?: {
        onSuccess?: (data: T) => void;
        onError?: (error: Error) => void;
      }
    ): Promise<[Error, null] | [null, T]> => {
      setState((prev) => ({ ...prev, status: "pending", error: null }));

      const [err, res] = await catchError(asyncFn());

      if (err) {
        setState((prev) => ({ ...prev, status: "error", error: err }));
        options?.onError?.(err);
        return [err, null];
      }

      setState({ data: res as T, status: "success", error: null });
      options?.onSuccess?.(res as T);
      return [null, res as T];
    },
    []
  );

  const flags = useMemo(
    () => ({
      isLoading: state.status === "pending",
      isSuccess: state.status === "success",
      isError: state.status === "error",
    }),
    [state.status]
  );

  return { ...state, ...flags, setData, setError, reset, execute };
}
