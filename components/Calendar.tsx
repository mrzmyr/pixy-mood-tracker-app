import { useNavigation, useTheme } from "@react-navigation/native";
import { forwardRef, memo, useCallback, useEffect, useMemo, useRef } from "react";
import { Text, View } from "react-native";
import {
  useScrollIntoView
} from 'react-native-scroll-into-view';
import Colors from "../constants/Colors";
import useColors from "../hooks/useColors";
import { LogItem, useLogs } from "../hooks/useLogs";
import { useTranslation } from "../hooks/useTranslation";
import Button from "./Button";
import CalendarDay from "./CalendarDay";
import dayjs from "dayjs";

const CalendarDayContainer = memo((({ 
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
}))

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
            item={day.item}
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

interface WeekEntry {
  days: string[];
  items: LogItem[];
}

const CalendarMonth = forwardRef(({
  dateString,
  items,
}: {
  dateString: string;
  items?: LogItem[];
}, ref) => {

  const date = dayjs(dateString);
  const colors = useColors();
  const daysInMonthCount = date.daysInMonth();
  let weeks: WeekEntry[] = useMemo(() => {
    
    let weeks: WeekEntry[] = []
    let weekIndex = 0;
    
    for (let i = 1; i <= daysInMonthCount; i++) {
      const prevDay = date.clone().set('date', i - 1)
      const day = date.clone().set('date', i);
      if(prevDay.week() !== day.week()) weekIndex++;
      if(!weeks[weekIndex]) weeks[weekIndex] = { days: [], items: [] };
      weeks[weekIndex].days.push(day.format('YYYY-MM-DD'));
      if(items) {
        const dayItems = items.filter(item => dayjs(item.date).isSame(day, 'day'));
        weeks[weekIndex].items.push(...dayItems);
      }
    }

    return weeks;
  }, [items]);

  return (
    <View ref={ref} renderToHardwareTextureAndroid>
      <Text
        style={{
          margin: 10,
          marginTop: 20,
          textAlign: 'center',
          fontSize: 17,
          opacity: 0.5,
          color: colors.calendarMonthNameColor,
        }}
      >{date.format('MMMM YYYY')}</Text>
      {weeks.map((week, index) => (
        <CalendarWeek 
          key={index}
          isFirst={index === 0} 
          isLast={index === weeks.length - 1} 
          days={week.days}
          items={week.items}
        />
      ))}
    </View>
  )
})

export default function Calendar({
  navigation
}: {
  navigation: any;
}) {
  const { state } = useLogs()
  const i18n = useTranslation()
  const today = dayjs();

  const months = [];
  for (let i = -6; i <= 0; i++) {
    const month = today.clone().add(i, 'month').startOf('month');
    months.push({
      dateString: month.format('YYYY-MM-DD'),
      items: useMemo(() => Object.keys(state.items)
        .filter(dateString => dayjs(dateString).isSame(month, 'month'))
        .map(dateString => state.items[dateString]), [JSON.stringify(Object.keys(state.items)
          .filter(dateString => dayjs(dateString).isSame(month, 'month')))])
    });
  }

  const futureMonths = []
  for (let i = 1; i <= 1; i++) {
    const month = today.clone().add(i, 'month').startOf('month');
    futureMonths.push({
      dateString: month.format('YYYY-MM-DD')
    });
  }
  
  const scrollIntoView = useScrollIntoView();
  const viewRef = useRef();
  
  useEffect(() => {
    scrollIntoView(viewRef.current)
  }, [navigation]);

  const scrollToToday = () => {
    scrollIntoView(viewRef.current, { animated: true })
  }

  return (
    <>
      <Button
        onPress={() => scrollToToday()}
        type="secondary"
        testID="calendar-back-to-today-top"
        style={{
          marginTop: 20,
        }}
      >{i18n.t('back_to_today')}</Button>
      {months.map(({ dateString, items }) => (
        <CalendarMonth 
          key={dateString} 
          dateString={dateString} 
          ref={dayjs().isSame(dateString, 'month') ? viewRef : null}
          items={items} 
        />
      ))}
      {futureMonths.map(({ dateString }) => (
        <CalendarMonth 
          key={dateString} 
          dateString={dateString} 
          ref={dayjs().isSame(dateString, 'month') ? viewRef : null}
        />
      ))}
    </>
  )
}
