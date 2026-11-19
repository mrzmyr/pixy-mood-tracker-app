import dayjs from "dayjs";
import { useLayoutEffect, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import type { IScale } from "@/constants/colors/scales";
import { DATE_FORMAT } from "@/constants/config";
import type { LogItem } from "@/features/logs";
import { getWeekStart } from "../week";
import { WeekRow } from "./week-day";

const shiftWeek = (weekStart: string, weeks: number) =>
  dayjs(weekStart).add(weeks, "week").format(DATE_FORMAT);

/**
 * Pager of weeks with one mood underline per day. Swipe to the previous or next
 * week, tap a day to select it. Shows the week of `selectedDate`. Renders
 * only the shown week and its neighbours, and recenters after each swipe,
 * so years of history cost the same as one week.
 */
export const WeekStrip = ({
  firstWeekStart,
  ratings,
  scale,
  selectedDate,
  today,
  onSelectDate,
  onWeekChange,
  weekLocale,
}: {
  /** `DATE_FORMAT` start of the oldest week the user can swipe to. */
  firstWeekStart: string;
  /** Average rating per `DATE_FORMAT` date. */
  ratings: Record<string, LogItem["rating"]>;
  scale: IScale;
  selectedDate: string;
  today: string;
  onSelectDate: (date: string) => void;
  /** User swiped to the week that starts on `weekStart`. */
  onWeekChange: (weekStart: string) => void;
  /** From `useWeekLocale`: sets the first weekday. */
  weekLocale: string;
}) => {
  const scrollRef = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const weekStart = getWeekStart(selectedDate, weekLocale);
  const hasPrevious = weekStart > firstWeekStart;
  const hasNext = weekStart < getWeekStart(today, weekLocale);
  const pages = [
    ...(hasPrevious ? [shiftWeek(weekStart, -1)] : []),
    weekStart,
    ...(hasNext ? [shiftWeek(weekStart, 1)] : []),
  ];
  const currentPage = hasPrevious ? 1 : 0;

  const offset = currentPage * width;
  useLayoutEffect(() => {
    scrollRef.current?.scrollTo({ x: offset, animated: false });
  }, [offset]);

  const onMomentumScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const page = Math.round(event.nativeEvent.contentOffset.x / width);
    if (page !== currentPage && pages[page]) {
      onWeekChange(pages[page]);
    }
  };

  return (
    <View
      testID="home-week-strip"
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      {width > 0 && (
        // New key per week: the pages change after a swipe or an outside
        // date change, so the pager remounts at the shown week.
        <ScrollView
          key={weekStart}
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentOffset={{ x: currentPage * width, y: 0 }}
          onMomentumScrollEnd={onMomentumScrollEnd}
        >
          {pages.map((page) => (
            <View key={page} style={{ width }}>
              <WeekRow
                weekStart={page}
                ratings={ratings}
                scale={scale}
                selectedDate={selectedDate}
                today={today}
                onSelectDate={onSelectDate}
              />
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};
