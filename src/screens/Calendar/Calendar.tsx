import dayjs from "dayjs";
import React, { memo, useCallback, useMemo, useRef } from "react";
import type { LayoutChangeEvent } from "react-native";
import { useLogState } from "../../hooks/useLogs";
import CalendarMonth from "./CalendarMonth";

import { DATE_FORMAT } from "@/constants/Config";

const getMonths = (start: dayjs.Dayjs, count: number) =>
  Array.from({ length: count }, (_, index) =>
    start.add(index, "month").format(DATE_FORMAT)
  );

const Calendar = memo(
  ({
    monthCount,
    onCalendarHeightChange,
  }: {
    monthCount: number;
    onCalendarHeightChange: (height: number) => void;
  }) => {
    const logState = useLogState();
    const firstMonthY = useRef(0);
    const monthDates = useMemo(
      () =>
        getMonths(
          dayjs()
            .subtract(monthCount - 1, "month")
            .startOf("month"),
          monthCount
        ),
      [monthCount]
    );

    const itemMap = useMemo(() => {
      const itemsByDate: Record<string, typeof logState.items> = {};

      for (const item of logState.items) {
        const date = dayjs(item.dateTime).format(DATE_FORMAT);

        if (!itemsByDate[date]) {
          itemsByDate[date] = [];
        }

        itemsByDate[date].push(item);
      }

      return itemsByDate;
    }, [logState.items]);

    const onFirstMonthLayout = useCallback((event: LayoutChangeEvent) => {
      firstMonthY.current = event.nativeEvent.layout.y;
    }, []);

    const onLastMonthLayout = useCallback(
      (event: LayoutChangeEvent) => {
        const { y, height } = event.nativeEvent.layout;
        onCalendarHeightChange(y + height - firstMonthY.current);
      },
      [onCalendarHeightChange]
    );
    const getMonthLayoutHandler = (index: number) => {
      if (index === 0) {
        return onFirstMonthLayout;
      }
      if (index === monthDates.length - 1) {
        return onLastMonthLayout;
      }
    };

    // Keep month props stable so previously rendered months skip pagination rerenders.
    // Native maintainVisibleContentPosition tracks direct month child frames on prepend.
    return monthDates.map((date, index) => (
      <CalendarMonth
        key={date}
        dateString={date}
        itemMap={itemMap}
        onLayout={getMonthLayoutHandler(index)}
      />
    ));
  }
);

Calendar.displayName = "Calendar";

export default Calendar;
