import dayjs from "dayjs";
import { forwardRef, useEffect, useRef } from "react";
import { ScrollView, Text, View } from "react-native";
import {
  useScrollIntoView, wrapScrollView
} from 'react-native-scroll-into-view';
import useColors from "../hooks/useColors";
import CalendarDay from "./CalendarDay";
import CalendarHeader from "./CalendarHeader";


interface Week {
  days: [];
}

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
  days: Day[];
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

      {days.map(day => <CalendarDayContainer key={day}><CalendarDay date={{
          dateString: day.format('YYYY-MM-DD'),
          day: day.date(),
      }} /></CalendarDayContainer>)}
      
      {isLast && emptyDays.map((day, index) => <CalendarDayContainer key={index} />)}
    </View>
  )
}

const CalendarMonth = forwardRef(({
  date
}, ref) => {

  const daysInMonthCount = date.daysInMonth();
  let weeks = [[]];
  let weekIndex = 0;

  for (let i = 1; i <= daysInMonthCount; i++) {
    const day = date.clone().set('date', i);
    if(!weeks[weekIndex]) weeks[weekIndex] = [];
    weeks[weekIndex].push(day);
    if(day.day() === 0) weekIndex++;
  }

  return (
    <View ref={ref}>
      <Text
      style={{
        margin: 10,
        marginTop: 20,
        textAlign: 'center',
        fontSize: 15,
        opacity: 0.5,
      }}
      >{date.format('MMMM YYYY')}</Text>
      {weeks.map((week, index) => <CalendarWeek 
        key={week}
        isFirst={index === 0} 
        isLast={index === weeks.length - 1} 
        days={week} 
      />)}
    </View>
  )
})

function Calendar() {
  const currentMonth = dayjs();

  const pastMonths = [];
  for (let i = 12; i >= 1; i--) pastMonths.push(dayjs().subtract(i, 'month'));

  const futureMonths = [];
  for (let i = 1; i <= 12; i++) futureMonths.push(dayjs().add(i, 'month'));

  const scrollIntoView = useScrollIntoView();
  const viewRef = useRef();
  
  useEffect(() => {
    scrollIntoView(viewRef.current)
  }, [])
  
  return (
    <>
      {pastMonths.map(month => <CalendarMonth key={month} date={month} />)}
      <CalendarMonth date={currentMonth} ref={viewRef} />
      {futureMonths.map(month => <CalendarMonth key={month} date={month} />)}
    </>
  )
}

const CustomScrollView = wrapScrollView(ScrollView);

export default function CalendarScreen() {
  const colors = useColors()
  
  return (
    <>
      <CalendarHeader />
      <CustomScrollView
      style={{
        marginTop: 0,
        backgroundColor: colors.background,
        paddingLeft: 15,
        paddingRight: 15,
      }}
        scrollIntoViewOptions={{
          animated: false,
          align: 'center',
        }}
      >
        <Calendar />
      </CustomScrollView>
    </>
  )
}
