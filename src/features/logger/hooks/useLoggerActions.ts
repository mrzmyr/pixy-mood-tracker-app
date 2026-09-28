import { DATE_FORMAT } from "@/constants/Config";
import { useNavigation, StackActions } from "@react-navigation/native";
import dayjs from "dayjs";
import { useRef } from "react";
import { useAnalytics } from "@/state/analytics";
import type { LogItem } from "@/features/logs";
import { useLogState, useLogUpdater } from "@/features/logs";
import type {
  TemporaryLogState,
  TemporaryLogValue,
} from "@/features/logger/temporaryLog";
import type { LoggerMode } from "@/features/logger";
import { getItemDate } from "@/lib/logDates";

/**
 * Save, remove and cancel handlers for the logger.
 * Every handler closes the logger and resets the temporary log; `save` stores unrated logs as "neutral".
 * `save` and `remove` close only after the write succeeds; on failure the logger stays open.
 */
export const useLoggerActions = ({
  mode,
  tempLog,
}: {
  mode: LoggerMode;
  tempLog: TemporaryLogValue;
}) => {
  const navigation = useNavigation();
  const analytics = useAnalytics();
  const logState = useLogState();
  const logUpdater = useLogUpdater();

  const close = () => {
    tempLog.reset();
    navigation.goBack();
  };

  // Blocks a second save or delete while one is still writing, so a double
  // tap cannot add the same entry twice.
  const busy = useRef(false);

  const runExclusive = async (action: () => Promise<void>) => {
    if (busy.current) {
      return;
    }
    busy.current = true;
    try {
      await action();
    } catch (error) {
      busy.current = false;
      throw error;
    }
    busy.current = false;
  };

  const save = (data: TemporaryLogState) =>
    runExclusive(async () => {
      const eventData = {
        date: data?.date,
        dateTime: data?.dateTime,
        messageLength: data?.message.length,
        rating: data?.rating,
        tagsCount: data?.tags.length,
        emotions: data?.emotions,
        emotionsCount: data?.emotions.length,
      };

      // SAFETY: rating is non-null after the fallback; a null sleep.quality is stored as-is and statistics treat it as missing.
      const logItem = { ...data, rating: data.rating ?? "neutral" } as LogItem;
      const saved =
        mode === "edit"
          ? await logUpdater.editLog(logItem)
          : await logUpdater.addLog(logItem);

      // The updater already alerted. Keep the logger open so the entry is
      // not lost.
      if (!saved) {
        return;
      }

      if (data.rating === null) {
        analytics.track("log_saved_without_rating", eventData);
      }

      analytics.track("log_saved", eventData);

      if (mode === "edit") {
        analytics.track("log_changed", eventData);
        close();
        return;
      }

      analytics.track("log_created", eventData);

      const date = dayjs(data.dateTime).format(DATE_FORMAT);
      const itemsOnDate = logState.items.filter(
        (item) => getItemDate(item) === date
      );

      if (itemsOnDate.length === 1) {
        navigation.dispatch(StackActions.popToTop());
        tempLog.reset();
        return;
      }

      close();
    });

  const remove = () =>
    runExclusive(async () => {
      // On failure the updater already alerted; keep the logger open.
      if (!(await logUpdater.deleteLog(tempLog.data.id))) {
        return;
      }
      analytics.track("log_deleted");
      close();
    });

  const cancel = () => {
    analytics.track("log_cancled");
    close();
  };

  return { save, remove, cancel };
};
