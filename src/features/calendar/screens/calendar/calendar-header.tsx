import { LinearGradient } from "expo-linear-gradient";
import chroma from "chroma-js";
import { useWeekLocale } from "@/hooks/use-week-locale";
import dayjs from "dayjs";
import { useState } from "react";
import { Text, View } from "react-native";
import Animated from "react-native-reanimated";
import useColors from "@/hooks/use-colors";
import { SHADOW } from "@/constants/shadow";
import { getChromeIntroStyle, useCalendarIntro } from "../../intro";

/** The white keeps fading out this far below the weekday row. */
const HEADER_FADE_HEIGHT = 48;

const HeaderDay = ({
  children,
  name,
  index,
  isWeekend,
}: {
  children: string;
  /** Full weekday name for screen readers: one letter is ambiguous. */
  name: string;
  index: number;
  /** Saturday and Sunday read quieter than work days. */
  isWeekend: boolean;
}) => {
  const colors = useColors();
  return (
    <View
      style={{
        flex: 7,
        marginLeft: 3,
        marginRight: 3,
      }}
    >
      <Text
        testID={`calendar-weekday-${index}`}
        accessibilityLabel={name}
        style={{
          fontSize: 12,
          fontWeight: "400",
          color: isWeekend
            ? colors.calendarWeekendNameColor
            : colors.calendarWeekNameColor,
          textAlign: "center",
        }}
      >
        {children}
      </Text>
    </View>
  );
};

const WeekdayRow = () => {
  const locale = useWeekLocale();
  const introStyle = getChromeIntroStyle(useCalendarIntro());
  return (
    <Animated.View
      style={[
        {
          flexDirection: "row",
          justifyContent: "space-around",
          marginLeft: -3,
          marginRight: -3,
          paddingTop: 8,
          paddingBottom: 8,
        },
        introStyle,
      ]}
    >
      {[0, 1, 2, 3, 4, 5, 6].map((index) => {
        const day = dayjs().locale(locale).startOf("week").add(index, "day");
        return (
          <HeaderDay
            key={index}
            index={index}
            isWeekend={day.day() === 0 || day.day() === 6}
            name={day.format("dddd")}
          >
            {/* One letter: "M", "T". */}
            {day.format("dd").charAt(0)}
          </HeaderDay>
        );
      })}
    </Animated.View>
  );
};

/**
 * Weekday names above the calendar.
 *
 * Pass `floatingTop` (the header height) when the header is transparent. One
 * gradient of the calendar background then covers the top area, from the
 * screen top through the row, and fades out below it. No divider.
 * `onHeightChange` reports the row height, so the list can start below it.
 */
const CalendarHeader = ({
  floatingTop,
  onHeightChange,
}: {
  floatingTop?: number;
  onHeightChange?: (height: number) => void;
}) => {
  const colors = useColors();
  const [rowHeight, setRowHeight] = useState(0);

  if (floatingTop === undefined) {
    return (
      <View
        style={{
          width: "100%",
          paddingLeft: 16,
          paddingRight: 16,
          backgroundColor: colors.calendarBackground,
          boxShadow: SHADOW.header,
          zIndex: 3,
        }}
      >
        <WeekdayRow />
      </View>
    );
  }

  const height = floatingTop + rowHeight;

  // One gradient of the page color: from the top, through the weekday row,
  // to clear below it. One layer, so no edge where a band ends.
  const page = chroma(colors.calendarBackground);
  const background = (
    <LinearGradient
      colors={[
        page.alpha(0.98).css(),
        page.alpha(0.94).css(),
        page.alpha(0).css(),
      ]}
      locations={[0, height / (height + HEADER_FADE_HEIGHT), 1]}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: height + HEADER_FADE_HEIGHT,
      }}
    />
  );

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height,
        zIndex: 3,
      }}
    >
      {background}
      <View
        onLayout={(event) => {
          const { height: measured } = event.nativeEvent.layout;
          setRowHeight(measured);
          onHeightChange?.(measured);
        }}
        style={{
          position: "absolute",
          top: floatingTop,
          left: 0,
          right: 0,
          paddingHorizontal: 16,
        }}
      >
        <WeekdayRow />
      </View>
    </View>
  );
};

export default CalendarHeader;
