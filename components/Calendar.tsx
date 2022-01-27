import dayjs from "dayjs";
import { forwardRef, useEffect, useRef } from "react";
import { Text, View } from "react-native";
import {
  useScrollIntoView
} from 'react-native-scroll-into-view';
import useColors from "../hooks/useColors";
import CalendarDay from "./CalendarDay";

function CalendarDayContainer({ 
  children,
}: {
  children?: React.ReactNode;
}) {
  return (
    <View style={{
      flex: 7,
      margin: 3,
    }}>{children}</View>
  )
}

function CalendarWeek({
  days,
  isFirst = false,
  isLast = false,
}: {
  days: dayjs.Dayjs[];
  isFirst?: boolean;
  isLast?: boolean;
}) {
  let justifyContent = "space-between";
  if(isFirst) justifyContent = 'flex-end';
  if(isLast) justifyContent = 'flex-start';
  
  const emptyDays = [];
  for (let i = 0; i < 7 - days.length; i++) emptyDays.push(null);
  
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent,
      }}
    >
      {!isLast && emptyDays.map((day, index) => <CalendarDayContainer key={index} />)}

      {days.map(day => (
        <CalendarDayContainer key={day.toString()}>
          <CalendarDay date={{
            dateString: day.format('YYYY-MM-DD'),
            day: day.date(),
          }} />
        </CalendarDayContainer>)
      )}
      
      {isLast && emptyDays.map((day, index) => <CalendarDayContainer key={index} />)}
    </View>
  )
}

const CalendarMonth = forwardRef(({
  date
}: {
  date: dayjs.Dayjs;
}, ref) => {

  const colors = useColors();
  const daysInMonthCount = date.daysInMonth();
  let weeks = [[]];
  let weekIndex = 0;
  
  for (let i = 1; i <= daysInMonthCount; i++) {
    const prevDay = date.clone().set('date', i - 1)
    const day = date.clone().set('date', i);
    if(prevDay.week() !== day.week()) weekIndex++;
    if(!weeks[weekIndex]) weeks[weekIndex] = [];
    weeks[weekIndex].push(day);
  }

  return (
    <View ref={ref}>
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
      {weeks.map((week, index) => <CalendarWeek 
        key={week.toString()}
        isFirst={index === 0} 
        isLast={index === weeks.length - 1} 
        days={week} 
      />)}
    </View>
  )
})

export default function Calendar({
  navigation
}: {
  navigation: any;
}) {
  const currentMonth = dayjs();

  const pastMonths = [];
  for (let i = 12; i >= 1; i--) pastMonths.push(dayjs().subtract(i, 'month'));

  const futureMonths = [];
  for (let i = 1; i <= 12; i++) futureMonths.push(dayjs().add(i, 'month'));

  const scrollIntoView = useScrollIntoView();
  const viewRef = useRef();
  
  useEffect(() => {
    scrollIntoView(viewRef.current)
  }, [navigation]);
  
  return (
    <>
      {pastMonths.map(month => <CalendarMonth key={month.toString()} date={month} />)}
      <CalendarMonth date={currentMonth} ref={viewRef} />
      {futureMonths.map(month => <CalendarMonth key={month.toString()} date={month} />)}
    </>
  )
}
