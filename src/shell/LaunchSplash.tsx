import { useEffect, useState } from "react";
import { StyleSheet, useColorScheme } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { SunburstLogo } from "@/components/SunburstLogo";
import {
  LAUNCH_FADE_MS as FADE_MS,
  LAUNCH_REDUCED_DELAY_MS as REDUCED_DELAY_MS,
  LAUNCH_SPIN_MS as SPIN_MS,
  getLaunchSplashDuration,
} from "@/shell/launchSplashTiming";

/** Logo size in points. Matches `imageWidth` of `expo-splash-screen` in `app.json`. */
const LAUNCH_LOGO_SIZE = 96;
const LOGO_COLOR = "#F97316";
// Matches `backgroundColor` of `expo-splash-screen` in `app.json`.
const BACKGROUND = { light: "#ffffff", dark: "#171717" } as const;

/**
 * Takes over from the native splash: same logo, size, and background. Spins
 * the sunburst once, then fades out and unmounts. Reduced motion skips spin
 * and scale. Never blocks touches.
 */
export const LaunchSplash = () => {
  const scheme = useColorScheme();
  const reduceMotion = useReducedMotion();
  const [isVisible, setIsVisible] = useState(true);
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const background = scheme === "dark" ? BACKGROUND.dark : BACKGROUND.light;

  useEffect(() => {
    const fadeDelay = reduceMotion ? REDUCED_DELAY_MS : SPIN_MS - 100;
    const fade = { duration: FADE_MS, easing: Easing.in(Easing.quad) };
    if (!reduceMotion) {
      rotation.set(
        withTiming(360, {
          duration: SPIN_MS,
          easing: Easing.inOut(Easing.cubic),
        })
      );
      scale.set(withDelay(fadeDelay, withTiming(1.15, fade)));
    }
    opacity.set(withDelay(fadeDelay, withTiming(0, fade)));
    const timeout = setTimeout(
      () => setIsVisible(false),
      getLaunchSplashDuration({ reduceMotion })
    );
    return () => clearTimeout(timeout);
  }, [opacity, reduceMotion, rotation, scale]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.get()}deg` }, { scale: scale.get() }],
  }));

  if (!isVisible) {
    return null;
  }

  return (
    <Animated.View
      testID="launch-splash"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: background,
          alignItems: "center",
          justifyContent: "center",
        },
        overlayStyle,
      ]}
    >
      <Animated.View style={logoStyle}>
        <SunburstLogo
          size={LAUNCH_LOGO_SIZE}
          color={LOGO_COLOR}
          holeColor={background}
        />
      </Animated.View>
    </Animated.View>
  );
};
