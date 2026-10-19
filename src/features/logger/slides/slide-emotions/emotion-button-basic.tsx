import useColors from "@/hooks/use-colors";
import useHaptics from "@/hooks/use-haptics";
import { t } from "@/lib/translation";
import type { Emotion } from "@/types";
import { Pressable, Text, useColorScheme, View } from "react-native";
import type { ViewStyle } from "react-native";

import { EmotionIndicator } from "./emotions-indicator";
import { RADIUS } from "@/constants/radius";

const DEFAULT_STYLE = {};

/**
 * Emotion button in the basic emotion grid. With `onLongPress`, a long press
 * and the "Show Meaning" accessibility action call it.
 */
export const EmotionButtonBasic = ({
  emotion,
  onPress,
  onLongPress,
  selected,
  style = DEFAULT_STYLE,
}: {
  emotion: Emotion;
  onPress: (emotion: Emotion) => void;
  onLongPress?: (emotion: Emotion) => void;
  selected: boolean;
  style?: ViewStyle;
}) => {
  const colors = useColors();
  const haptics = useHaptics();
  const colorScheme = useColorScheme();
  const unselectedBorderColor =
    colorScheme === "light" ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={emotion.label}
      accessibilityState={{ checked: selected }}
      accessibilityActions={
        onLongPress
          ? [{ name: "longpress", label: t("log_emotions_weather_meaning") }]
          : undefined
      }
      onAccessibilityAction={() => onLongPress?.(emotion)}
      onPress={() => {
        haptics.selection();
        onPress(emotion);
      }}
      onLongPress={
        onLongPress
          ? () => {
              haptics.selection();
              onLongPress(emotion);
            }
          : undefined
      }
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        ...style,
      }}
    >
      <View
        style={{
          width: "100%",
          // backgroundColor: colors.cardBackground,
          backgroundColor: colors.logCardBackground,
          borderRadius: RADIUS.sm,
          borderWidth: selected ? 2 : 1,
          borderColor: selected ? colors.tint : unselectedBorderColor,
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: selected ? 11 : 12,
          paddingRight: selected ? 13 : 14,
          paddingLeft: selected ? 13 : 14,
        }}
      >
        <EmotionIndicator emotion={emotion} />
        <Text
          style={{
            color: colors.text,
            fontWeight: "500",
            fontSize: 17,
            flex: 1,
          }}
          numberOfLines={1}
        >
          {emotion.label}
        </Text>
      </View>
    </Pressable>
  );
};
