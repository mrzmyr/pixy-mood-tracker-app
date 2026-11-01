import chroma from "chroma-js";
import dayjs from "dayjs";
import { memo, useCallback, useMemo } from "react";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useStyle } from "react-native-style-utilities";
import useColors from "@/hooks/use-colors";
import useHaptics from "@/hooks/use-haptics";
import usePressRipple from "@/hooks/use-press-ripple";
import { useToday } from "@/hooks/use-today";
import type { LogItem } from "@/features/logs";
import type { SettingsState } from "@/state/settings";
import type { LogPhoto } from "@/types";
import { getPhotoFile } from "@/features/photos";
import { getRatingLabel } from "@/lib/rating-label";
import { t } from "@/lib/translation";
import { getFormatter } from "@/lib/utils";
import { RADIUS } from "@/constants/radius";
import { startPhotoPeek, stopPhotoPeek } from "../../../photo-peek";

const DAY_LABEL_OPTIONS: Intl.DateTimeFormatOptions = {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
};

/** Peek photos fade in and out with soft timing, no spring. */
const PEEK_FADE_MS = 250;

/** Diameter of the today circle behind the day number. */
const DAY_NUMBER_SIZE = 20;

const styles = StyleSheet.create({
  container: {
    flexDirection: "column",
    justifyContent: "flex-end",
    alignItems: "center",
    padding: 4,
    borderRadius: RADIUS.sm,
    borderCurve: "continuous",
    width: "100%",
    aspectRatio: 1,
    // Clips the Android ripple and the peek photo to the rounded day.
    overflow: "hidden",
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
    // No stretch: a stretched today circle turns into an oval.
    alignItems: "center",
  },
  dayNumberParent2: {
    justifyContent: "center",
    alignItems: "center",
    minWidth: DAY_NUMBER_SIZE,
    height: DAY_NUMBER_SIZE,
    borderRadius: RADIUS.full,
  },
});

const CalendarDayComponent = ({
  dateString,
  rating,
  scaleType,
  isFiltered,
  isFiltering,
  peekPhoto,
  onPress,
}: {
  dateString: string;
  rating?: LogItem["rating"] | null;
  scaleType: SettingsState["scaleType"];
  isFiltering: boolean;
  isFiltered: boolean;
  /** Photo of the day while a photo peek runs. Replaces the pixel color. */
  peekPhoto?: LogPhoto | null;
  /** Receives `dateString`, so one stable handler can serve every day. */
  onPress: (dateString: string) => void;
}) => {
  const colors = useColors();
  const haptics = useHaptics();
  const ripple = usePressRipple({ foreground: true });

  const _isFiltered = !isFiltered && isFiltering;

  const day = useMemo(() => dayjs(dateString).date(), [dateString]);

  // Re-renders when the current day changes, not only when `dateString` does.
  const today = useToday();

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
      onPress(dateString);
    }
  }, [isFuture, onPress, dateString]);

  // Spots without a pixel start the photo peek on long press.
  const hasPixel = !!rating && !isFuture;

  const onLongPress = useCallback(() => {
    void haptics.selection();
    startPhotoPeek();
  }, [haptics]);

  const accessibilityLabel = useMemo(() => {
    const date = getFormatter("day_label_long", DAY_LABEL_OPTIONS).format(
      dayjs(dateString).toDate()
    );
    const parts = [date];
    if (rating) {
      parts.push(t("a11y_mood", { mood: getRatingLabel(rating) }));
    }
    if (isToday) {
      parts.push(t("a11y_today"));
    }
    return parts.join(", ");
  }, [dateString, rating, isToday]);

  return (
    <Pressable
      testID={`calendar-day-${dateString}`}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isFuture, selected: isToday }}
      // Future days stay pressable for the photo peek; `_onPress` ignores them.
      onPress={_onPress}
      onLongPress={hasPixel ? undefined : onLongPress}
      onPressOut={hasPixel ? undefined : stopPhotoPeek}
      android_ripple={isFuture ? undefined : ripple}
      style={containerStyles}
    >
      <View style={styles.dayNumberParent1}>
        <View style={dayNumberParent2Styles}>
          <Text style={dayNumberTextStyles}>{day}</Text>
        </View>
      </View>
      {peekPhoto ? (
        // Keyed by photo: a new peek with another photo fades again.
        <Animated.View
          key={peekPhoto.id}
          // Built at render: router suites mock reanimated without FadeIn.
          entering={FadeIn.duration(PEEK_FADE_MS)}
          exiting={FadeOut.duration(PEEK_FADE_MS)}
          style={StyleSheet.absoluteFill}
        >
          <Image
            testID={`calendar-day-photo-${dateString}`}
            source={getPhotoFile(peekPhoto).uri}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            enforceEarlyResizing
            cachePolicy="memory"
            accessibilityIgnoresInvertColors
          />
        </Animated.View>
      ) : null}
    </Pressable>
  );
};

const CalendarDay = memo(CalendarDayComponent);

export default CalendarDay;
