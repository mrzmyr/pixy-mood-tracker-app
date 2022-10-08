import dayjs from "dayjs";
import _ from "lodash";
import React, { forwardRef, useMemo } from "react";
import { Platform, Text, View } from "react-native";
import useColors from "../hooks/useColors";
import { useLogs } from "../hooks/useLogs";
import { useSettings } from "../hooks/useSettings";
import CalendarMonth from "./CalendarMonth";

export const Calendar = forwardRef(({}, ref: React.RefObject<View>) => {
  const colors = useColors()
  const { state } = useLogs()
  const today = dayjs();
  const { settings } = useSettings()

  const months = [];
  for (let i = -12; i <= 0; i++) {
    const month = today.clone().add(i, 'month').startOf('month');
    months.push({
      dateString: month.format('YYYY-MM-DD'),
      items: useMemo(() => Object.keys(state.items)
        .filter(dateString => dayjs(dateString).isSame(month, 'month'))
        .map(dateString => state.items[dateString]), 
        [
          JSON.stringify(
            Object.keys(state.items)
              .filter(dateString => dayjs(dateString).isSame(month, 'month'))
              .map(dateString => _.omit(state.items[dateString], 'tags'))
          )
        ])
    });
  }

  return (
    <View
      ref={ref}
      style={{
        paddingBottom: 40,
      }}
    >
      {months.map(({ dateString, items }) => (
        <CalendarMonth 
          scaleType={settings.scaleType}
          key={dateString} 
          dateString={dateString}
          items={items} 
        />
      ))}
      <Text
        style={{
          paddingTop: 80,
          paddingBottom: Platform.OS === 'ios' ? 0 : 40,
          marginBottom: -80,
          textAlign: 'center',
          fontSize: 15,
          color: colors.textSecondary,
        }}
      >🙏 The future will be great.</Text>
    </View>
  )
})
