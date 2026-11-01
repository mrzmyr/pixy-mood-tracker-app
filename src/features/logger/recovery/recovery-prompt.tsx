import dayjs from "dayjs";
import { useRouter } from "expo-router";
import { useEffect, useEffectEvent, useRef } from "react";
import Alert from "@/lib/alert";
import { createStructuredError, isStructuredError } from "@/lib/errors";
import { reportError } from "@/lib/report-error";
import { t } from "@/lib/translation";
import { useAppLock } from "@/features/applock";
import { useLogLoad, useLogState, useLogUpdater } from "@/features/logs";
import { useAnalytics } from "@/state/analytics";
import { useSettingsLoad } from "@/state/settings";
import {
  clearLoggerRecovery,
  loadLoggerRecovery,
} from "@/state/logger-recovery";
import type { LoggerRecovery } from "@/state/logger-recovery";
import { setRestoredDraft } from "./restored-draft";

const getAnalyticsProperties = (recovery: LoggerRecovery) => ({
  mode: recovery.mode,
  age_minutes: Math.max(0, dayjs().diff(recovery.savedAt, "minute")),
  message_length: recovery.draft.message.length,
  photos_count: recovery.draft.photos.length,
});

// A create snapshot whose entry got stored, or an edit snapshot whose entry
// is gone, has nothing left to continue.
const isRestorable = (recovery: LoggerRecovery, entryIds: Set<string>) =>
  recovery.mode === "edit"
    ? entryIds.has(recovery.draft.id)
    : !entryIds.has(recovery.draft.id);

/**
 * Asks once per launch to continue the entry of a logger the OS killed in
 * the background (see `useRecoverySnapshot`). Waits for stored entries and
 * the app lock.
 * Render once, inside the storage load gate.
 */
export const LoggerRecoveryPrompt = () => {
  const router = useRouter();
  const analytics = useAnalytics();
  const { isLocked } = useAppLock();
  const logLoad = useLogLoad();
  // The app lock reads its setting: `isLocked` is false until it loads.
  const settingsLoad = useSettingsLoad();
  const { items } = useLogState();
  const logUpdater = useLogUpdater();
  const hasChecked = useRef(false);

  const open = (recovery: LoggerRecovery) => {
    setRestoredDraft(recovery);
    const params = { restore: recovery.draft.id, step: recovery.step };
    if (recovery.mode === "edit") {
      router.push({
        pathname: "/logs/[id]/edit",
        params: { id: recovery.draft.id, ...params },
      });
      return;
    }
    router.push({
      pathname: "/logs/create/[dateTime]",
      params: { dateTime: recovery.draft.dateTime, ...params },
    });
  };

  // Photos of the discarded draft become unreferenced once the snapshot goes.
  const discard = async () => {
    await clearLoggerRecovery();
    logUpdater.sweepPhotos();
  };

  // Effect event: reads the latest entries without re-running the check.
  const offer = useEffectEvent(async () => {
    let recovery: LoggerRecovery | null;
    try {
      recovery = await loadLoggerRecovery();
    } catch (error) {
      // Keep the stored snapshot: never write after a failed read.
      const failure = isStructuredError(error)
        ? error
        : createStructuredError({
            status: "logger_recovery_load_failed",
            message: "Logger recovery snapshot could not be read",
            why: `loadLoggerRecovery failed: ${error instanceof Error ? error.message : String(error)}`,
            fix: "No action needed; the app skips the resume prompt",
          });
      console.error(failure);
      reportError(failure);
      return;
    }
    if (recovery === null) {
      return;
    }
    if (!isRestorable(recovery, new Set(items.map((item) => item.id)))) {
      await clearLoggerRecovery();
      return;
    }
    const restorable = recovery;
    Alert.alert(
      t("logger_recovery_title"),
      t("logger_recovery_message", {
        date: dayjs(restorable.draft.dateTime).format("llll"),
      }),
      [
        {
          text: t("logger_recovery_discard"),
          style: "destructive",
          onPress: () => {
            analytics.track(
              "logger:recovery_discarded",
              getAnalyticsProperties(restorable)
            );
            void discard();
          },
        },
        {
          text: t("logger_recovery_continue"),
          style: "default",
          onPress: () => {
            analytics.track(
              "logger:recovery_restored",
              getAnalyticsProperties(restorable)
            );
            void clearLoggerRecovery();
            open(restorable);
          },
        },
      ],
      { cancelable: false }
    );
  });

  const isReady =
    logLoad.status === "ready" && settingsLoad.status === "ready" && !isLocked;

  useEffect(() => {
    if (!isReady || hasChecked.current) {
      return;
    }
    hasChecked.current = true;
    void offer();
  }, [isReady]);

  return null;
};
