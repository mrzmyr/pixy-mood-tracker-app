import { Dayjs } from "dayjs";
import React, { ReactNode } from "react";
import { View } from "react-native";
import { DATE_FORMAT } from "../../../constants/Config";
import { Day } from "./Day";
import { YAxis } from "./YAxis";

export const Row = ({ date, dayCount }: {
  date: Dayjs;
  dayCount: number;
}) => {

  const months: ReactNode[] = [];

  for (let i = 0; i < 12; i++) {
    const _date = date.add(i, "month").add(dayCount, 'day').format(DATE_FORMAT);
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
        <Day date={_date} />
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
