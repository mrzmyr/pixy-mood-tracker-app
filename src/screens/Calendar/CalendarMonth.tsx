import { DATE_FORMAT } from "@/constants/Config";
import dayjs, { Dayjs } from "dayjs";
import React, { memo } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useStyle } from "react-native-style-utilities";
import useColors from "../../hooks/useColors";
import { LogItem } from "../../hooks/useLogs";
import CalendarWeek from "./CalendarWeek";

const CalendarMonth = memo(function CalendarMonth({
  dateString,
  itemMap,
}: {
  dateString: string;
  itemMap: {
    [key: string]: LogItem[];
  }
}) {
  const colors = useColors();

  const date = dayjs(dateString);

  const WEEK_DATES: { start: Dayjs; end: Dayjs }[] = [];

  // count the weeks in the month and create an array with start and end dates for each week
  const monthStart = date.startOf("month");
  const monthEnd = date.endOf("month");

  const weekStart = monthStart.startOf("week");
  const weekEnd = monthEnd.endOf("week");

  const weeks = weekEnd.diff(weekStart, "week") + 1;

  for (let i = 0; i < weeks; i++) {
    let start = weekStart.add(i, "week");
    let end = start.endOf("week");

    if (start.isBefore(monthStart)) {
      start = monthStart;
    }

    if (end.isAfter(monthEnd)) {
      end = monthEnd;
    }

    WEEK_DATES.push({ start, end });
  }

  const textStyles = useStyle(
    () => [
      styles.textStyles,
      {
        color: colors.calendarMonthNameColor,
      },
    ],
    [colors]
  );

  return (
    <View
      style={{
        flex: 1,
        paddingHorizontal: Platform.OS === "android" ? 1 : 0,
      }}
    >
      <Text style={textStyles}>{dayjs(dateString).format("MMMM YYYY")}</Text>
      {WEEK_DATES.map((_, index) => (
        <CalendarWeek
          key={index}
          startDate={WEEK_DATES[index].start.format(DATE_FORMAT)}
          endDate={WEEK_DATES[index].end.format(DATE_FORMAT)}
          isFirst={index === 0}
          isLast={index === WEEK_DATES.length - 1}
          itemMap={itemMap}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  textStyles: {
    margin: 12,
    marginTop: 16,
    textAlign: "center",
    fontSize: 17,
  },
});

export default CalendarMonth;
