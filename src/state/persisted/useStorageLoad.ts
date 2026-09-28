import { useCallback, useMemo, useState } from "react";
import type { StructuredError } from "@/lib/errors";
import { createStructuredError } from "@/lib/errors";

/**
 * Load progress of a persisted store. `error` means stored data exists but
 * could not be read; the store must not persist in that state.
 */
export type StorageLoadStatus = "loading" | "ready" | "error";

/** Load status a persisted store exposes to the app. */
export interface StorageLoad {
  status: StorageLoadStatus;
  /** Set only when `status` is `error`. */
  error: StructuredError | null;
  /** Reads storage again. No-op unless `status` is `error`. */
  retry: () => void;
}

interface State {
  status: StorageLoadStatus;
  error: StructuredError | null;
}

const INITIAL_STATE: State = { status: "loading", error: null };

const isStructuredError = (error: unknown): error is StructuredError =>
  error instanceof Error &&
  "status" in error &&
  "why" in error &&
  "fix" in error;

/**
 * Keeps `load()` errors as they are (they already carry `status`, `message`,
 * `why`, and `fix`) and wraps anything else.
 */
export const toStorageLoadError = (
  cause: unknown,
  key: string
): StructuredError =>
  isStructuredError(cause)
    ? cause
    : createStructuredError({
        status: "storage_load_failed",
        message: "Stored data could not be loaded",
        why: `Loading storage key "${key}" failed: ${
          cause instanceof Error ? cause.message : String(cause)
        }`,
        fix: "Close and reopen the app",
      });

/**
 * Load status for one persisted store.
 *
 * Read storage in an effect while `load.status` is `loading`; `retry` moves
 * `error` back to `loading`, so the effect reads again. Call `markReady`
 * after a successful read and `markFailed` when `load()` throws.
 */
export const useStorageLoad = (key: string) => {
  const [state, setState] = useState<State>(INITIAL_STATE);

  const markReady = useCallback(() => {
    setState({ status: "ready", error: null });
  }, []);

  const markFailed = useCallback(
    (cause: unknown) => {
      setState({ status: "error", error: toStorageLoadError(cause, key) });
    },
    [key]
  );

  const retry = useCallback(() => {
    setState((current) =>
      current.status === "error" ? { status: "loading", error: null } : current
    );
  }, []);

  const load: StorageLoad = useMemo(
    () => ({ status: state.status, error: state.error, retry }),
    [state.status, state.error, retry]
  );

  return { load, markReady, markFailed };
};
