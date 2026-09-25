import useColors from "@/hooks/useColors";
import type { LogItem } from "@/hooks/useLogs";
import { SLEEP_QUALITY_MAPPING } from "@/constants/Ratings";
import type { ViewStyle } from "react-native";
import { Pressable, View, useColorScheme } from "react-native";
import useHaptics from "@/hooks/useHaptics";

const DEFAULT_STYLE = {};

/** Sleep quality bar; also reused read-only in the entry list. */
export const SlideSleepButton = ({
  value,
  onPress,
  style = DEFAULT_STYLE,
}: {
  value: LogItem["sleep"]["quality"];
  onPress?: () => void;
  style?: ViewStyle;
}) => {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const borderColor =
    colorScheme === "light" ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";
  const haptics = useHaptics();

  const _value = SLEEP_QUALITY_MAPPING[value];

  const HEIGHT = 32;

  return (
    <View
      style={{
        flex: 5,
        ...style,
      }}
    >
      <Pressable
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.logCardBackground,
          borderColor,
          borderWidth: 1,
          borderRadius: 8,
          paddingHorizontal: 8,
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
            borderRadius: 8,
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
