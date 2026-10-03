import { DATE_FORMAT } from "@/constants/Config";
import { useRouter } from "expo-router";
import dayjs from "dayjs";
import { useEffect, useRef } from "react";
import { useAnalytics } from "@/state/analytics";
import { useLogState, useLogUpdater } from "@/features/logs";
import type { LogItem } from "@/features/logs";
import { useStoreReviewPrompt } from "@/features/review";

import type { TemporaryLogState, TemporaryLogValue } from "../temporaryLog";
import type { LoggerMode } from "../Logger";
import { getItemDate } from "@/lib/logDates";

/**
 * Save, remove and cancel handlers for the logger.
 * Every handler closes the logger and resets the temporary log; `save` stores unrated logs as "neutral".
 */
export const useLoggerActions = ({
  mode,
  tempLog,
}: {
  mode: LoggerMode;
  tempLog: TemporaryLogValue;
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

  const save = (data: TemporaryLogState) => {
    analytics.track("logger:log_saved", {
      mode,
      duration_ms: Date.now() - startedAt.current,
      has_rating: data.rating !== null,
      message_length: data.message.length,
      tags_count: data.tags.length,
      emotions_count: data.emotions.length,
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

  const cancel = () => {
    analytics.track("logger:flow_cancelled", { mode });
    close();
  };

  return { save, remove, cancel };
};
