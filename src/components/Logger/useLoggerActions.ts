import { useNavigation, StackActions } from "@react-navigation/native";
import dayjs from "dayjs";
import { useAnalytics } from "@/hooks/useAnalytics";
import type { LogItem } from "@/hooks/useLogs";
import { useLogState, useLogUpdater } from "@/hooks/useLogs";
import type {
  TemporaryLogState,
  TemporaryLogValue,
} from "@/hooks/useTemporaryLog";
import type { LoggerMode } from ".";

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
  const navigation = useNavigation();
  const analytics = useAnalytics();
  const logState = useLogState();
  const logUpdater = useLogUpdater();

  const close = () => {
    tempLog.reset();
    navigation.goBack();
  };

  const save = (data: TemporaryLogState) => {
    const eventData = {
      date: data?.date,
      dateTime: data?.dateTime,
      messageLength: data?.message.length,
      rating: data?.rating,
      tagsCount: data?.tags.length,
      emotions: data?.emotions,
      emotionsCount: data?.emotions.length,
    };

    if (data.rating === null) {
      analytics.track("log_saved_without_rating", eventData);
      data.rating = "neutral";
    }

    analytics.track("log_saved", eventData);

    if (mode === "edit") {
      analytics.track("log_changed", eventData);
      // SAFETY: rating is non-null after the fallback above; a null sleep.quality is stored as-is and statistics treat it as missing.
      logUpdater.editLog(data as LogItem);
    } else {
      analytics.track("log_created", eventData);
      // SAFETY: rating is non-null after the fallback above; a null sleep.quality is stored as-is and statistics treat it as missing.
      logUpdater.addLog(data as LogItem);

      const itemsOnDate = logState.items.filter((item) =>
        dayjs(item.dateTime).isSame(dayjs(data.dateTime), "day")
      );

      if (itemsOnDate.length === 1) {
        navigation.dispatch(StackActions.popToTop());
        tempLog.reset();
        return;
      }
    }

    close();
  };

  const remove = () => {
    analytics.track("log_deleted");
    logUpdater.deleteLog(tempLog.data.id);
    close();
  };

  const cancel = () => {
    analytics.track("log_cancled");
    close();
  };

  return { save, remove, cancel };
};
