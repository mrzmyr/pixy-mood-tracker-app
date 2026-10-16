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
/** Corner radius at rest. Matches `assets/images/splash-standby.png`. */
const RADIUS = 14;
/** Corner radius halfway through a turn: rounder, not a circle. */
const TURN_RADIUS = 20;

/** One step: the square rests, then turns 90° into the next color. */
const STEP_MS = 520;
/** Part of each step the square rests before it turns. */
const REST = 0.35;

/** The standby stays this long at least, so every launch shows two turns. */
export const LAUNCH_MIN_VISIBLE_MS = 2 * STEP_MS;

const SHRINK_MS = 320;
const FADE_DELAY_MS = 180;
const FADE_MS = 200;

// Same as the native splash in app.json, so the hand-off has no jump: the
// square starts in the color and size of `assets/images/splash-standby.png`.
const SPLASH_BACKGROUND = { light: "#ffffff", dark: "#171717" };
const SPLASH_SQUARE = "#fdba74";

const SKIPPED = new Set<(typeof RATING_KEYS)[number]>([
  "extremely_bad",
  "neutral",
]);

const percent = (step: number, steps: number) => `${(step / steps) * 100}%`;

/**
 * Three loops of the same length, one per property, so each eases on its
 * own: the turn, the corner morph, and the color. Per step the square rests
 * in one color, then turns 90° while its corners round out and back and the
 * color moves to the next one. A square looks the same every 90°, so the
 * loop has no visible seam.
 */
const createLoop = (palette: string[]) => {
  const steps = palette.length;
  const turn: CSSAnimationKeyframes = {};
  const morph: CSSAnimationKeyframes = {};
  const color: CSSAnimationKeyframes = {};

  for (let step = 0; step < steps; step += 1) {
    const start = percent(step, steps);
    const rest = percent(step + REST, steps);
    const middle = percent(step + (1 + REST) / 2, steps);
    const rotate = `${step * 90}deg`;

    turn[start] = { transform: [{ rotate }] };
    turn[rest] = { transform: [{ rotate }] };
    morph[start] = { borderRadius: RADIUS };
    morph[rest] = { borderRadius: RADIUS };
    morph[middle] = { borderRadius: TURN_RADIUS };
    color[start] = { backgroundColor: palette[step] };
    color[rest] = { backgroundColor: palette[step] };
  }
  turn["100%"] = { transform: [{ rotate: `${steps * 90}deg` }] };
  morph["100%"] = { borderRadius: RADIUS };
  color["100%"] = { backgroundColor: palette[0] };

  return [turn, morph, color];
};

// Built on call: some Jest suites load this through an empty reanimated mock.
// The square makes one last quarter turn while it shrinks away.
const createShrink = () =>
  new Keyframe({
    0: { transform: [{ rotate: "0deg" }, { scale: 1 }] },
    100: { transform: [{ rotate: "90deg" }, { scale: 0 }] },
  }).duration(SHRINK_MS);

/**
 * Takes over from the native splash: same background, same square. While
 * stored data loads, the square turns, rounds its corners, and walks the
 * user's mood scale, worst to best. Once every gated store is ready, or
 * failed, it spins smaller and the background fades out. Reduced motion
 * keeps a still square and only fades. Never blocks touches; hidden from
 * screen readers.
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
  // First color is the native splash square. Then the user's scale, worst to
  // best. Skips red (a launch should not flash red) and the neutral gray
  // (gray on white reads as disabled).
  const loop = useMemo(() => {
    const palette = [SPLASH_SQUARE];
    for (const key of [...RATING_KEYS].reverse()) {
      const color = moodScale[key].background;
      if (!SKIPPED.has(key) && color !== palette.at(-1)) {
        palette.push(color);
      }
    }
    return {
      keyframes: createLoop(palette),
      duration: palette.length * STEP_MS,
    };
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
          backgroundColor: SPLASH_SQUARE,
          ...(isReducedMotion
            ? null
            : {
                animationName: loop.keyframes,
                animationDuration: loop.duration,
                animationTimingFunction: "ease-in-out",
                animationIterationCount: "infinite",
              }),
        }}
      />
    </Animated.View>
  );
};
