import { useEffect, useEffectEvent } from "react";
import { AppState } from "react-native";
import type { LoggerStep } from "@/constants/logger-steps";
import {
  clearLoggerRecovery,
  saveLoggerRecovery,
} from "@/state/logger-recovery";
import { useLogDraft } from "../log-draft";
import type { LoggerMode } from "../logger";
import { clearRestoredDraft } from "./restored-draft";

/**
 * Writes a recovery snapshot of a dirty draft when the app goes to the
 * background, and removes it when the app comes back or the logger closes.
 * A snapshot survives only when the OS kills the app in the background.
 * Must render inside `LogDraftProvider`.
 */
export const useRecoverySnapshot = ({
  mode,
  step,
}: {
  mode: LoggerMode;
  /** Slide on screen. */
  step: LoggerStep | undefined;
}) => {
  const logDraft = useLogDraft();

  // Effect event: reads the latest draft and slide without re-subscribing.
  const saveSnapshot = useEffectEvent(() => {
    if (!logDraft.isDirty) {
      return;
    }
    void saveLoggerRecovery({
      version: 1,
      mode,
      step: step ?? "rating",
      savedAt: new Date().toISOString(),
      draft: logDraft.getLatestDraft(),
    });
  });

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "background") {
        saveSnapshot();
      } else if (state === "active") {
        void clearLoggerRecovery();
      }
    });
    return () => {
      subscription.remove();
      clearRestoredDraft();
      void clearLoggerRecovery();
    };
  }, []);
};
