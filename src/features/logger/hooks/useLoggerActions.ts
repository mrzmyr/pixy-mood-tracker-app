import { DATE_FORMAT } from "@/constants/Config";
import { useRouter } from "expo-router";
import dayjs from "dayjs";
import { useEffect, useRef } from "react";
import { useAnalytics } from "@/state/analytics";
import { useLogState, useLogUpdater } from "@/features/logs";
import type { LogItem } from "@/features/logs";
import { useStoreReviewPrompt } from "@/features/review";

import type { LoggerStep } from "@/constants/LoggerSteps";
import type { TemporaryLogState, TemporaryLogValue } from "../temporaryLog";
import type { LoggerMode } from "../Logger";
import { getSavedEntryProperties } from "../analytics";
import { getItemDate } from "@/lib/logDates";

/**
 * Save, remove and cancel handlers for the logger.
 * Every handler closes the logger and resets the temporary log; `save` stores unrated logs as "neutral".
 *
 * `steps`, `initialStep`, and `getRatingChanges` only feed analytics.
 */
export const useLoggerActions = ({
  mode,
  tempLog,
  steps,
  initialStep,
  getRatingChanges,
}: {
  mode: LoggerMode;
  tempLog: TemporaryLogValue;
  steps: LoggerStep[];
  initialStep: LoggerStep | null;
  getRatingChanges: () => number;
}) => {
  const router = useRouter();
  const analytics = useAnalytics();
  const startedAt = useRef(0);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);
  const logState = useLogState();
  const logUpdater = useLogUpdater();
  const requestStoreReviewPrompt = useStoreReviewPrompt();

  const close = () => {
    tempLog.reset();
    router.back();
  };

  const getElapsedMs = () => Date.now() - startedAt.current;

  const save = (data: TemporaryLogState) => {
    analytics.track("logger:log_saved", {
      mode,
      duration_ms: getElapsedMs(),
      has_rating: data.rating !== null,
      message_length: data.message.length,
      tags_count: data.tags.length,
      emotions_count: data.emotions.length,
      ...getSavedEntryProperties({
        data,
        items: logState.items,
        now: new Date(),
      }),
      steps_shown: steps,
      initial_step: initialStep,
      rating_changes: getRatingChanges(),
    });

    if (data.rating === null) {
      data.rating = "neutral";
    }

    if (mode === "edit") {
      // SAFETY: rating is non-null after the fallback above; a null sleep.quality is stored as-is and statistics treat it as missing.
      logUpdater.editLog(data as LogItem);
    } else {
      // SAFETY: rating is non-null after the fallback above; a null sleep.quality is stored as-is and statistics treat it as missing.
      logUpdater.addLog(data as LogItem);
      // `logState` predates this save, so count the new entry.
      requestStoreReviewPrompt(logState.items.length + 1);

      const date = dayjs(data.dateTime).format(DATE_FORMAT);
      const itemsOnDate = logState.items.filter(
        (item) => getItemDate(item) === date
      );

      if (itemsOnDate.length === 1) {
        router.dismissTo("/calendar");
        tempLog.reset();
        return;
      }
    }

    close();
  };

  const remove = () => {
    analytics.track("logger:log_deleted");
    logUpdater.deleteLog(tempLog.data.id);
    close();
  };

  const cancel = ({ step, index }: { step: LoggerStep; index: number }) => {
    analytics.track("logger:flow_cancelled", {
      mode,
      step,
      index,
      steps_count: steps.length,
      duration_ms: getElapsedMs(),
      has_rating: tempLog.data.rating !== null,
    });
    close();
  };

  return { save, remove, cancel, getElapsedMs };
};
