import dayjs from "dayjs";
import React, { memo, useMemo, useRef } from "react";
import type { LayoutChangeEvent } from "react-native";
import { useLogState } from "../../hooks/useLogs";
import CalendarMonth from "./CalendarMonth";

import { DATE_FORMAT } from "@/constants/Config";

const getMonths = (start: dayjs.Dayjs, count: number) =>
  Array.from({ length: count }, (_, index) => start.add(index, 'month').format(DATE_FORMAT));

const Calendar = memo(({ monthCount, onCalendarHeightChange }: {
  monthCount: number;
  onCalendarHeightChange: (height: number) => void;
}) => {
  const logState = useLogState()
  const firstMonthY = useRef(0);
  const monthDates = useMemo(() => getMonths(
    dayjs().subtract(monthCount - 1, 'month').startOf('month'),
    monthCount,
  ), [monthCount]);

  const itemMap = {}

  for (const item of logState.items) {
    const date = dayjs(item.dateTime).format(DATE_FORMAT)

    if (!itemMap[date]) {
      itemMap[date] = []
    }

    itemMap[date].push(item)
  }

  // Native maintainVisibleContentPosition tracks direct child frames when prepending history.
  // See https://reactnative.dev/docs/scrollview#maintainvisiblecontentposition.
  return monthDates.map((date, index) => {
    const onLayout = (event: LayoutChangeEvent) => {
      const { y, height } = event.nativeEvent.layout;
      if (index === 0) {
        firstMonthY.current = y;
      }
      if (index === monthDates.length - 1) {
        onCalendarHeightChange(y + height - firstMonthY.current);
      }
    };

    return (
        <CalendarMonth
          key={date}
          dateString={date}
          itemMap={itemMap}
          onLayout={onLayout}
        />
      );
  });
})

Calendar.displayName = "Calendar";

export default Calendar
