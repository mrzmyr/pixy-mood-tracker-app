import dayjs from "dayjs";
import { memo, useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { DATE_FORMAT } from "@/constants/Config";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import type { LogItem } from "@/features/logs";
import { useSetting } from "@/state/settings";

const styles = StyleSheet.create({
  container: {
    width: "100%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dayNumber: {
    minWidth: 30,
    height: 30,
    paddingHorizontal: 4,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  bar: {
    width: "80%",
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    flexDirection: "row",
  },
  segment: {
    flex: 1,
  },
});

/**
 * Calendar day for the "All Moods" view: day number above a bar with one
 * segment per entry, in the order the entries happened.
 */
const AllMoodsDayComponent = ({
  dateString,
  segments,
  isFiltered,
  isFiltering,
  onPress,
}: {
  dateString: string;
  segments: Pick<LogItem, "id" | "rating">[];
  isFiltering: boolean;
  isFiltered: boolean;
  onPress: () => void;
}) => {
  const scaleType = useSetting("scaleType");
  const colors = useColors();
  const haptics = useHaptics();

  const today = dayjs().format(DATE_FORMAT);
  const isFuture = dayjs(dateString).isAfter(today, "day");
  const isToday = dateString === today;
  const isDimmed = isFuture || (isFiltering && !isFiltered);

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
      style={[styles.container, { opacity: isDimmed ? 0.3 : 1 }]}
    >
      <View
        style={[styles.dayNumber, isToday && { backgroundColor: colors.text }]}
      >
        <Text
          style={{
            fontSize: 17,
            fontWeight: "600",
            fontVariant: ["tabular-nums"],
            color: isToday ? colors.background : colors.text,
          }}
        >
          {dayjs(dateString).date()}
        </Text>
      </View>
      <View
        testID={`calendar-day-bar-${dateString}`}
        style={[
          styles.bar,
          segments.length === 0 && {
            backgroundColor: isFuture
              ? "transparent"
              : colors.scales[scaleType].empty.background,
          },
        ]}
      >
        {segments.map(({ id, rating }) => (
          <View
            key={id}
            style={[
              styles.segment,
              { backgroundColor: colors.scales[scaleType][rating].background },
            ]}
          />
        ))}
      </View>
    </Pressable>
  );
};

const AllMoodsDay = memo(AllMoodsDayComponent);

export default AllMoodsDay;
