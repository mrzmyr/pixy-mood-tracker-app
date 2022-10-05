import dayjs from "dayjs";
import { forwardRef, memo, useMemo } from "react";
import { Text, View } from "react-native";
import useColors from "../hooks/useColors";
import { LogItem } from "../hooks/useLogs";
import { SettingsState } from "../hooks/useSettings";
import CalendarWeek from './CalendarWeek';

interface WeekEntry {
  days: string[];
  items: LogItem[];
}

const CalendarMonth = memo(forwardRef(({
  dateString,
  items,
  scaleType,
}: {
  navigation: any;
  dateString: string;
  items?: LogItem[];
  scaleType: SettingsState["scaleType"];
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
          margin: 12,
          marginTop: 16,
          textAlign: 'center',
          fontSize: 17,
          color: colors.calendarMonthNameColor,
        }}
      >{date.format('MMMM YYYY')}</Text>
      {weeks.map((week, index) => (
        <CalendarWeek
          scaleType={scaleType}
          key={index}
          isFirst={index === 0} 
          isLast={index === weeks.length - 1} 
          days={week.days}
          items={week.items}
        />
      ))}
    </View>
  )
}))

export default CalendarMonth;