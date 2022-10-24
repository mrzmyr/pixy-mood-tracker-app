import dayjs from "dayjs";
import _ from "lodash";
import React, { forwardRef, memo, useMemo } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useCalendarFilters } from "../../hooks/useCalendarFilters";
import useColors from "../../hooks/useColors";
import { LogItem, useLogState } from "../../hooks/useLogs";
import { useSettings } from "../../hooks/useSettings";
import CalendarMonth from "./CalendarMonth";

import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { useStyle } from "react-native-style-utilities";
import { t } from "../../helpers/translation";
import { DATE_FORMAT } from "../../constants/Config";

dayjs.extend(isSameOrBefore)
dayjs.extend(isSameOrAfter)

const MONTH_COUNT = 12;
const MONTH_ITEMS: (Omit<LogItem, 'message'> & { messageLength: number })[][] = []
const MONTH_ITEMS_FILTERED: LogItem[][] = []

for (let i = 0; i < MONTH_COUNT; i++) {
  MONTH_ITEMS.push([])
  MONTH_ITEMS_FILTERED.push([])
}

const Calendar = memo(forwardRef(function Calendar({ }, ref: React.RefObject<View>) {
  const colors = useColors()
  const logState = useLogState()
  const today = dayjs();
  const { settings } = useSettings()
  const calendarFilters = useCalendarFilters()

  const monthItems = useMemo(() => {

    for (let i = 0; i < MONTH_ITEMS.length; i++) {
      const start = today.clone().subtract(i, 'month').startOf('month');
      const end = today.clone().subtract(i, 'month').endOf('month');
      const _items = Object.values(logState.items)
        .filter(item => (
          dayjs(item.date).isSameOrAfter(start, 'day') &&
          dayjs(item.date).isSameOrBefore(end, 'day')
        ))
        .map(item => ({
          ..._.omit(item, ['tags', 'message']),
          messageLength: item.message.length,
        }))
      if (!_.isEqual(MONTH_ITEMS[i], _items)) {
        MONTH_ITEMS[i] = _items;
      }
    }

    return MONTH_ITEMS;
  }, [JSON.stringify(logState.items), today.format(DATE_FORMAT)]);

  const monthItemsFiltered = useMemo(() => {

    for (let i = 0; i < MONTH_ITEMS.length; i++) {
      const start = today.clone().subtract(i, 'month').startOf('month');
      const end = today.clone().subtract(i, 'month').endOf('month');
      const _items = calendarFilters.data.filteredItems
        .filter(item => (
          dayjs(item.date).isSameOrAfter(start, 'day') &&
          dayjs(item.date).isSameOrBefore(end, 'day')
        ))
      if (!_.isEqual(MONTH_ITEMS_FILTERED[i], _items)) {
        MONTH_ITEMS_FILTERED[i] = _items;
      }
    }

    return MONTH_ITEMS_FILTERED;
  }, [JSON.stringify(calendarFilters.data.filteredItems)]);

  const bottomTextStyles = useStyle(() => [
    styles.bottomText,
    {
      color: colors.textSecondary,
    }
  ], [colors])

  return (
    <View
      ref={ref}
      style={styles.container}
    >
      {monthItems.map((items, index) => (
        <CalendarMonth
          key={index}
          dateString={today.clone().startOf('month').subtract(monthItems.length - (index + 1), 'month').format(DATE_FORMAT)}
          items={monthItems[monthItems.length - (index + 1)]}
          filteredItems={monthItemsFiltered[monthItems.length - (index + 1)]}
          isFiltering={calendarFilters.data.isFiltering}
          scaleType={settings.scaleType}
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