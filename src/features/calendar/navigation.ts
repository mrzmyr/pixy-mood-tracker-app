import { useNavigation } from "@react-navigation/native";
import { useLogState } from "@/features/logs";
import dayjs from "dayjs";
import { getItemDate } from "@/lib/logDates";
import { useAnalytics } from "@/state/analytics";

/**
 * Open a calendar day: the day's entry list, or the create screen at the
 * current time of day when the day has no entries.
 */
export const useCalendarNavigation = () => {
  const navigation = useNavigation();
  const logsState = useLogState();
  const analytics = useAnalytics();

  const openDay = ({
    date,
    source,
  }: {
    date: string;
    source: "calendar" | "mood_peaks" | "tag_peaks";
  }) => {
    const items = logsState.items.filter((log) => getItemDate(log) === date);

    analytics.track("calendar:day_opened", {
      source,
      entries_count: items.length,
      days_ago: dayjs().startOf("day").diff(dayjs(date), "day"),
    });

    if (items.length === 0) {
      navigation.navigate("LogCreate", {
        dateTime: dayjs(date)
          .hour(dayjs().hour())
          .minute(dayjs().minute())
          .toISOString(),
      });
      return;
    }

    navigation.navigate("LogList", { date });
  };

  return {
    openDay,
  };
};
