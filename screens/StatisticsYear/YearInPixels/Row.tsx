import { Dayjs } from "dayjs";
import React, { ReactNode } from "react";
import { View } from "react-native";
import { DATE_FORMAT } from "../../../constants/Config";
import { LogItem } from "../../../hooks/useLogs";
import { Day } from "./Day";
import { YAxis } from "./YAxis";

export const Row = ({ date, dayCount, items }: {
  date: Dayjs;
  dayCount: number;
  items: LogItem[];
}) => {

  const months: ReactNode[] = [];

  for (let i = 0; i < 12; i++) {
    const month = date.month(i);
    const inThisMonth = month.date(dayCount).isSame(month, 'month');

    const _date = date.add(i, "month").date(dayCount).format(DATE_FORMAT);
    const item = items.find(item => item.date === _date);

    months.push(
      <View
        key={i}
        style={{
          alignItems: 'center',
          flexBasis: `${100 / 13}%`,
          paddingVertical: 2,
          paddingHorizontal: 4,
        }}
      >
        {inThisMonth && <Day date={_date} item={item} />}
      </View>
    );
  }

  return (
    <>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        <YAxis dayCount={dayCount} />
        {months}
      </View>
    </>
  );
};
