import dayjs from "dayjs";
import { CalendarList } from "react-native-calendars";
import useColors from "../hooks/useColors";
import CalendarDay from "./CalendarDay";
import CalendarHeader from "./CalendarHeader";

export default function Calendar() {
  const colors = useColors()
  const currentDate = dayjs().format('YYYY-MM-DD');
  
  return (
    <>
      <CalendarHeader />
      <CalendarList
        firstDay={1}
        theme={{
          calendarBackground: colors.background,
          monthTextColor: colors.calendarMonthNameColor,
          'stylesheet.calendar.header': {
            week: {
              display: 'none',
            },
          },
        }}
        current={currentDate}
        pastScrollRange={12}
        futureScrollRange={12}
        scrollEnabled={true}
        dayComponent={CalendarDay}
      />
    </>
  )
}