import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import type { Emotion } from "@/types";
import { Pressable, Text, useColorScheme, View } from "react-native";
import type { ViewStyle } from "react-native";

import { EmotionIndicator } from "./EmotionsIndicator";
import { RADIUS } from "@/constants/Radius";

const DEFAULT_STYLE = {};

/** Emotion button in the basic emotion grid. */
export const EmotionButtonBasic = ({
  emotion,
  onPress,
  selected,
  style = DEFAULT_STYLE,
}: {
  emotion: Emotion;
  onPress: (emotion: Emotion) => void;
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
      onPress={() => {
        haptics.selection();
        onPress(emotion);
      }}
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
