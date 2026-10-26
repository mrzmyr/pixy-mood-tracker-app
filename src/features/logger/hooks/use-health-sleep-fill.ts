import { useEffect, useEffectEvent, useRef } from "react";
import {
  getHealthSource,
  getSleepFromHealth,
  createHealthError,
  useHealthSleepSetting,
} from "@/features/health";
import type { HealthSleep } from "@/features/health";
import { useLogState } from "@/features/logs";
import { useAnalytics } from "@/state/analytics";
import { useSettings } from "@/state/settings";
import { useLogDraft } from "../log-draft";
import type { LoggerMode } from "../logger";
import { hasSleepOnDate } from "../steps";
import { isStructuredError } from "@/lib/errors";
import { reportError } from "@/lib/report-error";

/** Longest wait for Apple Health before a save goes ahead without sleep. */
const SETTLE_TIMEOUT_MS = 1000;

const timeout = (ms: number) =>
  // oxlint-disable-next-line promise/avoid-new -- setTimeout reports only through its callback, so a Promise adapter is required
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Fills the sleep quality of a new entry from Apple Health in the background
 * while "Auto Fill" is on. The logger then skips the sleep slide. Works like
 * the sleep step: only while the step is on and no entry of the day holds a
 * sleep quality. Moving the time to another day reads that night instead.
 * Never marks the draft dirty. Edits keep the stored quality.
 *
 * `settle()` resolves once the running lookup ends, at most after
 * `SETTLE_TIMEOUT_MS`. Save after it, so a quick save keeps the quality.
 */
export const useHealthSleepFill = ({ mode }: { mode: LoggerMode }) => {
  const { isEnabled } = useHealthSleepSetting();
  const { hasStep } = useSettings();
  const logState = useLogState();
  const analytics = useAnalytics();
  const { draft, prefillSleepQuality, dropPrefilledSleepQuality } =
    useLogDraft();
  const isActive =
    mode === "create" &&
    isEnabled &&
    hasStep("sleep") &&
    !hasSleepOnDate(logState.items, draft.date);
  const lookup = useRef<Promise<void> | null>(null);
  const hasTracked = useRef(false);

  const onSleep = useEffectEvent((sleep: HealthSleep | null) => {
    if (sleep === null) {
      return;
    }
    prefillSleepQuality(sleep.score.quality);
    if (hasTracked.current) {
      return;
    }
    hasTracked.current = true;
    analytics.track("logger:health_sleep_filled");
  });

  // The quality belongs to the night before the previous date.
  const onNight = useEffectEvent(() => dropPrefilledSleepQuality());

  useEffect(() => {
    onNight();
    if (!isActive) {
      return;
    }
    let isCurrent = true;
    lookup.current = (async () => {
      try {
        const sleep = await getSleepFromHealth(getHealthSource(), draft.date);
        if (isCurrent) {
          onSleep(sleep);
        }
      } catch (error) {
        // The entry still saves; sleep stays empty.
        reportError(
          isStructuredError(error)
            ? error
            : createHealthError(
                "sleep read",
                error instanceof Error ? error.message : String(error)
              )
        );
      }
    })();
    return () => {
      isCurrent = false;
    };
  }, [isActive, draft.date]);

  const settle = async () => {
    if (lookup.current !== null) {
      await Promise.race([lookup.current, timeout(SETTLE_TIMEOUT_MS)]);
    }
  };

  return { settle };
};

/**
 * Wraps the logger's `save`: waits for `useHealthSleepFill` first, so a
 * quick save keeps the Apple Health quality. Ignores calls while waiting.
 */
export const useSaveAfterSleepFill = ({
  mode,
  save,
}: {
  mode: LoggerMode;
  save: () => void;
}) => {
  const { settle } = useHealthSleepFill({ mode });
  const isSaving = useRef(false);

  return async () => {
    if (isSaving.current) {
      return;
    }
    isSaving.current = true;
    await settle();
    save();
  };
};
