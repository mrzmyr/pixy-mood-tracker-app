import dayjs from "dayjs";
import { useRouter } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useEffect, useMemo, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getAverageSleepQuality,
  getLogDays,
  useLogState,
} from "@/features/logs";
import type { LogItem } from "@/features/logs";
import { useLocationSetting } from "@/features/location";
import { usePeopleState } from "@/features/people";
import { useTagsState } from "@/features/tags";
import useColors from "@/hooks/use-colors";
import { useToday } from "@/hooks/use-today";
import { useWeekLocale } from "@/hooks/use-week-locale";
import { getItemDate } from "@/lib/log-dates";
import { useSetting } from "@/state/settings";
import { markHomeOpened } from "../home-session";
import { getEntryPreview } from "../entry-preview-data";
import { getWeekStart, moveToWeek } from "../week";
import { HOME_LAYOUT } from "../layout";
import { HomeView } from "./home-view";

/**
 * Home tab behind flag `home-week`: one week of mood underlines and the
 * entries of the selected day. Starts on today. An entry opens its day.
 */
export const HomeScreen = () => {
  const router = useRouter();
  const colors = useColors();
  const today = useToday();
  const weekLocale = useWeekLocale();
  const [selectedDate, setSelectedDate] = useState(today);
  const { items } = useLogState();
  const { people } = usePeopleState();
  const { tags } = useTagsState();
  const { isAvailable: showPlace } = useLocationSetting();
  const scale = colors.scales[useSetting("scaleType")];
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  // Date centered on the transparent bar's buttons, never under the status bar.
  const topInset =
    insets.top +
    Math.max(0, (headerHeight - insets.top - HOME_LAYOUT.headerHeight) / 2);

  useEffect(markHomeOpened, []);

  const ratings = useMemo(() => {
    const result: Record<string, LogItem["rating"]> = {};
    for (const day of getLogDays(items)) {
      result[day.date] = day.ratingAvg;
    }
    return result;
  }, [items]);

  const firstWeekStart = useMemo(() => {
    let first = today;
    for (const item of items) {
      const date = getItemDate(item);
      if (date < first) {
        first = date;
      }
    }
    return getWeekStart(first, weekLocale);
  }, [items, today, weekLocale]);

  const dayItems = useMemo(
    () =>
      [...items]
        .filter((item) => getItemDate(item) === selectedDate)
        .sort((a, b) => a.dateTime.localeCompare(b.dateTime)),
    [items, selectedDate]
  );
  const entries = useMemo(
    () =>
      dayItems.map((item) =>
        getEntryPreview(item, { people, tags, showPlace })
      ),
    [dayItems, people, tags, showPlace]
  );

  return (
    <HomeView
      topInset={topInset}
      bottomInset={insets.bottom}
      today={today}
      selectedDate={selectedDate}
      firstWeekStart={firstWeekStart}
      weekLocale={weekLocale}
      ratings={ratings}
      entries={entries}
      sleepQuality={getAverageSleepQuality(dayItems)}
      scale={scale}
      onSelectDate={setSelectedDate}
      onWeekChange={(weekStart) =>
        setSelectedDate((date) =>
          moveToWeek(date, weekStart, today, weekLocale)
        )
      }
      onPressEntry={(entry) =>
        router.push({ pathname: "/days/[date]", params: { date: entry.date } })
      }
      onAdd={() =>
        router.push({
          pathname: "/logs/create/[dateTime]",
          params: {
            dateTime:
              selectedDate === today
                ? dayjs().toISOString()
                : dayjs(selectedDate).hour(12).toISOString(),
          },
        })
      }
    />
  );
};
