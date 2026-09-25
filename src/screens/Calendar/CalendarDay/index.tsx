import chroma from "chroma-js";
import dayjs from "dayjs";
import { memo, useCallback, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useStyle } from "react-native-style-utilities";
import { DATE_FORMAT } from "@/constants/Config";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import type { LogItem } from "@/hooks/useLogs";
import { useSettings } from "@/hooks/useSettings";

const styles = StyleSheet.create({
  container: {
    flexDirection: "column",
    justifyContent: "flex-end",
    alignItems: "center",
    padding: 4,
    borderRadius: 8,
    width: "100%",
    aspectRatio: 1,
  },
  textIndicatorParent2: {
    width: "30%",
    justifyContent: "flex-start",
    alignItems: "center",
  },
  dayNumberParent1: {
    width: "100%",
    height: "50%",
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  dayNumberParent2: {
    justifyContent: "center",
    alignItems: "center",
    minWidth: 20,
    borderRadius: 100,
  },
});

const CalendarDayComponent = ({
  dateString,
  rating,
  isFiltered,
  isFiltering,
  onPress,
}: {
  dateString: string;
  rating?: LogItem["rating"] | null;
  isFiltering: boolean;
  isFiltered: boolean;
  onPress: () => void;
}) => {
  const {
    settings: { scaleType },
  } = useSettings();
  const colors = useColors();
  const haptics = useHaptics();

  const _isFiltered = !isFiltered && isFiltering;

  const day = useMemo(() => dayjs(dateString).date(), [dateString]);

  // Recompute when the current day changes, not only when `dateString` does.
  const today = dayjs().format(DATE_FORMAT);

  const isFuture = useMemo(
    () => dayjs(dateString).isAfter(today, "day"),
    [dateString, today]
  );

  const isToday = useMemo(
    () => dayjs(dateString).isSame(today, "day"),
    [dateString, today]
  );

  const backgroundColor = useMemo(() => {
    if (isFuture || _isFiltered || (!rating && isFiltering)) {
      return colors.calendarItemBackgroundFuture;
    }
    if (_isFiltered) {
      return colors.calendarBackground;
    }
    return rating
      ? colors.scales[scaleType][rating].background
      : colors.scales[scaleType].empty.background;
  }, [colors, isFuture, _isFiltered, isFiltering, rating, scaleType]);

  const containerStyles = useStyle(
    () => [
      styles.container,
      {
        backgroundColor,
        borderWidth: rating === null && !isFuture ? 2 : 0,
        borderStyle: !isFuture && !rating && !isFiltering ? "dotted" : "solid",
        borderColor:
          !isFiltering && !rating
            ? colors.scales[scaleType].empty.border
            : "transparent",
      },
    ],
    [rating, isFuture, isFiltering, scaleType, backgroundColor, colors]
  );

  const textColor = useMemo(() => {
    if (_isFiltered) {
      return colors.text;
    }
    return rating
      ? colors.scales[scaleType][rating].textSecondary
      : colors.scales[scaleType].empty.text;
  }, [_isFiltered, rating, scaleType, colors]);

  const dayNumberBackgroundColor = useMemo(() => {
    if (!isToday) {
      return "transparent";
    }
    return chroma(backgroundColor).luminance() < 0.5
      ? "rgba(255,255,255,0.7)"
      : "rgba(0,0,0,0.5)";
  }, [isToday, backgroundColor]);

  const dayNumberParent2Styles = useStyle(
    () => [
      styles.dayNumberParent2,
      {
        backgroundColor: dayNumberBackgroundColor,
      },
    ],
    [dayNumberBackgroundColor]
  );

  const dayNumberTextStyles = useStyle(() => {
    let color = textColor;
    if (isToday) {
      color = chroma(backgroundColor).luminance() < 0.5 ? "black" : "white";
    } else if (_isFiltered) {
      color = colors.text;
    }

    return [
      {
        fontSize: 12,
        opacity:
          !isToday && (isFuture || _isFiltered || (!rating && isFiltering))
            ? 0.3
            : 1,
        color,
      },
    ];
  }, [
    isToday,
    isFuture,
    _isFiltered,
    isFiltering,
    rating,
    backgroundColor,
    textColor,
  ]);

  const _onPress = useCallback(() => {
    if (!isFuture) {
      haptics.selection();
      onPress();
    }
  }, [haptics, isFuture, onPress]);

  return (
    <Pressable
      testID={`calendar-day-${dateString}`}
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
};

const CalendarDay = memo(CalendarDayComponent);

export default CalendarDay;
