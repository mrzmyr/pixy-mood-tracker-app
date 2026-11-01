import { LinearGradient } from "expo-linear-gradient";
import chroma from "chroma-js";
import { useWeekLocale } from "@/hooks/use-week-locale";
import dayjs from "dayjs";
import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import { useState } from "react";
import { StyleSheet, Text, useColorScheme, View } from "react-native";
import Animated from "react-native-reanimated";
import useColors from "@/hooks/use-colors";
import { SHADOW } from "@/constants/shadow";
import { getChromeIntroStyle, useCalendarIntro } from "../../intro";

/** The white keeps fading out this far below the weekday row. */
const HEADER_FADE_HEIGHT = 48;

/** iOS 26 system glass: a native blur behind the floating header. */
const HAS_GLASS = isGlassEffectAPIAvailable();

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
            ? chroma(colors.calendarWeekNameColor).alpha(0.5).css()
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
 * blurred band then covers the whole top area, from the screen top through
 * the row, and ends in a hairline divider. iOS 26 uses the system glass;
 * elsewhere the band is the calendar background, a little see-through.
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
  const isDark = useColorScheme() === "dark";
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

  let background: React.ReactNode;
  if (!isDark) {
    // Light mode: one white gradient from the top, through the weekday row,
    // to clear below it. One layer, so no edge where a band ends.
    background = (
      <LinearGradient
        colors={[
          "rgba(255,255,255,0.98)",
          "rgba(255,255,255,0.94)",
          "rgba(255,255,255,0)",
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
  } else if (HAS_GLASS) {
    background = (
      // Clipped: the glass casts its own shadow below the divider.
      <View style={[StyleSheet.absoluteFill, { overflow: "hidden" }]}>
        <GlassView
          glassEffectStyle="regular"
          colorScheme="dark"
          style={[StyleSheet.absoluteFill, { borderRadius: 0 }]}
        />
      </View>
    );
  } else {
    background = (
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: chroma(colors.calendarBackground)
              .alpha(0.94)
              .css(),
          },
        ]}
      />
    );
  }

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
        // Light mode: a soft white fade below replaces the hard line.
        borderBottomWidth: isDark ? StyleSheet.hairlineWidth : 0,
        borderBottomColor: colors.headerBorder,
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
