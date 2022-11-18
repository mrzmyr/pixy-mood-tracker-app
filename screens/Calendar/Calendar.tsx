import dayjs from "dayjs";
import React, { forwardRef, memo, useCallback, useMemo } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useCalendarFilters } from "../../hooks/useCalendarFilters";
import useColors from "../../hooks/useColors";
import { LogItem, useLogState } from "../../hooks/useLogs";
import { useSettings } from "../../hooks/useSettings";
import CalendarMonth from "./CalendarMonth";

import { useNavigation } from "@react-navigation/native";
import { useStyle } from "react-native-style-utilities";
import { DATE_FORMAT } from "../../constants/Config";
import { t } from "../../helpers/translation";
import CalendarDay from "./CalendarDay";

const MONTH_COUNT = 12;
const MONTH_DATES: string[] = []

for (let i = MONTH_COUNT; i >= 0; i--) {
  MONTH_DATES.push(dayjs().subtract(i, "month").format(DATE_FORMAT));
}

const Calendar = memo(forwardRef(function Calendar({ }, ref: React.RefObject<View>) {
  const navigation = useNavigation();
  const colors = useColors()
  const logState = useLogState()
  const { settings } = useSettings()
  const calendarFilters = useCalendarFilters()

  const bottomTextStyles = useStyle(() => [
    styles.bottomText,
    {
      color: colors.textSecondary,
    }
  ], [colors])

  const filteredItemIds = useMemo(() => {
    return Object.values(calendarFilters.data.filteredItems.map(item => item.id))
  }, [JSON.stringify(calendarFilters.data.filteredItems)])

  const onPressDay = useCallback((date: string, item: LogItem) => {
    if (item) {
      navigation.navigate('LogView', { id: item.id })
    } else {
      navigation.navigate('LogCreate', { date })
    }
  }, [navigation])

  return (
    <View
      ref={ref}
      style={{
        paddingBottom: 80,
      }}
    >
      {MONTH_DATES.map((date, index) => (
        <CalendarMonth
          key={date}
          dateString={date}
          renderDay={({ date }) => {
            const item = logState.items[date];
            const isFiltered = item && filteredItemIds.includes(item.id)

            return (
              <CalendarDay
                dateString={date}
                rating={item?.rating}
                messageLength={item?.message.length}
                isFiltered={isFiltered}
                isFiltering={calendarFilters.data.isFiltering}
                scaleType={settings.scaleType}
                onPress={() => onPressDay(date, item)}
              />
            )
          }}
        />
      ))}
      <Text style={bottomTextStyles}>🙏 {t('calendar_bottom_hint')}</Text>
    </View>
  )
}))

const styles = StyleSheet.create({
  bottomText: {
    paddingTop: 140,
    paddingBottom: Platform.OS === 'ios' ? 0 : 40,
    marginBottom: -120,
    textAlign: 'center',
    fontSize: 15,
  }
})

export default Calendar