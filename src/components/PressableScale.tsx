import memoize from "lodash/memoize";
import { useState } from "react";
import { Platform, Pressable } from "react-native";
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
import usePressRipple from "@/hooks/usePressRipple";

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
    clip: { overflow: "hidden" },
  })
);

/**
 * Pressable with 0.97 scale press feedback: 120 ms, strong ease-out, on
 * press-in. A CSS transition, so it runs on the UI thread and needs no
 * shared value. Reduced motion dims instead of scaling. Android shows a
 * clipped ripple instead of the scale.
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
  const ripple = usePressRipple({ foreground: true });
  const isAndroid = Platform.OS === "android";

  return (
    // oxlint-disable-next-line react/static-components -- memoized above, same component on every render.
    <AnimatedPressable
      pressRetentionOffset={16}
      android_ripple={ripple}
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
        isAndroid && styles.clip,
        isPressed &&
          !isAndroid &&
          (isReducedMotion ? styles.dimmed : styles.pressed),
      ]}
    />
  );
};
