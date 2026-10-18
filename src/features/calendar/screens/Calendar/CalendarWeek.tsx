import dayjs from "dayjs";
import { useMappingHelper } from "@shopify/flash-list";
import { memo, useCallback, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { DATE_FORMAT } from "@/constants/Config";

import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { useCalendarFilters } from "../../filters";
import type { LogItem } from "@/features/logs";
import { getAverageMood } from "@/features/logs";
import CalendarDay from "./CalendarDay";
import { useCalendarNavigation } from "../../navigation";
import { useSetting } from "@/state/settings";

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
  height,
  itemMap,
}: {
  startDate: string;
  endDate: string;
  height: number;
  isLast?: boolean;
  itemMap: {
    [key: string]: LogItem[];
  };
}) => {
  const { getMappingKey } = useMappingHelper();
  const { openDay } = useCalendarNavigation();
  const { data: filters } = useCalendarFilters();
  const scaleType = useSetting("scaleType");

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

  // One handler for all days: memoized days skip re-rendering when only
  // other days changed.
  const onPressDay = useCallback(
    (date: string) => {
      openDay({ date, source: "calendar" });
    },
    [openDay]
  );

  const renderDay = ({ date }) => {
    const items = itemMap[date] || [];
    const averageRating = items.length < 1 ? null : getAverageMood(items);

    return (
      <CalendarDay
        dateString={date}
        rating={averageRating}
        scaleType={scaleType}
        isFiltered={filters.filteredDates.has(date)}
        isFiltering={filters.isFiltering}
        onPress={onPressDay}
      />
    );
  };

  return (
    <View
      style={{
        height,
        flexDirection: "row",
        justifyContent: "space-around",
        marginLeft: -4,
        marginRight: -4,
      }}
    >
      {!isLast && emptyDays.map((slot) => <CalendarDayContainer key={slot} />)}

      {daysMap.map((day, index) => (
        <CalendarDayContainer key={getMappingKey(day.dateString, index)}>
          {renderDay({ date: day.dateString })}
        </CalendarDayContainer>
      ))}

      {isLast && emptyDays.map((slot) => <CalendarDayContainer key={slot} />)}
    </View>
  );
};

const CalendarWeek = memo(CalendarWeekComponent);

export default CalendarWeek;
