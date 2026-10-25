import { useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import type { LoggerStep } from "@/constants/logger-steps";
import { LoggerEdit } from "../../logger";
import { getRestoredDraft } from "../../recovery/restored-draft";

/**
 * Route wrapper that opens the logger for an existing entry, optionally at
 * a given step. Optional `restore` param: continue the recovery snapshot
 * of this entry.
 */
export const LogEdit = () => {
  const { id, step, restore } = useLocalSearchParams<{
    id: string;
    step?: LoggerStep;
    restore?: string;
  }>();
  // Read once: the handoff clears when this logger closes.
  const restored = useMemo(() => getRestoredDraft(restore), [restore]);
  return (
    <LoggerEdit id={id} initialStep={step} restoredDraft={restored?.draft} />
  );
};
