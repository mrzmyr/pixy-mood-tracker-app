import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import type { Emotion } from "@/types";
import { Pressable, Text, useColorScheme, View } from "react-native";
import type { ViewStyle } from "react-native";

import { EmotionIndicator } from "./EmotionsIndicator";
import { RADIUS } from "@/constants/Radius";
import { getSelectionStyle } from "@/constants/Selection";

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
      accessibilityState={{ selected }}
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
          backgroundColor: colors.logCardBackground,
          borderRadius: RADIUS.sm,
          borderWidth: 1,
          ...getSelectionStyle(colors, selected, unselectedBorderColor),
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 12,
          paddingHorizontal: 14,
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
