import { useEffect, useRef } from "react";
import { useAppData } from "@/features/datagate";
import { logObserveEvent } from "@/lib/observe";
import type { ObserveEvents } from "@/lib/observe";
import type { Load } from "@/state/persisted/createPersistedStore";

/** JS bundle evaluation, before any store starts to load. */
const bundleLoadedAt = performance.now();

/** Event for a settled load. `null` while stores still load. */
export const getStorageLoadEvent = (
  load: Load,
  durationMs: number
): {
  attributes: ObserveEvents["storage.load"];
  severity: "info" | "error";
} | null => {
  const duration_ms = Math.round(durationMs);
  if (load.status === "loading") {
    return null;
  }
  if (load.status === "error") {
    return {
      attributes: {
        outcome: "error",
        duration_ms,
        error_status: load.error.status,
      },
      severity: "error",
    };
  }
  return { attributes: { outcome: "ready", duration_ms }, severity: "info" };
};

/**
 * Logs `storage.load` once, when the gated stores settle: how long the load
 * took and whether it failed. Call once in the root shell.
 */
export const useStorageLoadEvent = () => {
  const { load } = useAppData();
  const hasLogged = useRef(false);

  useEffect(() => {
    const event = getStorageLoadEvent(load, performance.now() - bundleLoadedAt);
    if (!event || hasLogged.current) {
      return;
    }
    hasLogged.current = true;
    logObserveEvent("storage.load", event.attributes, event.severity);
  }, [load]);
};
