import dayjs from "dayjs";
import React, { forwardRef, memo } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import useColors from "../../hooks/useColors";
import { useLogState } from "../../hooks/useLogs";
import CalendarMonth from "./CalendarMonth";

import { useStyle } from "react-native-style-utilities";
import { DATE_FORMAT } from "../../constants/Config";
import { t } from "../../helpers/translation";

const MONTH_COUNT = 12;
const MONTH_DATES: string[] = []

for (let i = MONTH_COUNT; i >= 0; i--) {
  MONTH_DATES.push(dayjs().subtract(i, "month").format(DATE_FORMAT));
}

const Calendar = memo(forwardRef(function Calendar({ }, ref: React.RefObject<View>) {
  const colors = useColors()
  const logState = useLogState()

  const bottomTextStyles = useStyle(() => [
    styles.bottomText,
    {
      color: colors.textSecondary,
    }
  ], [colors])

  const itemMap = {}

  logState.items.forEach(item => {
    if (!itemMap[item.date]) {
      itemMap[item.date] = []
    }

    itemMap[item.date].push(item)
  })

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
          itemMap={itemMap}
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