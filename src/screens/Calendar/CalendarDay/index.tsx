import chroma from "chroma-js";
import dayjs from "dayjs";
import { memo, useCallback, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useStyle } from "react-native-style-utilities";
import { DATE_FORMAT } from "@/constants/Config";
import useColors from "../../../hooks/useColors";
import useHaptics from "../../../hooks/useHaptics";
import { LogItem } from "../../../hooks/useLogs";
import { useSettings } from "../../../hooks/useSettings";

const CalendarDay = memo(function CalendarDay({
  dateString,
  rating,
  isFiltered,
  isFiltering,
  onPress,
}: {
  dateString: string,
  rating?: LogItem["rating"] | null,
  isFiltering: boolean,
  isFiltered: boolean,
  onPress: () => void,
}) {
  const { settings: { scaleType } } = useSettings()
  const colors = useColors();
  const haptics = useHaptics();

  const _isFiltered = (!isFiltered && isFiltering)

  const day = useMemo(() => dayjs(dateString).date(), [dateString]);

  const isFuture = useMemo(() => {
    return dayjs(dateString).isAfter(dayjs(), 'day');
  }, [dateString, dayjs().format(DATE_FORMAT)]);

  const isToday = useMemo(() => {
    return dayjs(dateString).isSame(dayjs(), 'day');
  }, [dateString, dayjs().format(DATE_FORMAT)]);

  const backgroundColor = useMemo(() => (
    isFuture || _isFiltered || (!rating && isFiltering) ?
      colors.calendarItemBackgroundFuture :
      (
        _isFiltered ? (
          colors.calendarBackground
        ) : (
          rating ?
            colors.scales[scaleType][rating].background :
            colors.scales[scaleType].empty.background
        )
      )
  ), [colors, isFuture, _isFiltered, isFiltering, rating, scaleType]);

  const containerStyles = useStyle(() => [
    styles.container,
    {
      backgroundColor: backgroundColor,
      borderWidth: rating === null && !isFuture ? 2 : 0,
      borderStyle: !isFuture && !rating && !isFiltering ? 'dotted' : 'solid',
      borderColor: (!isFiltering && !rating) ? colors.scales[scaleType].empty.border : 'transparent',
    }
  ], [rating, isFuture, isFiltering, scaleType, backgroundColor, colors])

  const textColor = useMemo(() => (
    _isFiltered ? (
      colors.text
    ) : (
      rating ?
        colors.scales[scaleType][rating].textSecondary :
        colors.scales[scaleType].empty.text
    )
  ), [rating, scaleType, colors])

  const dayNumberBackgroundColor = useMemo(() => (
    isToday ?
      (chroma(backgroundColor).luminance() < 0.5 ?
        'rgba(255,255,255,0.7)' :
        'rgba(0,0,0,0.5)'
      ) : 'transparent'
  ), [isToday, backgroundColor])

  const dayNumberParent2Styles = useStyle(() => [
    styles.dayNumberParent2,
    {
      backgroundColor: dayNumberBackgroundColor,
    }
  ], [dayNumberBackgroundColor])

  const dayNumberTextStyles = useStyle(() => [
    {
      fontSize: 12,
      opacity: !isToday && (isFuture || _isFiltered || (!rating && isFiltering)) ? 0.3 : 1,
      color: (
        _isFiltered && !isToday ?
          colors.text
          : (
            isToday ?
              (
                chroma(backgroundColor).luminance() < 0.5 ?
                  'black' :
                  'white'
              ) :
              textColor
          )
      )
    }
  ], [isToday, isFuture, _isFiltered, isFiltering, rating, backgroundColor, textColor])

  const _onPress = useCallback(() => {
    if (!isFuture) {
      haptics.selection()
      onPress()
    }
  }, [dateString, isFuture, onPress])

  return (
    <Pressable
      disabled={isFuture}
      onPress={_onPress}
      style={containerStyles}
    >
      <View style={styles.dayNumberParent1}>
        <View style={dayNumberParent2Styles}>
          <Text style={dayNumberTextStyles}>{day}</Text>
        </View>
      </View>
    </Pressable>
  );
})

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 4,
    borderRadius: 8,
    width: '100%',
    aspectRatio: 1,
  },
  textIndicatorParent2: {
    width: '30%',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  dayNumberParent1: {
    width: '100%',
    height: '50%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  dayNumberParent2: {
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 20,
    borderRadius: 100,
  }
});

export default CalendarDay;