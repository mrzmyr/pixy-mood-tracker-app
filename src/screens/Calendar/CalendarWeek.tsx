import dayjs from "dayjs";
import { memo, useCallback, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { DATE_FORMAT } from "@/constants/Config";

import { useNavigation } from "@react-navigation/native";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { useCalendarFilters } from "../../hooks/useCalendarFilters";
import type { LogItem } from "../../hooks/useLogs";
import { getAverageMood } from "@/lib/utils";
import CalendarDay from "./CalendarDay";
import { useCalendarNavigation } from "@/hooks/useCalendarNavigation";

dayjs.extend(isSameOrBefore);

const styles = StyleSheet.create({
  dayContainer: {
    flex: 7,
    margin: 3,
  },
});

const CalendarDayContainerComponent = ({
  children,
}: {
  children?: React.ReactNode;
}) => <View style={styles.dayContainer}>{children}</View>;

const CalendarDayContainer = memo(CalendarDayContainerComponent);

interface DayMapItem {
  dateString: string;
}

const CalendarWeekComponent = ({
  startDate,
  endDate,
  isLast = false,
  itemMap,
}: {
  startDate: string;
  endDate: string;
  isFirst?: boolean;
  isLast?: boolean;
  itemMap: {
    [key: string]: LogItem[];
  };
}) => {
  const calendarNavigation = useCalendarNavigation();
  const navigation = useNavigation();
  const calendarFilters = useCalendarFilters();

  const days = useMemo(() => {
    const weekDays: string[] = [];
    let date = dayjs(startDate);

    while (date.isSameOrBefore(endDate, "day")) {
      weekDays.push(date.format(DATE_FORMAT));
      date = date.add(1, "day");
    }

    return weekDays;
  }, [startDate, endDate]);

  const emptyDays = useMemo(() => {
    // Placeholder slots have no data identity; the slot position is their stable key.
    const placeholders: string[] = [];
    for (let i = 0; i < 7 - days.length; i += 1) {
      placeholders.push(`empty-day-${i}`);
    }
    return placeholders;
  }, [days]);

  const daysMap: DayMapItem[] = days.map((dateString) => ({
    dateString,
  }));

  const onPressDay = useCallback(
    (date: string) => {
      calendarNavigation.openDay(date);
    },
    [navigation, calendarNavigation]
  );

  const filteredItemIds = useMemo(
    () => new Set(calendarFilters.data.filteredItems.map((item) => item.id)),
    [JSON.stringify(calendarFilters.data.filteredItems)]
  );

  const renderDay = ({ date }) => {
    const items = itemMap[date] || [];
    const averageRating = items.length < 1 ? null : getAverageMood(items);
    const isFiltered = items.some((item) => filteredItemIds.has(item.id));

    return (
      <CalendarDay
        dateString={date}
        rating={averageRating}
        isFiltered={isFiltered}
        isFiltering={calendarFilters.data.isFiltering}
        onPress={() => onPressDay(date)}
      />
    );
  };

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-around",
        marginLeft: -4,
        marginRight: -4,
      }}
    >
      {!isLast && emptyDays.map((slot) => <CalendarDayContainer key={slot} />)}

      {daysMap.map((day) => (
        <CalendarDayContainer key={day.dateString}>
          {renderDay({ date: day.dateString })}
        </CalendarDayContainer>
      ))}

      {isLast && emptyDays.map((slot) => <CalendarDayContainer key={slot} />)}
    </View>
  );
};

const CalendarWeek = memo(CalendarWeekComponent);

export default CalendarWeek;
