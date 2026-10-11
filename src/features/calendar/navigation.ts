import { useRouter } from "expo-router";
import { useLogState } from "@/features/logs";
import dayjs from "dayjs";
import { getItemDate } from "@/lib/logDates";
import { useAnalytics } from "@/state/analytics";

/**
 * Open a calendar day: the day's entry list, or the create screen at the
 * current time of day when the day has no entries. With `entryId` the list
 * opens scrolled to that entry.
 */
export const useCalendarNavigation = () => {
  const router = useRouter();
  const logsState = useLogState();
  const analytics = useAnalytics();

  const openDay = ({
    date,
    entryId,
    source,
  }: {
    date: string;
    entryId?: string;
    source: "calendar" | "timeline" | "map" | "mood_peaks" | "tag_peaks";
  }) => {
    const items = logsState.items.filter((log) => getItemDate(log) === date);

    analytics.track("calendar:day_opened", {
      source,
      entries_count: items.length,
      days_ago: dayjs().startOf("day").diff(dayjs(date), "day"),
    });

    if (items.length === 0) {
      router.push({
        pathname: "/logs/create/[dateTime]",
        params: {
          dateTime: dayjs(date)
            .hour(dayjs().hour())
            .minute(dayjs().minute())
            .toISOString(),
        },
      });
      return;
    }

    router.push({
      pathname: "/days/[date]",
      params: entryId ? { date, entry: entryId } : { date },
    });
  };

  return {
    openDay,
  };
};
