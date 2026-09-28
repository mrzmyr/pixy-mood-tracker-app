import { useCallback, useMemo, useState } from "react";
import type { StructuredError } from "@/lib/errors";
import { createStructuredError } from "@/lib/errors";
import { isStorageError } from "@/state/persisted";

/** Load status a persisted store exposes to the app. */
export interface StorageLoad {
  /**
   * `error` means stored data exists but could not be read; the store must
   * not persist in that state.
   */
  status: "loading" | "ready" | "error";
  /** Last failed read. Stays set during a retry, until a read succeeds. */
  error: StructuredError | null;
  /** Reads storage again. No-op unless `status` is `error`. */
  retry: () => void;
}

type State = Omit<StorageLoad, "retry">;

/**
 * Load status for one persisted store.
 *
 * Read storage in an effect while `load.status` is `loading`; `retry` moves
 * `error` back to `loading`, so the effect reads again. Call `markReady`
 * after a successful read and `markFailed` when `load()` throws.
 */
export const useStorageLoad = (key: string) => {
  const [state, setState] = useState<State>({ status: "loading", error: null });

  const markReady = useCallback(() => {
    setState({ status: "ready", error: null });
  }, []);

  // `load()` errors already carry `status`, `message`, `why`, and `fix`.
  const markFailed = useCallback(
    (cause: unknown) => {
      const error = isStorageError(cause)
        ? cause
        : createStructuredError({
            status: "storage_load_failed",
            message: "Stored data could not be loaded",
            why: `Loading storage key "${key}" failed: ${String(cause)}`,
            fix: "Close and reopen the app",
          });
      setState({ status: "error", error });
    },
    [key]
  );

  const retry = useCallback(() => {
    setState((current) =>
      current.status === "error" ? { ...current, status: "loading" } : current
    );
  }, []);

  const load: StorageLoad = useMemo(
    () => ({ ...state, retry }),
    [state, retry]
  );

  return { load, markReady, markFailed };
};
