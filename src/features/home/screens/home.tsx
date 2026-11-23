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
import { moveToWeek } from "../week";
import { HOME_LAYOUT } from "../layout";
import { HomeView } from "./home-view";
import type { HomeDay } from "./home-view";

/**
 * Home tab behind flag `day-view`: one week of mood underlines and the
 * entries of the selected day. Starts on today. Swipe the entries for the
 * previous or next day. An entry opens its day.
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

  const itemsByDate = useMemo(() => {
    const result = new Map<string, LogItem[]>();
    for (const item of items) {
      const date = getItemDate(item);
      result.set(date, [...(result.get(date) ?? []), item]);
    }
    return result;
  }, [items]);

  const firstDate = useMemo(() => {
    let first = today;
    for (const date of itemsByDate.keys()) {
      if (date < first) {
        first = date;
      }
    }
    return first;
  }, [itemsByDate, today]);

  const getDay = (date: string): HomeDay => {
    const dayItems = [...(itemsByDate.get(date) ?? [])].sort((a, b) =>
      a.dateTime.localeCompare(b.dateTime)
    );
    return {
      entries: dayItems.map((item) =>
        getEntryPreview(item, { people, tags, showPlace })
      ),
      sleepQuality: getAverageSleepQuality(dayItems),
    };
  };

  return (
    <HomeView
      topInset={topInset}
      bottomInset={insets.bottom}
      today={today}
      selectedDate={selectedDate}
      firstDate={firstDate}
      weekLocale={weekLocale}
      ratings={ratings}
      getDay={getDay}
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
