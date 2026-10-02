import chroma from "chroma-js";
import dayjs from "dayjs";
import { LinearGradient } from "expo-linear-gradient";
import { Text, View } from "react-native";
import useColors from "@/hooks/useColors";

// Height of the fade above and below the floating weekday row.
const FADE_HEIGHT = 12;

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
 * Pass `floatingTop` when the header is transparent: the row then floats at
 * that offset over the scrolling calendar, with short fades above and below
 * so months blend in instead of cutting off. `onHeightChange` reports the
 * row height, so the list can start below it.
 */
const CalendarHeader = ({
  floatingTop,
  onHeightChange,
}: {
  floatingTop?: number;
  onHeightChange?: (height: number) => void;
}) => {
  const colors = useColors();

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

  const solid = colors.calendarBackground;
  const clear = chroma(solid).alpha(0).css();

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: floatingTop - FADE_HEIGHT,
        left: 0,
        right: 0,
        zIndex: 3,
      }}
    >
      <LinearGradient colors={[clear, solid]} style={{ height: FADE_HEIGHT }} />
      <View
        onLayout={(event) => onHeightChange?.(event.nativeEvent.layout.height)}
        style={{ paddingHorizontal: 16, backgroundColor: solid }}
      >
        <WeekdayRow />
      </View>
      <LinearGradient colors={[solid, clear]} style={{ height: FADE_HEIGHT }} />
    </View>
  );
};

export default CalendarHeader;
