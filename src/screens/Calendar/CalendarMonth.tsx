import { DATE_FORMAT } from "@/constants/Config";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import React, { memo } from "react";
import type { LayoutChangeEvent } from "react-native";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useStyle } from "react-native-style-utilities";
import useColors from "../../hooks/useColors";
import type { LogItem } from "../../hooks/useLogs";
import CalendarWeek from "./CalendarWeek";

const styles = StyleSheet.create({
  textStyles: {
    margin: 12,
    marginTop: 16,
    textAlign: "center",
    fontSize: 17,
  },
});

const CalendarMonthComponent = ({
  dateString,
  itemMap,
  onLayout,
}: {
  dateString: string;
  itemMap: {
    [key: string]: LogItem[];
  };
  onLayout?: (event: LayoutChangeEvent) => void;
}) => {
  const colors = useColors();
  const date = dayjs(dateString);
  const monthStart = date.startOf("month");
  const monthEnd = date.endOf("month");
  const weekStart = monthStart.startOf("week");
  const weekEnd = monthEnd.endOf("week");
  const weeks = weekEnd.diff(weekStart, "week") + 1;
  const weekDates: { start: Dayjs; end: Dayjs }[] = [];

  for (let index = 0; index < weeks; index += 1) {
    let start = weekStart.add(index, "week");
    let end = start.endOf("week");

    if (start.isBefore(monthStart)) {
      start = monthStart;
    }

    if (end.isAfter(monthEnd)) {
      end = monthEnd;
    }

    weekDates.push({ start, end });
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
      onLayout={onLayout}
      style={{
        flex: 1,
        paddingHorizontal: Platform.OS === "android" ? 1 : 0,
      }}
    >
      <Text style={textStyles}>{dayjs(dateString).format("MMMM YYYY")}</Text>
      {weekDates.map((week, index) => (
        <CalendarWeek
          key={week.start.format(DATE_FORMAT)}
          startDate={week.start.format(DATE_FORMAT)}
          endDate={week.end.format(DATE_FORMAT)}
          isFirst={index === 0}
          isLast={index === weekDates.length - 1}
          itemMap={itemMap}
        />
      ))}
    </View>
  );
};

const CalendarMonth = memo(CalendarMonthComponent);

export default CalendarMonth;
