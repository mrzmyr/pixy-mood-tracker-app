import dayjs from "dayjs";
import { memo } from "react";
import { View } from "react-native";
import { useCalendarFilters } from "../hooks/useCalendarFilters";
import { LogItem } from "../hooks/useLogs";
import CalendarDay from "./CalendarDay";

const CalendarDayContainer = ({ 
  children,
}: {
  children?: React.ReactNode;
}) => {
  return (
    <View style={{
      flex: 7,
      margin: 3,
    }}>{children}</View>
  )
}

const CalendarWeek = memo(({
  days,
  items,
  onPress = null,
  isFirst = false,
  isLast = false,
}: {
  days: string[];
  items: LogItem[];
  onPress?: (dateString: string) => void;
  isFirst?: boolean;
  isLast?: boolean;
}) => {
  let justifyContent = "space-around";
  if(isFirst) justifyContent = 'flex-end';
  if(isLast) justifyContent = 'flex-start';

  const calendarFilters = useCalendarFilters();
  
  const emptyDays = [];
  for (let i = 0; i < 7 - days.length; i++) emptyDays.push(null);

  const daysMap = days.map(dateString => {
    const day = dayjs(dateString);
    const item = items.find(item => item.date === dateString);
    return {
      number: day.date(),
      dateString,
      item,
      isToday: dayjs(dateString).isSame(dayjs(), 'day'),
      isFuture: day.isAfter(dayjs()),
      isFiltered: calendarFilters.isFiltering && item && !calendarFilters.validate(item),
      isFiltering: calendarFilters.isFiltering,
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
            rating={day.item?.rating}
            tags={day.item?.tags}
            day={day.number}
            isToday={day.isToday}
            isFiltered={day.isFiltered}
            isFiltering={day.isFiltering}
            filters={calendarFilters.data}
            isFuture={day.isFuture}
            hasText={day.item?.message?.length > 0}
            onPress={onPress}
          />
        </CalendarDayContainer>)
      )}
      
      {isLast && emptyDays.map((day, index) => <CalendarDayContainer key={index} />)}
    </View>
  )
})

export default CalendarWeek;