import { Host, Text } from "@expo/ui/swift-ui";
import {
  Animation,
  animation,
  contentTransition,
  font,
  foregroundStyle,
  frame,
  lineLimit,
} from "@expo/ui/swift-ui/modifiers";
import { useState } from "react";
import { useReducedMotion } from "react-native-reanimated";
import type { TextMorphProps } from "./text-morph.types";
import { TEXT_MORPH_DURATION_S, toSwiftWeight } from "./text-morph.types";

/**
 * Text that morphs when it changes: changed letters and digits roll out
 * and in with a blur, unchanged ones stay. Uses SwiftUI's
 * `numericText` content transition, the system effect of iOS clocks and
 * counters. Reduced motion swaps the text without animation.
 */
export const TextMorph = ({
  children,
  style,
  countsDown = false,
  testID,
}: TextMorphProps) => {
  const isReducedMotion = useReducedMotion();
  // SwiftUI animates when this value changes; it takes numbers, not text.
  const [change, setChange] = useState({ text: children, count: 0 });
  if (change.text !== children) {
    setChange({ text: children, count: change.count + 1 });
  }

  return (
    // Fixed one-line box, full width. Ignores the safe area: near the top of
    // the screen SwiftUI otherwise pushes the text below its box.
    <Host
      ignoreSafeArea="all"
      style={{ height: style.lineHeight }}
      testID={testID}
    >
      <Text
        modifiers={[
          font({
            size: style.fontSize,
            weight: toSwiftWeight(style.fontWeight),
          }),
          foregroundStyle(style.color),
          lineLimit(1),
          frame({ height: style.lineHeight }),
          // Fills the host, text at the start. Separate frame: one with a
          // fixed height ignores `maxWidth`. Not `Infinity`: the bridge sends
          // it as null.
          frame({ maxWidth: 10_000, alignment: "leading" }),
          contentTransition("numericText", { countsDown }),
          ...(isReducedMotion
            ? []
            : [
                animation(
                  Animation.smooth({ duration: TEXT_MORPH_DURATION_S }),
                  change.count
                ),
              ]),
        ]}
      >
        {children}
      </Text>
    </Host>
  );
};
