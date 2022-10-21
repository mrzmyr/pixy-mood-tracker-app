import dayjs, { Dayjs } from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import _ from "lodash";
import React, { memo, useMemo, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useStyle } from "react-native-style-utilities";
import { DATE_FORMAT } from "../../constants/Config";
import { CalendarFiltersData } from "../../hooks/useCalendarFilters";
import useColors from "../../hooks/useColors";
import { LogItem } from "../../hooks/useLogs";
import { SettingsState } from "../../hooks/useSettings";
import CalendarWeek from "./CalendarWeek";

dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

type MinimalLogItem = Omit<LogItem, "message"> & { messageLength: number };

const CalendarMonth = memo(function CalendarMonth({
  dateString,
  items,
  scaleType,
  filteredItems,
  isFiltering,
}: {
  dateString: string;
  items?: MinimalLogItem[];
  scaleType: SettingsState["scaleType"];
  filteredItems: CalendarFiltersData["filteredItems"];
  isFiltering: CalendarFiltersData["isFiltering"];
}) {
  const colors = useColors();

  const date = dayjs(dateString);

  const WEEK_ITEMS = useRef<MinimalLogItem[][]>([]);
  const WEEK_ITEMS_FILTERED = useRef<LogItem[][]>([]);
  const DATES: { start: Dayjs; end: Dayjs }[] = [];

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

    DATES.push({ start, end });

    WEEK_ITEMS.current[i] = [];
    WEEK_ITEMS_FILTERED.current[i] = [];
  }

  const weekItems = useMemo(() => {
    for (let i = 0; i < WEEK_ITEMS.current.length; i++) {
      const start =
        i === 0 ? date : date.clone().add(i, "week").startOf("week");
      const end =
        i === WEEK_ITEMS.current.length - 1
          ? date.clone().endOf("month")
          : date.startOf("month").add(i, "week").endOf("week");
      const _items = items?.filter(
        (item) =>
          dayjs(item.date).isSameOrAfter(start, "day") &&
          dayjs(item.date).isSameOrBefore(end, "day")
      );
      if (!_.isEqual(WEEK_ITEMS.current[i], _items) && _items !== undefined) {
        WEEK_ITEMS.current[i] = _items;
      }
    }

    return WEEK_ITEMS.current;
  }, [JSON.stringify(items), dateString]);

  const weekItemsFiltered = useMemo(() => {
    for (let i = 0; i < WEEK_ITEMS.current.length; i++) {
      const start =
        i === 0 ? date : date.clone().add(i, "week").startOf("week");
      const end = date.startOf("month").add(i, "week").endOf("week");
      const _filteredItems = filteredItems?.filter(
        (item) =>
          dayjs(item.date).isSameOrAfter(start, "day") &&
          dayjs(item.date).isSameOrBefore(end, "day")
      );

      if (!_.isEqual(WEEK_ITEMS_FILTERED.current[i], _filteredItems)) {
        WEEK_ITEMS_FILTERED.current[i] = _filteredItems;
      }
    }

    return WEEK_ITEMS_FILTERED.current;
  }, [JSON.stringify(filteredItems)]);

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
    <View renderToHardwareTextureAndroid>
      <Text style={textStyles}>{dayjs(dateString).format("MMMM YYYY")}</Text>
      {WEEK_ITEMS.current.map((_, index) => (
        <CalendarWeek
          scaleType={scaleType}
          key={index}
          startDate={DATES[index].start.format(DATE_FORMAT)}
          endDate={DATES[index].end.format(DATE_FORMAT)}
          isFirst={index === 0}
          isLast={index === WEEK_ITEMS.current.length - 1}
          items={weekItems[index]}
          filteredItems={weekItemsFiltered[index]}
          isFiltering={isFiltering}
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
