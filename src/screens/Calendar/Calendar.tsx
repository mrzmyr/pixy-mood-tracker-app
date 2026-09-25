import dayjs from "dayjs";
import React, { forwardRef, memo, useMemo } from "react";
import { View } from "react-native";
import { useLogState } from "../../hooks/useLogs";
import CalendarMonth from "./CalendarMonth";

import { DATE_FORMAT } from "@/constants/Config";

const DEFAULT_MONTH_COUNT = 12;

// Calendar takes no props; only the forwarded ref is used.
type CalendarProps = Record<never, never>;

const CalendarComponent = (
  _props: CalendarProps,
  ref: React.RefObject<View>
) => {
  const logState = useLogState();
  const monthDates = useMemo(() => {
    const defaultStart = dayjs()
      .subtract(DEFAULT_MONTH_COUNT, "month")
      .startOf("month");
    let earliestItemDate: dayjs.Dayjs | null = null;
    for (const item of logState.items) {
      const date = dayjs(item.dateTime || item.date);
      if (
        date.isValid() &&
        (earliestItemDate === null || date.isBefore(earliestItemDate))
      ) {
        earliestItemDate = date;
      }
    }
    const start = earliestItemDate?.isBefore(defaultStart)
      ? earliestItemDate.startOf("month")
      : defaultStart;
    const monthCount = dayjs().startOf("month").diff(start, "month");

    return Array.from({ length: monthCount + 1 }, (_, index) =>
      start.add(index, "month").format(DATE_FORMAT)
    );
  }, [logState.items]);

  const itemMap = {};

  for (const item of logState.items) {
    const date = dayjs(item.dateTime).format(DATE_FORMAT);

    if (!itemMap[date]) {
      itemMap[date] = [];
    }

    itemMap[date].push(item);
  }

  return (
    <View ref={ref}>
      {monthDates.map((date) => (
        <CalendarMonth key={date} dateString={date} itemMap={itemMap} />
      ))}
    </View>
  );
};

const Calendar = memo(forwardRef(CalendarComponent));

export default Calendar;
