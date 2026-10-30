import { Image } from "expo-image";
import { useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  useColorScheme,
  useWindowDimensions,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import useColors from "@/hooks/use-colors";

// Same CC0 cloud photo as the pixy.day hero. Edges only match their mirror,
// so the strip runs photo, mirror, photo and loops after two widths.
const SKY = require(`../../assets/images/onboarding/sky.webp`);
const SKY_FLIPPED = require(`../../assets/images/onboarding/sky-flipped.webp`);
const SKY_ASPECT_RATIO = 2560 / 762;

/** Drift speed in points per second at rest. */
const DRIFT_SPEED = 8;
/** Peak speed while the flow moves to the next step. */
const STEP_SPEED = 220;
const STEP_RAMP_UP_MS = 250;
const STEP_RAMP_DOWN_MS = 1600;
const SKY_FADE_MS = 600;

/**
 * Full-screen sky behind the onboarding slides and the entry summary. The
 * clouds drift slowly and speed up for a moment each time `step` changes.
 * Reduced motion keeps the sky still. Dark mode dims it to dusk, like the
 * website.
 */
export const Sky = ({
  step = 0,
  isVisible = true,
}: {
  step?: number;
  /** False fades the sky out, for the hand-off to the calendar. */
  isVisible?: boolean;
}) => {
  const { height } = useWindowDimensions();
  const scheme = useColorScheme();
  const isReducedMotion = useReducedMotion();
  const colors = useColors();

  const copyWidth = Math.ceil(height * SKY_ASPECT_RATIO);
  const period = useSharedValue(copyWidth * 2);
  const offset = useSharedValue(0);
  const speed = useSharedValue(DRIFT_SPEED);

  useEffect(() => {
    period.set(copyWidth * 2);
  }, [copyWidth, period]);

  useFrameCallback(({ timeSincePreviousFrame }) => {
    if (timeSincePreviousFrame === null) {
      return;
    }
    offset.set(
      (offset.get() + (speed.get() * timeSincePreviousFrame) / 1000) %
        period.get()
    );
  }, !isReducedMotion);

  const previousStep = useRef(step);
  useEffect(() => {
    if (previousStep.current === step) {
      return;
    }
    previousStep.current = step;
    speed.set(
      withSequence(
        withTiming(STEP_SPEED, {
          duration: STEP_RAMP_UP_MS,
          easing: Easing.in(Easing.quad),
        }),
        withTiming(DRIFT_SPEED, {
          duration: STEP_RAMP_DOWN_MS,
          easing: Easing.out(Easing.cubic),
        })
      )
    );
  }, [step, speed]);

  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.set(withTiming(isVisible ? 1 : 0, { duration: SKY_FADE_MS }));
  }, [isVisible, opacity]);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  const panStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -offset.get() }],
  }));

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: colors.onboardingSkyBackground },
        fadeStyle,
      ]}
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View
        style={[
          { flexDirection: "row", width: copyWidth * 3, height },
          panStyle,
        ]}
      >
        <Image source={SKY} style={{ width: copyWidth, height }} />
        <Image source={SKY_FLIPPED} style={{ width: copyWidth, height }} />
        <Image source={SKY} style={{ width: copyWidth, height }} />
      </Animated.View>
      {scheme === "dark" ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: "#0b1a2c",
              opacity: 0.75,
              mixBlendMode: "multiply",
            },
          ]}
        />
      ) : null}
    </Animated.View>
  );
};
