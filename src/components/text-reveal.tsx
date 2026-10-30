import { StyleSheet, Text, View } from "react-native";
import type { StyleProp, TextProps, TextStyle, ViewStyle } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";

import {
  TEXT_REVEAL_DURATION_MS,
  TEXT_REVEAL_STAGGER_MS,
  getTextRevealWords,
} from "./text-reveal-parts";
import type { TextRevealUnit } from "./text-reveal-parts";

const DEFAULT_FONT_SIZE = 17;

const styles = StyleSheet.create({
  lines: { flexDirection: "row", flexWrap: "wrap" },
  word: { flexDirection: "row" },
});

const JUSTIFY = {
  auto: "flex-start",
  left: "flex-start",
  justify: "flex-start",
  center: "center",
  right: "flex-end",
} as const;

/**
 * Text that writes itself in reading order: each letter (or word) fades in,
 * rises a little, and grows to full size. Chain lines with `delay` and
 * `getTextRevealDuration`. Reduced motion shows plain text.
 */
export const TextReveal = ({
  children,
  style,
  containerStyle,
  by = "char",
  delay = 0,
  accessibilityRole = "text",
  testID,
}: {
  children: string;
  /** Text style for every letter. Set `textAlign` here to align lines. */
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  by?: TextRevealUnit;
  delay?: number;
  accessibilityRole?: TextProps["accessibilityRole"];
  testID?: string;
}) => {
  const isReducedMotion = useReducedMotion();

  if (isReducedMotion) {
    return (
      <View style={containerStyle}>
        <Text
          testID={testID}
          accessibilityRole={accessibilityRole}
          style={style}
        >
          {children}
        </Text>
      </View>
    );
  }

  const flat = StyleSheet.flatten(style) ?? {};
  const fontSize = flat.fontSize ?? DEFAULT_FONT_SIZE;
  const keyframes = {
    from: {
      opacity: 0,
      transform: [{ translateY: fontSize * 0.2 }, { scale: 0.9 }],
    },
    to: {
      opacity: 1,
      transform: [{ translateY: 0 }, { scale: 1 }],
    },
  };

  return (
    <View
      // New text plays again from the start.
      key={children}
      testID={testID}
      accessible
      accessibilityRole={accessibilityRole}
      accessibilityLabel={children}
      style={[
        styles.lines,
        { justifyContent: JUSTIFY[flat.textAlign ?? "auto"] },
        containerStyle,
      ]}
    >
      {getTextRevealWords(children, by).map((word, wordIndex) => (
        <View
          key={wordIndex}
          style={styles.word}
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        >
          {word.parts.map((part) => (
            <Animated.Text
              key={part.order}
              style={[
                style,
                {
                  animationName: keyframes,
                  animationDuration: TEXT_REVEAL_DURATION_MS,
                  animationDelay: delay + part.order * TEXT_REVEAL_STAGGER_MS,
                  animationFillMode: "backwards",
                  animationTimingFunction: "ease-out",
                },
              ]}
            >
              {part.text}
            </Animated.Text>
          ))}
          <Text style={style}> </Text>
        </View>
      ))}
    </View>
  );
};
