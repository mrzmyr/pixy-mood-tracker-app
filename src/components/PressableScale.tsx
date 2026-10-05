import memoize from "lodash/memoize";
import { useState } from "react";
import { Pressable } from "react-native";
import type {
  GestureResponderEvent,
  PressableProps,
  StyleProp,
  ViewStyle,
} from "react-native";
import {
  createAnimatedComponent,
  css,
  cubicBezier,
  useReducedMotion,
} from "react-native-reanimated";

// Built on first render, never at module load: expo-router's Jest mock of
// reanimated is empty. Memoized, so every render gets the same component.
const getAnimatedPressable = memoize(() => createAnimatedComponent(Pressable));
const getStyles = memoize(() =>
  css.create({
    rest: { transform: [{ scale: 1 }] },
    transition: {
      transitionProperty: ["transform", "opacity"],
      transitionDuration: 120,
      transitionTimingFunction: cubicBezier(0.23, 1, 0.32, 1),
    },
    pressed: { transform: [{ scale: 0.97 }] },
    dimmed: { opacity: 0.7 },
  })
);

/**
 * Pressable with 0.97 scale press feedback: 120 ms, strong ease-out, on
 * press-in. A CSS transition, so it runs on the UI thread and needs no
 * shared value. Reduced motion dims instead of scaling.
 */
export const PressableScale = ({
  style,
  onPressIn,
  onPressOut,
  ...props
}: Omit<PressableProps, "style"> & { style?: StyleProp<ViewStyle> }) => {
  const [isPressed, setIsPressed] = useState(false);
  const isReducedMotion = useReducedMotion();
  const AnimatedPressable = getAnimatedPressable();
  const styles = getStyles();

  return (
    // oxlint-disable-next-line react/static-components -- memoized above, same component on every render.
    <AnimatedPressable
      pressRetentionOffset={16}
      {...props}
      onPressIn={(event: GestureResponderEvent) => {
        setIsPressed(true);
        onPressIn?.(event);
      }}
      onPressOut={(event: GestureResponderEvent) => {
        setIsPressed(false);
        onPressOut?.(event);
      }}
      style={[
        styles.rest,
        style,
        styles.transition,
        isPressed && (isReducedMotion ? styles.dimmed : styles.pressed),
      ]}
    />
  );
};
