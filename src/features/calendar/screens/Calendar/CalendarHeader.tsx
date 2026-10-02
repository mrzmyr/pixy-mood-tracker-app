import chroma from "chroma-js";
import dayjs from "dayjs";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import useColors from "@/hooks/useColors";

// Height of the fade below the floating weekday row.
const FADE_HEIGHT = 24;

const HeaderDay = ({ children }: { children: string }) => {
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
        style={{
          fontSize: 12,
          fontWeight: "bold",
          color: colors.calendarWeekNameColor,
          textAlign: "center",
        }}
      >
        {children}
      </Text>
    </View>
  );
};

const WeekdayRow = () => (
  <View
    style={{
      flexDirection: "row",
      justifyContent: "space-around",
      marginLeft: -3,
      marginRight: -3,
      paddingTop: 8,
      paddingBottom: 8,
    }}
  >
    {[0, 1, 2, 3, 4, 5, 6].map((offset) => (
      <HeaderDay key={offset}>
        {dayjs().startOf("week").add(offset, "day").format("ddd")}
      </HeaderDay>
    ))}
  </View>
);

/**
 * Weekday names above the calendar.
 *
 * Pass `floatingTop` (the header height) when the header is transparent. One
 * gradient then covers the whole top area, from the screen top through the
 * row, and fades out below it. Months scrolling under the buttons and the row
 * stay continuous and only grow fainter; an opaque row band would hide the
 * rows under it and leave cut-off content above it. `onHeightChange` reports
 * the row height, so the list can start below it.
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

          shadowColor: "rgba(0, 0, 0, 0.6)",
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowRadius: 1,
          shadowOpacity: 0.2,
          elevation: 3,
          zIndex: 3,
        }}
      >
        <WeekdayRow />
      </View>
    );
  }

  const background = chroma(colors.calendarBackground);
  const height = floatingTop + rowHeight + FADE_HEIGHT;

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
      <LinearGradient
        colors={[
          background.alpha(0.85).css(),
          background.alpha(0.9).css(),
          background.alpha(0.95).css(),
          background.alpha(0).css(),
        ]}
        locations={[
          0,
          floatingTop / height,
          (floatingTop + rowHeight) / height,
          1,
        ]}
        style={StyleSheet.absoluteFill}
      />
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
