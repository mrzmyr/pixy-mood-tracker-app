import { Image } from "expo-image";
import { useEffect } from "react";
import { StyleSheet, useColorScheme, useWindowDimensions } from "react-native";
import Animated, {
  useAnimatedStyle,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import useColors from "@/hooks/use-colors";
import { NightStars } from "./night-stars";

// Same CC0 cloud photo as the pixy.day hero. Edges only match their mirror,
// so the strip runs photo, mirror, photo and loops after two widths.
const SKY = require(`../../assets/images/onboarding/sky.webp`);
const SKY_FLIPPED = require(`../../assets/images/onboarding/sky-flipped.webp`);
const SKY_ASPECT_RATIO = 2560 / 762;

/** Drift speed in points per second at rest. */
export const SKY_DRIFT_SPEED = 8;
const SKY_FADE_MS = 600;
/** Night: the clouds show only faintly against the dark sky. */
const NIGHT_CLOUD_OPACITY = 0.07;

/** Last drift offset per `resumeKey`, so a sky that mounts again resumes. */
const lastOffsets = new Map<string, number>();

/**
 * Sky with drifting clouds: full screen behind onboarding and voice mode,
 * or inside a card with a smaller `height`.
 * `speed` is the drift in points per second; the owner animates it. Reduced
 * motion keeps the sky still. Light mode: day sky with a drifting cloud photo.
 * Dark mode: deep navy night sky, faint clouds, subtle twinkling stars. Never
 * a dimmed day sky. Shows behind onboarding, voice mode, and the entry
 * summary hero without photos or place.
 */
export const Sky = ({
  speed,
  isVisible = true,
  height: skyHeight,
  resumeKey,
}: {
  speed: SharedValue<number>;
  /** False fades the sky out. */
  isVisible?: boolean;
  /** Height of the cloud photo. Default: the window, for full screens. */
  height?: number;
  /**
   * Skies with the same key continue where the last one stopped, so two
   * screens in a row show one sky instead of a jump.
   */
  resumeKey?: string;
}) => {
  const { height: windowHeight } = useWindowDimensions();
  const height = skyHeight ?? windowHeight;
  const scheme = useColorScheme();
  const isReducedMotion = useReducedMotion();
  const colors = useColors();

  const copyWidth = Math.ceil(height * SKY_ASPECT_RATIO);
  const period = useSharedValue(copyWidth * 2);
  const offset = useSharedValue(
    resumeKey === undefined ? 0 : (lastOffsets.get(resumeKey) ?? 0)
  );
  useEffect(
    () => () => {
      if (resumeKey !== undefined) {
        lastOffsets.set(resumeKey, offset.get());
      }
    },
    [offset, resumeKey]
  );
  /** Seconds since start. Drives the star twinkle. */
  const clock = useSharedValue(0);

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
    clock.set(clock.get() + timeSincePreviousFrame / 1000);
  }, !isReducedMotion);

  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.set(withTiming(isVisible ? 1 : 0, { duration: SKY_FADE_MS }));
  }, [isVisible, opacity]);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  const isNight = scheme === "dark";

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
          {
            flexDirection: "row",
            width: copyWidth * 3,
            height,
            opacity: isNight ? NIGHT_CLOUD_OPACITY : 1,
          },
          panStyle,
        ]}
      >
        <Image source={SKY} style={{ width: copyWidth, height }} />
        <Image source={SKY_FLIPPED} style={{ width: copyWidth, height }} />
        <Image source={SKY} style={{ width: copyWidth, height }} />
      </Animated.View>
      {isNight ? <NightStars clock={clock} /> : null}
    </Animated.View>
  );
};
