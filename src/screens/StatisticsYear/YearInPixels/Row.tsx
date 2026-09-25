import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import padStart from "lodash/padStart";
import type { ReactNode } from "react";
import React from "react";
import { View } from "react-native";
import type { LogItem } from "../../../hooks/useLogs";
import { getAverageMood } from "@/lib/utils";
import { Day } from "./Day";
import { YAxis } from "./YAxis";

export const Row = ({
  date,
  dayCount,
  items,
}: {
  date: Dayjs;
  dayCount: number;
  items: LogItem[];
}) => {
  const months: ReactNode[] = [];

  const year = date.year();

  for (let i = 0; i < 12; i += 1) {
    const monthString = `${year}-${padStart(`${i + 1}`, 2, "0")}`;
    const dateString = `${monthString}-${padStart(`${dayCount}`, 2, "0")}`;
    const inThisMonth = dayjs(dateString).month() === i;

    const _items = items.filter(
      (item) => item.dateTime?.split("T")[0] === dateString
    );
    const rating = getAverageMood(_items);

    months.push(
      <View
        key={i}
        style={{
          alignItems: "center",
          flexBasis: `${100 / 13}%`,
          paddingVertical: 2,
          paddingHorizontal: 4,
        }}
      >
        {inThisMonth && <Day date={dateString} rating={rating} />}
      </View>
    );
  }

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
      }}
    >
      <YAxis dayCount={dayCount} />
      {months}
    </View>
  );
};
