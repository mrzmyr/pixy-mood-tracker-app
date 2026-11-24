import dayjs from "dayjs";
import { useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { DATE_FORMAT } from "@/constants/config";

const shiftDay = (date: string, days: number) =>
  dayjs(date).add(days, "day").format(DATE_FORMAT);

/**
 * Pager of days. Swipe left for the next day, right for the previous one.
 * Never pages before `firstDate` or after `today`. Renders only the shown
 * day and its neighbours, and recenters after each swipe, like
 * `WeekStrip`.
 */
export const DayPager = ({
  selectedDate,
  firstDate,
  today,
  onDayChange,
  renderDay,
}: {
  selectedDate: string;
  /** `DATE_FORMAT` oldest day the user can swipe to. */
  firstDate: string;
  today: string;
  /** User swiped to `date`. */
  onDayChange: (date: string) => void;
  renderDay: (date: string) => ReactNode;
}) => {
  const scrollRef = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const hasPrevious = selectedDate > firstDate;
  const hasNext = selectedDate < today;
  const pages = [
    ...(hasPrevious ? [shiftDay(selectedDate, -1)] : []),
    selectedDate,
    ...(hasNext ? [shiftDay(selectedDate, 1)] : []),
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
      onDayChange(pages[page]);
    }
  };

  return (
    <View
      testID="home-day-pager"
      style={{ flex: 1 }}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      {width > 0 && (
        // New key per day: the pages change after a swipe or a tap in the
        // week strip, so the pager remounts at the shown day.
        <ScrollView
          key={selectedDate}
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentOffset={{ x: currentPage * width, y: 0 }}
          onMomentumScrollEnd={onMomentumScrollEnd}
        >
          {pages.map((page) => (
            <View key={page} testID={`home-day-${page}`} style={{ width }}>
              {renderDay(page)}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};
