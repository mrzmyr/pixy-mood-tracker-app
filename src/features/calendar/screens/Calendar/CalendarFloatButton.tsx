import React, { useEffect } from "react";
import { Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
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
 * that scrolls to the end. At the end it turns into a primary plus that adds
 * an entry. The color fades fast; the chevron morphs into the plus.
 */
export const CalendarFloatButton = ({
  isAtBottom,
  onScrollToBottom,
  onAdd,
}: {
  isAtBottom: boolean;
  onScrollToBottom: () => void;
  onAdd: () => void;
}) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const target = isAtBottom ? 1 : 0;
  const morph = useSharedValue(target);
  const color = useSharedValue(target);

  useEffect(() => {
    morph.set(withSpring(target, { damping: 16, stiffness: 220 }));
    color.set(
      withTiming(target, {
        duration: 150,
        easing: Easing.out(Easing.quad),
      })
    );
  }, [target, morph, color]);

  const backgroundStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      color.get(),
      [0, 1],
      [colors.tertiaryButtonBackground, colors.primaryButtonBackground]
    ),
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
        isAtBottom ? t("add_today_entry") : t("back_to_today")
      }
      onPress={isAtBottom ? onAdd : onScrollToBottom}
      style={({ pressed }) => ({
        position: "absolute",
        bottom: 20 + insets.bottom,
        right: 20,
        zIndex: 100,
        opacity: pressed ? 0.8 : 1,
      })}
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
