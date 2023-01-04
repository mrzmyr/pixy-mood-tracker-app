import dayjs from "dayjs";
import { memo, useCallback, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { DATE_FORMAT } from "@/constants/Config";

import { useNavigation } from "@react-navigation/native";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { useCalendarFilters } from "../../hooks/useCalendarFilters";
import { LogItem, useLogState } from "../../hooks/useLogs";
import { getAverageMood } from "@/lib/utils";
import CalendarDay from "./CalendarDay";
import { useCalendarNavigation } from "@/hooks/useCalendarNavigation";

dayjs.extend(isSameOrBefore)

const CalendarDayContainer = memo(({
  children,
}: {
  children?: React.ReactNode;
}) => {
  return (
    <View style={styles.dayContainer}>{children}</View>
  )
})

type DayMapItem = {
  dateString: string;
}

const CalendarWeek = memo(function CalendarWeek({
  startDate,
  endDate,
  isFirst = false,
  isLast = false,
  itemMap,
}: {
  startDate: string;
  endDate: string;
  isFirst?: boolean;
  isLast?: boolean;
  itemMap: {
    [key: string]: LogItem[];
  }
}) {
  const calendarNavigation = useCalendarNavigation()
  const navigation = useNavigation();
  const calendarFilters = useCalendarFilters()

  let justifyContent = "space-around";
  if (isFirst) justifyContent = 'flex-end';
  if (isLast) justifyContent = 'flex-start';

  const days = useMemo(() => {
    const days: string[] = [];
    let date = dayjs(startDate);

    while (date.isSameOrBefore(endDate, 'day')) {
      days.push(date.format(DATE_FORMAT));
      date = date.add(1, 'day');
    }

    return days;
  }, [startDate, endDate])

  const emptyDays = useMemo(() => {
    const emptyDays: null[] = [];
    for (let i = 0; i < 7 - days.length; i++) emptyDays.push(null);
    return emptyDays;
  }, [days]);

  const daysMap: DayMapItem[] = days.map(dateString => {
    return {
      dateString,
    }
  });

  const onPressDay = useCallback((date: string) => {
    calendarNavigation.openDay(date)
  }, [navigation, calendarNavigation])

  const filteredItemIds = useMemo(() => {
    return calendarFilters.data.filteredItems.map(item => item.id)
  }, [JSON.stringify(calendarFilters.data.filteredItems)])

  const renderDay = ({ date }) => {
    const items = itemMap[date] || [];
    const averageRating = items.length < 1 ? null : getAverageMood(items)
    const isFiltered = items.some(item => filteredItemIds.includes(item.id))

    return (
      <CalendarDay
        dateString={date}
        rating={averageRating}
        isFiltered={isFiltered}
        isFiltering={calendarFilters.data.isFiltering}
        onPress={() => onPressDay(date)}
      />
    )
  }

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: 'space-around',
        marginLeft: -4,
        marginRight: -4,
      }}
    >
      {!isLast && emptyDays.map((day, index) => <CalendarDayContainer key={index} />)}

      {daysMap.map(day => (
        <CalendarDayContainer key={day.dateString}>
          {renderDay({ date: day.dateString })}
        </CalendarDayContainer>)
      )}

      {isLast && emptyDays.map((day, index) => <CalendarDayContainer key={index} />)}
    </View>
  )
})

const styles = StyleSheet.create({
  dayContainer: {
    flex: 7,
    margin: 3,
  }
})

export default CalendarWeek