import { useCallback, useState } from "react";
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
  /** Set only when `status` is `error`. */
  error: StructuredError | null;
}

/**
 * Load status for one persisted store. Call `markReady` after a successful
 * read and `markFailed` when `load()` throws.
 */
export const useStorageLoad = (key: string) => {
  const [load, setLoad] = useState<StorageLoad>({
    status: "loading",
    error: null,
  });

  const markReady = useCallback(() => {
    setLoad({ status: "ready", error: null });
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
      setLoad({ status: "error", error });
    },
    [key]
  );

  return { load, markReady, markFailed };
};
