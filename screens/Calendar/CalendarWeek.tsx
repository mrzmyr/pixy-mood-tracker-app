import dayjs from "dayjs";
import { memo, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { DATE_FORMAT } from "../../constants/Config";

import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
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
  renderDay,
}: {
  startDate: string;
  endDate: string;
  isFirst?: boolean;
  isLast?: boolean;
  renderDay: (props: {
    date: string;
  }) => React.ReactNode;
}) {
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
          {renderDay ? renderDay({ date: day.dateString }) : null}
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