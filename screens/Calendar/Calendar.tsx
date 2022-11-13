import dayjs from "dayjs";
import _ from "lodash";
import React, { forwardRef, memo, useCallback, useMemo } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useCalendarFilters } from "../../hooks/useCalendarFilters";
import useColors from "../../hooks/useColors";
import { LogItem, useLogState } from "../../hooks/useLogs";
import { useSettings } from "../../hooks/useSettings";
import CalendarMonth from "./CalendarMonth";

import { useStyle } from "react-native-style-utilities";
import { t } from "../../helpers/translation";
import { DATE_FORMAT } from "../../constants/Config";
import CalendarDay from "./CalendarDay";
import { useNavigation } from "@react-navigation/native";

const MONTH_COUNT = 6;
const MONTH_DATES: string[] = []

for (let i = MONTH_COUNT; i >= 0; i--) {
  MONTH_DATES.push(dayjs().subtract(i, "month").format(DATE_FORMAT));
}

const Calendar = memo(forwardRef(function Calendar({ }, ref: React.RefObject<View>) {
  const navigation = useNavigation();
  const colors = useColors()
  const logState = useLogState()
  const today = dayjs();
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
      navigation.navigate('LogView', { date })
    } else {
      navigation.navigate('LogEdit', { date })
    }
  }, [navigation])

  return (
    <View
      ref={ref}
      style={styles.container}
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
  container: {
    paddingBottom: 40,
  },
  bottomText: {
    paddingTop: 80,
    paddingBottom: Platform.OS === 'ios' ? 0 : 40,
    marginBottom: -80,
    textAlign: 'center',
    fontSize: 15,
  }
})

export default Calendar