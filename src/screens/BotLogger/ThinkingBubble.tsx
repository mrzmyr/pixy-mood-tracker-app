import useColors from "@/hooks/useColors";
import { Easing, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ThinkingDots } from "./ThinkingDots";

export const ThinkingBubble = () => {
  const colors = useColors();

  return (
    <View
      style={{
        flexWrap: 'wrap',
        flexDirection: 'row',
        justifyContent: 'flex-start',
      }}
    >
      <Animated.View
        entering={FadeInDown.duration(300).easing(Easing.ease)}
        style={{
          backgroundColor: colors.chatBotMessageBackground,
          paddingVertical: 8,
          paddingHorizontal: 16,
          marginTop: 8,
          borderRadius: 16,
          minHeight: 34,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ThinkingDots />
      </Animated.View>
    </View>
  );
};
