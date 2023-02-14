import useColors from "@/hooks/useColors";
import { Motion } from "@legendapp/motion";
import { Easing, View } from "react-native";
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
      <Motion.View
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
        initial={{ y: 10 }}
        animate={{ y: 0 }}
        transition={{
          type: 'timing',
          duration: 300,
          easing: Easing.ease,
        }}
      >
        <ThinkingDots />
      </Motion.View>
    </View>
  );
};
