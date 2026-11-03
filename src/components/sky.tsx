import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
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
// Cloud band of the same photo on a transparent ground, so a gradient sets
// the sky color. Made from the photo's lower part: white clouds, faded edges.
const CLOUDS = require(`../../assets/images/onboarding/sky-clouds.webp`);
const CLOUDS_FLIPPED = require(
  `../../assets/images/onboarding/sky-clouds-flipped.webp`
);
const CLOUDS_ASPECT_RATIO = 2560 / 442;
/** Clouds fill the top of a full-screen day sky: this share of its height. */
const TOP_CLOUDS_SHARE = 0.34;
/** Faint clouds near the bottom: only slightly lighter patches. */
const BOTTOM_CLOUDS_SHARE = 0.3;
const BOTTOM_CLOUDS_OPACITY = 0.3;

/** Drift speed in points per second at rest. */
export const SKY_DRIFT_SPEED = 8;
const SKY_FADE_MS = 600;
/** Night: the clouds show only faintly against the dark sky. */
const NIGHT_CLOUD_OPACITY = 0.07;

/** Stars move at this share of the clouds' extra speed on a step: farther away, slower. */
const STAR_PARALLAX = 0.3;

/**
 * Strip of cloud band copies, panned by `offset`. Runs band, mirror, band,
 * like the photo strip, and loops after two widths.
 */
const CloudBand = ({
  offset,
  height,
  top,
  opacity = 1,
  isMirrored = false,
}: {
  offset: SharedValue<number>;
  height: number;
  top: number;
  opacity?: number;
  /** Starts with the mirror, so the bottom band differs from the top one. */
  isMirrored?: boolean;
}) => {
  const copyWidth = Math.ceil(height * CLOUDS_ASPECT_RATIO);
  const panStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -(offset.get() % (copyWidth * 2)) }],
  }));
  const [first, second] = isMirrored
    ? [CLOUDS_FLIPPED, CLOUDS]
    : [CLOUDS, CLOUDS_FLIPPED];
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top,
          left: 0,
          flexDirection: "row",
          width: copyWidth * 3,
          height,
          opacity,
        },
        panStyle,
      ]}
    >
      <Image source={first} style={{ width: copyWidth, height }} />
      <Image source={second} style={{ width: copyWidth, height }} />
      <Image source={first} style={{ width: copyWidth, height }} />
    </Animated.View>
  );
};

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
  blurRadius,
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
  /** Blurs the cloud photo, for a soft layer under text. */
  blurRadius?: number;
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
  /** Star pan, 0 to one screen width. Slower than the clouds, for depth. */
  const starOffset = useSharedValue(0);
  const { width: windowWidth } = useWindowDimensions();

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
    // Stars hold still at drift speed; they move only while the clouds
    // rush, slower than the clouds.
    const rush = Math.max(0, speed.get() - SKY_DRIFT_SPEED);
    starOffset.set(
      (starOffset.get() +
        (rush * STAR_PARALLAX * timeSincePreviousFrame) / 1000) %
        windowWidth
    );
  }, !isReducedMotion);

  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.set(withTiming(isVisible ? 1 : 0, { duration: SKY_FADE_MS }));
  }, [isVisible, opacity]);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  const isNight = scheme === "dark";
  // Full-screen day sky: gradient with clouds near the top. Night and card
  // skies keep the cloud photo.
  const isLayered = !isNight && skyHeight === undefined;

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
      {isLayered ? (
        <>
          <LinearGradient
            colors={[colors.onboardingSkyTop, colors.onboardingSkyBottom]}
            style={StyleSheet.absoluteFill}
          />
          <CloudBand
            offset={offset}
            top={0}
            height={Math.round(height * TOP_CLOUDS_SHARE)}
          />
          <CloudBand
            offset={offset}
            top={Math.round(height * (1 - BOTTOM_CLOUDS_SHARE))}
            height={Math.round(height * BOTTOM_CLOUDS_SHARE)}
            opacity={BOTTOM_CLOUDS_OPACITY}
            isMirrored
          />
        </>
      ) : (
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
          <Image
            source={SKY}
            blurRadius={blurRadius}
            style={{ width: copyWidth, height }}
          />
          <Image
            source={SKY_FLIPPED}
            blurRadius={blurRadius}
            style={{ width: copyWidth, height }}
          />
          <Image
            source={SKY}
            blurRadius={blurRadius}
            style={{ width: copyWidth, height }}
          />
        </Animated.View>
      )}
      {isNight ? <NightStars clock={clock} offset={starOffset} /> : null}
    </Animated.View>
  );
};
