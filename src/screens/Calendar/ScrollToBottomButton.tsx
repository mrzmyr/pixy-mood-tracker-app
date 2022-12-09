import React from "react";
import { ChevronDown } from "react-native-feather";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { FloatButton } from "@/components/FloatButton";
import useColors from "../../hooks/useColors";

export const ScrollToBottomButton = ({ onPress }: { onPress: () => void; }) => {
  const colors = useColors();

  return (
    <Animated.View
      style={{
        position: "absolute",
        bottom: 20,
        right: 20,
        zIndex: 100,
      }}
      entering={FadeIn}
      exiting={FadeOut}
    >
      <FloatButton onPress={onPress}>
        <ChevronDown color={colors.palette.white} width={22} />
      </FloatButton>
    </Animated.View>
  );
};
