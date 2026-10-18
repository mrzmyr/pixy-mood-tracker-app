import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { useLogState } from "@/features/logs";
import dayjs from "dayjs";
import { getItemDate } from "@/lib/log-dates";
import { useAnalytics } from "@/state/analytics";

/**
 * Open a calendar day: the day's entry list, or the create screen at the
 * current time of day when the day has no entries. With `entryId` the list
 * opens scrolled to that entry.
 *
 * `openDay` keeps its identity across log changes, so memoized calendar
 * cells and timeline rows that receive it do not re-render on every save.
 */
export const useCalendarNavigation = () => {
  const router = useRouter();
  const logsState = useLogState();
  const analytics = useAnalytics();

  // Read at tap time through a ref: the logs only matter when a day opens.
  const itemsRef = useRef(logsState.items);
  useEffect(() => {
    itemsRef.current = logsState.items;
  }, [logsState.items]);

  const openDay = useCallback(
    ({
      date,
      entryId,
      source,
    }: {
      date: string;
      entryId?: string;
      source: "calendar" | "timeline" | "map" | "mood_peaks" | "tag_peaks";
    }) => {
      const items = itemsRef.current.filter((log) => getItemDate(log) === date);

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
    },
    [analytics, router]
  );

  return {
    openDay,
  };
};
