import React, { useEffect } from "react";
import { Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";

const BAR_LENGTH = 14;
const BAR_THICKNESS = 2.5;
// Chevron arms are shorter than plus bars.
const ARM_SCALE = 10 / BAR_LENGTH;
// Arm centers sit apart so both arms meet at the chevron tip.
const ARM_OFFSET = (10 * Math.SQRT1_2) / 2;

// Each bar turns 45° counterclockwise: the left arm becomes the horizontal
// bar, the right arm the vertical bar.
const BARS = [
  { offset: -ARM_OFFSET, from: 45, to: 0 },
  { offset: ARM_OFFSET, from: -45, to: -90 },
] as const;

// Motion values follow https://emilkowal.ski/ui/great-animations.
// On-screen morph: Apple-style spring, 500 ms, bounce 0.2.
const MORPH_SPRING = { duration: 500, dampingRatio: 0.8 };
// Color change: CSS `ease`, 150 ms. Kept with reduced motion: no movement.
const COLOR_MS = 150;
// Press feedback: 0.97 scale in 120 ms, strong ease-out.
const PRESS_MS = 120;
const PRESS_SCALE = 0.97;

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    width: BAR_LENGTH,
    height: BAR_THICKNESS,
    borderRadius: BAR_THICKNESS / 2,
  },
});

const useBarStyle = (
  index: 0 | 1,
  morph: SharedValue<number>,
  color: SharedValue<number>,
  from: string,
  to: string
) =>
  useAnimatedStyle(() => {
    const bar = BARS[index];
    const p = morph.get();
    return {
      backgroundColor: interpolateColor(color.get(), [0, 1], [from, to]),
      transform: [
        { translateX: interpolate(p, [0, 1], [bar.offset, 0]) },
        { rotate: `${interpolate(p, [0, 1], [bar.from, bar.to])}deg` },
        { scaleX: interpolate(p, [0, 1], [ARM_SCALE, 1]) },
      ],
    };
  });

/**
 * Floating button of the calendar. Away from today it is a tertiary chevron
 * that scrolls to the end. At the end it turns into a plus that adds an
 * entry: primary while today has no entry, tertiary after. The color fades
 * fast; the chevron springs into the plus.
 */
export const CalendarFloatButton = ({
  isAtBottom,
  hasTodayEntry,
  onScrollToBottom,
  onAdd,
}: {
  isAtBottom: boolean;
  hasTodayEntry: boolean;
  onScrollToBottom: () => void;
  onAdd: () => void;
}) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const morphTarget = isAtBottom ? 1 : 0;
  const colorTarget = isAtBottom && !hasTodayEntry ? 1 : 0;
  const isReducedMotion = useReducedMotion();
  const morph = useSharedValue(morphTarget);
  const color = useSharedValue(colorTarget);
  const pressed = useSharedValue(0);

  // Reduced motion: chevron and plus swap without the spring.
  useEffect(() => {
    morph.set(withSpring(morphTarget, MORPH_SPRING));
  }, [morphTarget, morph]);

  useEffect(() => {
    color.set(
      withTiming(colorTarget, {
        duration: COLOR_MS,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        reduceMotion: ReduceMotion.Never,
      })
    );
  }, [colorTarget, color]);

  const setPressed = (value: 0 | 1) =>
    pressed.set(
      withTiming(value, {
        duration: PRESS_MS,
        easing: Easing.bezier(0.23, 1, 0.32, 1),
        reduceMotion: ReduceMotion.Never,
      })
    );

  // Reduced motion dims instead of scaling.
  const backgroundStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      color.get(),
      [0, 1],
      [colors.tertiaryButtonBackground, colors.primaryButtonBackground]
    ),
    opacity: isReducedMotion ? 1 - pressed.get() * 0.3 : 1,
    transform: [
      {
        scale: isReducedMotion
          ? 1
          : interpolate(pressed.get(), [0, 1], [1, PRESS_SCALE]),
      },
    ],
  }));
  const firstBar = useBarStyle(
    0,
    morph,
    color,
    colors.tertiaryButtonText,
    colors.primaryButtonText
  );
  const secondBar = useBarStyle(
    1,
    morph,
    color,
    colors.tertiaryButtonText,
    colors.primaryButtonText
  );

  return (
    <Pressable
      testID={isAtBottom ? "calendar-add-entry" : "scroll-to-bottom"}
      accessibilityRole="button"
      accessibilityLabel={
        isAtBottom
          ? t(hasTodayEntry ? "add_today_another_entry" : "add_today_entry")
          : t("back_to_today")
      }
      onPress={isAtBottom ? onAdd : onScrollToBottom}
      onPressIn={() => setPressed(1)}
      onPressOut={() => setPressed(0)}
      style={{
        position: "absolute",
        bottom: 20 + insets.bottom,
        right: 20,
        zIndex: 100,
      }}
    >
      <Animated.View
        style={[
          {
            width: 54,
            height: 54,
            borderRadius: 27,
            justifyContent: "center",
            alignItems: "center",
          },
          backgroundStyle,
        ]}
      >
        <Animated.View style={[styles.bar, firstBar]} />
        <Animated.View style={[styles.bar, secondBar]} />
      </Animated.View>
    </Pressable>
  );
};
