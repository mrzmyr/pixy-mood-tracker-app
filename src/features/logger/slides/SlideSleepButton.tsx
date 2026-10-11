import useColors from "@/hooks/useColors";
import type { LogItem } from "@/features/logs";
import { SLEEP_QUALITY_MAPPING } from "@/constants/Ratings";
import { Pressable, View, useColorScheme } from "react-native";
import type { ViewStyle } from "react-native";

import useHaptics from "@/hooks/useHaptics";
import { RADIUS } from "@/constants/Radius";
import { t } from "@/lib/translation";

const DEFAULT_STYLE = {};

/**
 * Sleep quality bar; also reused read-only in the entry list. Without
 * `onPress` it is not a button for screen readers.
 */
export const SlideSleepButton = ({
  value,
  selected = false,
  onPress,
  style = DEFAULT_STYLE,
}: {
  value: LogItem["sleep"]["quality"];
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}) => {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const idleBorderColor =
    colorScheme === "light" ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";
  const haptics = useHaptics();

  const _value = SLEEP_QUALITY_MAPPING[value];
  // Mapping runs 0 to 4; screen readers read 1 to 5.
  const label = `${t("logger_step_sleep")} ${_value + 1}/5`;

  const HEIGHT = 32;

  return (
    <View
      style={{
        flex: 5,
        ...style,
      }}
    >
      <Pressable
        accessible
        accessibilityRole={onPress ? "button" : undefined}
        accessibilityLabel={label}
        accessibilityState={onPress ? { selected } : undefined}
        testID={onPress ? `sleep-quality-${value}` : undefined}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.logCardBackground,
          borderColor: selected ? colors.tint : idleBorderColor,
          borderWidth: selected ? 2 : 1,
          borderRadius: RADIUS.sm,
          // Keeps the content in place when the border grows.
          paddingHorizontal: selected ? 7 : 8,
          paddingVertical: 16,
          height: HEIGHT + 32,
          margin: 4,
          aspectRatio: 1,
        }}
        onPress={() => {
          if (!onPress) {
            return;
          }
          haptics.selection();
          onPress?.();
        }}
      >
        <View
          style={{
            justifyContent: "center",
            alignItems: "center",
            height: HEIGHT,
            width: 16,
            borderRadius: RADIUS.sm,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              width: 16,
              height: HEIGHT,
              backgroundColor: colors.sleepQualityEmpty,
              position: "absolute",
              bottom: 0,
              zIndex: 1,
            }}
          />
          <View
            style={{
              width: 16,
              height: _value * 8,
              backgroundColor: colors.sleepQualityFull,
              position: "absolute",
              bottom: 0,
              zIndex: 1,
            }}
          />
        </View>
      </Pressable>
    </View>
  );
};
