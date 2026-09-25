import { DATE_FORMAT } from "@/constants/Config";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import React, { memo } from "react";
import { useMappingHelper } from "@shopify/flash-list";
import type { getGeometry } from "./layout";
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
    lineHeight: 22,
    includeFontPadding: false,
  },
});

const CalendarMonthComponent = ({
  dateString,
  itemMap,
  weeks,
  geometry,
}: {
  dateString: string;
  itemMap: {
    [key: string]: LogItem[];
  };
  weeks: number;
  geometry: ReturnType<typeof getGeometry>;
}) => {
  const colors = useColors();
  const { getMappingKey } = useMappingHelper();
  const date = dayjs(dateString);
  const monthStart = date.startOf("month");
  const monthEnd = date.endOf("month");
  const weekStart = monthStart.startOf("week");
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
      testID={`calendar-month-${dateString}`}
      style={{
        height: geometry.titleHeight + weeks * geometry.weekHeight,
        paddingHorizontal: Platform.OS === "android" ? 1 : 0,
      }}
    >
      <View style={{ height: geometry.titleHeight }}>
        <Text numberOfLines={1} style={textStyles}>
          {date.format("MMMM YYYY")}
        </Text>
      </View>
      {weekDates.map((week, index) => (
        <CalendarWeek
          key={getMappingKey(week.start.format(DATE_FORMAT), index)}
          startDate={week.start.format(DATE_FORMAT)}
          endDate={week.end.format(DATE_FORMAT)}
          height={geometry.weekHeight}
          isLast={index === weekDates.length - 1}
          itemMap={itemMap}
        />
      ))}
    </View>
  );
};

const CalendarMonth = memo(CalendarMonthComponent);

export default CalendarMonth;
