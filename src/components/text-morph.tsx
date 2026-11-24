import { Text } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import type { TextMorphProps } from "./text-morph.types";
import { TEXT_MORPH_DURATION_S } from "./text-morph.types";

/**
 * Android and web: the new text fades in. iOS morphs letter by letter, see
 * `text-morph.ios.tsx`.
 */
export const TextMorph = ({ children, style, testID }: TextMorphProps) => {
  const isReducedMotion = useReducedMotion();

  return (
    <Animated.View
      key={children}
      entering={
        isReducedMotion
          ? undefined
          : FadeIn.duration(TEXT_MORPH_DURATION_S * 1000)
      }
    >
      <Text testID={testID} numberOfLines={1} style={style}>
        {children}
      </Text>
    </Animated.View>
  );
};
