import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, useColorScheme } from "react-native";
import Animated, {
  FadeOut,
  Keyframe,
  useReducedMotion,
} from "react-native-reanimated";
import type { CSSAnimationKeyframes } from "react-native-reanimated";
import { RATING_KEYS } from "@/constants/Ratings";
import { useAppData } from "@/features/datagate";
import useColors from "@/hooks/useColors";
import { useSettings } from "@/state/settings";

const SIZE = 48;
const RADIUS = 14;

/** Time each color stays before the next blink. */
const STEP_MS = 360;

/** The standby stays at least this long, so a fast load does not flash. */
export const LAUNCH_MIN_VISIBLE_MS = 600;

const SHRINK_MS = 280;
const FADE_DELAY_MS = 140;
const FADE_MS = 200;

// Same as the native splash in app.json, so the hand-off has no jump.
const SPLASH_BACKGROUND = { light: "#ffffff", dark: "#171717" };

/** One keyframe per color, held until the next: a blink, not a blend. */
const createColorSteps = (palette: string[]): CSSAnimationKeyframes =>
  Object.fromEntries(
    palette.map((color, index) => [
      `${(index / palette.length) * 100}%`,
      { backgroundColor: color },
    ])
  );

// Short dip on every color change.
const DIP: CSSAnimationKeyframes = {
  "0%": { opacity: 0.55 },
  "30%": { opacity: 1 },
  "100%": { opacity: 1 },
};

// Built on call: some Jest suites load this through an empty reanimated mock.
const createShrink = () =>
  new Keyframe({
    0: { transform: [{ scale: 1 }] },
    100: { transform: [{ scale: 0 }] },
  }).duration(SHRINK_MS);

/**
 * Takes over from the native splash: same background. A rounded square
 * blinks through the user's mood scale, hardest day to best, while stored
 * data loads. Once every gated store is ready, or failed, the square
 * shrinks away and the background fades out. Reduced motion skips the
 * blink and the shrink. Never blocks touches; hidden from screen readers.
 */
export const LaunchSplash = () => {
  const colors = useColors();
  const scheme = useColorScheme();
  const { settings } = useSettings();
  const isLoading = useAppData().load.status === "loading";
  const isReducedMotion = useReducedMotion();
  const mountedAt = useRef(0);
  const [isDone, setIsDone] = useState(false);

  const moodScale = colors.scales[settings.scaleType];
  // RATING_KEYS runs best to worst; the standby climbs the other way.
  const { palette, colorSteps } = useMemo(() => {
    const steps = [...RATING_KEYS]
      .reverse()
      .map((key) => moodScale[key].background);
    return { palette: steps, colorSteps: createColorSteps(steps) };
  }, [moodScale]);
  const shrink = useMemo(
    () => (isReducedMotion ? FadeOut.duration(FADE_MS) : createShrink()),
    [isReducedMotion]
  );

  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  useEffect(() => {
    if (isLoading || isDone) {
      return;
    }
    // Unmounting plays the exit animations. A timer keeps a fast load from flashing.
    const wait = Math.max(
      0,
      LAUNCH_MIN_VISIBLE_MS - (Date.now() - mountedAt.current)
    );
    const timer = setTimeout(() => setIsDone(true), wait);
    return () => clearTimeout(timer);
  }, [isLoading, isDone]);

  if (isDone) {
    return null;
  }

  return (
    <Animated.View
      testID="launch-splash"
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      exiting={FadeOut.delay(isReducedMotion ? 0 : FADE_DELAY_MS).duration(
        FADE_MS
      )}
      style={[
        StyleSheet.absoluteFill,
        {
          alignItems: "center",
          justifyContent: "center",
          backgroundColor:
            scheme === "dark"
              ? SPLASH_BACKGROUND.dark
              : SPLASH_BACKGROUND.light,
        },
      ]}
    >
      <Animated.View
        exiting={shrink}
        style={{
          width: SIZE,
          height: SIZE,
          borderRadius: RADIUS,
          backgroundColor: palette[0],
          ...(isReducedMotion
            ? null
            : {
                animationName: [colorSteps, DIP],
                animationDuration: [palette.length * STEP_MS, STEP_MS],
                animationTimingFunction: ["step-end", "ease-out"],
                animationIterationCount: "infinite",
              }),
        }}
      />
    </Animated.View>
  );
};
