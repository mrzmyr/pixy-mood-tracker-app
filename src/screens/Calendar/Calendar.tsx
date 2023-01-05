import dayjs from "dayjs";
import React, { forwardRef, memo } from "react";
import { View } from "react-native";
import { useLogState } from "../../hooks/useLogs";
import CalendarMonth from "./CalendarMonth";

import { DATE_FORMAT } from "@/constants/Config";

const MONTH_COUNT = 12;
const MONTH_DATES: string[] = []

for (let i = MONTH_COUNT; i >= 0; i--) {
  MONTH_DATES.push(dayjs().subtract(i, "month").format(DATE_FORMAT));
}

const Calendar = memo(forwardRef(function Calendar({ }, ref: React.RefObject<View>) {
  const logState = useLogState()

  const itemMap = {}

  logState.items.forEach(item => {
    const date = dayjs(item.dateTime).format(DATE_FORMAT)

    if (!itemMap[date]) {
      itemMap[date] = []
    }

    itemMap[date].push(item)
  })

  return (
    <View
      ref={ref}
    >
      {MONTH_DATES.map((date, index) => (
        <CalendarMonth
          key={date}
          dateString={date}
          itemMap={itemMap}
        />
      ))}
    </View>
  )
}))

export default Calendar