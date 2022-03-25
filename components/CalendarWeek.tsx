import { useNavigation } from "@react-navigation/native";
import dayjs from "dayjs";
import { memo, useCallback } from "react";
import { View } from "react-native";
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
  isFirst = false,
  isLast = false,
}: {
  days: string[];
  items: LogItem[];
  isFirst?: boolean;
  isLast?: boolean;
}) => {
  const navigation = useNavigation()

  let justifyContent = "space-between";
  if(isFirst) justifyContent = 'flex-end';
  if(isLast) justifyContent = 'flex-start';
  
  const emptyDays = [];
  for (let i = 0; i < 7 - days.length; i++) emptyDays.push(null);

  const daysMap = days.map(dateString => {
    const day = dayjs(dateString);
    return {
      number: day.date(),
      dateString,
      item: items.find(item => item.date === dateString),
      isToday: dayjs(dateString).isSame(dayjs(), 'day'),
      isFuture: day.isAfter(dayjs()),
    }
  });

  const onPress = useCallback((dateString) => {
    navigation.navigate('Log', { date: dateString })
  }, [navigation])
  
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent,
      }}
    >
      {!isLast && emptyDays.map((day, index) => <CalendarDayContainer key={index} />)}

      {daysMap.map(day => (
        <CalendarDayContainer key={day.dateString}>
          <CalendarDay 
            dateString={day.dateString}
            rating={day.item?.rating}
            day={day.number}
            isToday={day.isToday}
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