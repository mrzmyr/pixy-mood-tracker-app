import dayjs from "dayjs";
import { memo, useMemo, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { DATE_FORMAT } from "../../constants/Config";
import { CalendarFiltersData } from "../../hooks/useCalendarFilters";
import { LogItem } from "../../hooks/useLogs";
import { SettingsState } from "../../hooks/useSettings";
import CalendarDay from "./CalendarDay";

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
  rating: LogItem["rating"] | undefined;
  messageLength: number | undefined;
  isFiltered: boolean;
  isFiltering: boolean;
}

const CalendarWeek = memo(function CalendarWeek({
  startDate,
  endDate,
  items,
  isFirst = false,
  isLast = false,
  scaleType,
  filteredItems,
  isFiltering,
}: {
  startDate: string;
  endDate: string;
  items?: (Omit<LogItem, 'tags' | 'message'> & {
    messageLength?: number
  })[];
  isFirst?: boolean;
  isLast?: boolean;
  scaleType: SettingsState["scaleType"];
  filteredItems: CalendarFiltersData['filteredItems'];
  isFiltering: CalendarFiltersData['isFiltering'];
}) {
  let justifyContent = "space-around";
  if(isFirst) justifyContent = 'flex-end';
  if(isLast) justifyContent = 'flex-start';

  const days = useMemo(() => {
    const days: string[] = [];
    let date = dayjs(startDate);

    while(date.isSameOrBefore(endDate, 'day')) {
      days.push(date.format(DATE_FORMAT));
      date = date.add(1, 'day');
    }

    return days;
  }, [startDate, endDate])

  const emptyDays = useMemo(() => {
    const emptyDays: null[] = [];
    if(!days) console.log('NO DAYS', items);
    for (let i = 0; i < 7 - days.length; i++) emptyDays.push(null);
    return emptyDays;
  }, [days]);

  const daysMap: DayMapItem[] = days.map(dateString => {
    const item = items?.find(item => item.date === dateString);
    const isFiltered = filteredItems.map(item => item.date).includes(dateString);
    
    return {
      dateString,
      rating: item?.rating,
      messageLength: item?.messageLength,
      isFiltered,
      isFiltering: isFiltering,
    }
  });
  
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
          <CalendarDay
            dateString={day.dateString}
            rating={day?.rating}
            messageLength={day?.messageLength}
            isFiltered={day.isFiltered}
            isFiltering={day.isFiltering}
            scaleType={scaleType}
          />
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