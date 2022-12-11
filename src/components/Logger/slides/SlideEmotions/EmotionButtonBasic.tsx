import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import useScale from "@/hooks/useScale";
import { Emotion } from "@/types";
import { Pressable, Text, useColorScheme, View, ViewStyle } from "react-native";
import { EMOTION_BUTTON_HEIGHT } from "./constants";

export const EmotionButtonBasic = ({
  emotion, onPress, selected, style = {},
}: {
  emotion: Emotion;
  onPress: (emotion: Emotion) => void;
  selected: boolean;
  style?: ViewStyle;
}) => {
  const colors = useColors();
  const haptics = useHaptics();

  const scale = useScale();
  const colorMapping = {
    very_good: scale.colors.good,
    good: scale.colors.good,
    neutral: scale.colors.neutral,
    bad: scale.colors.bad,
    very_bad: scale.colors.bad,
  };

  const color = colorMapping[emotion.category];
  const colorScheme = useColorScheme();

  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onPress(emotion);
      }}
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        ...style,
      }}
    >
      <View
        style={{
          width: '100%',
          // backgroundColor: colors.cardBackground,
          backgroundColor: colors.logCardBackground,
          borderRadius: 12,
          borderWidth: selected ? 2 : 1,
          borderColor: selected ? colors.tint : colorScheme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)',
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: selected ? 7 : 8,
          paddingRight: selected ? 11 : 12,
          paddingLeft: selected ? 11 : 12,
        }}
      >
        <View
          style={{
            width: 4,
            height: '100%',
            backgroundColor: color.background,
            borderColor: colorScheme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)',
            borderWidth: 1,
            borderRadius: 4,
            marginRight: 10,
            paddingRight: 8,
          }}
        />
        <Text
          style={{
            color: colors.text,
            fontWeight: '500',
            fontSize: 17,
            paddingVertical: 6,
          }}
          numberOfLines={1}
        >
          {emotion.label}
        </Text>
      </View>
    </Pressable>
  );
};
