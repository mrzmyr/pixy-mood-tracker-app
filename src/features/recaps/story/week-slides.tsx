import { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, {
  Defs,
  LinearGradient,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";
import { Sky, SKY_DRIFT_SPEED } from "@/components/sky";
import { TextReveal } from "@/components/text-reveal";
import { getTextRevealDuration } from "@/components/text-reveal-parts";
import { RADIUS } from "@/constants/radius";
import { RATING_KEYS, RATING_MAPPING } from "@/constants/ratings";
import { EmotionIndicator, EMOTIONS } from "@/features/logger";
import { getAverageMood } from "@/features/logs";
import useColors from "@/hooks/use-colors";
import { t, tDynamic } from "@/lib/translation";
import { useSettings } from "@/state/settings";
import { THRESHOLDS } from "../thresholds";
import type { DateKey, RecapDay } from "../types";
import { weekdayName, weekdayShort } from "./format";
import { fitCamera } from "./map-camera";
import type { MapPoint } from "./map-camera";
import { HAS_PLACES_MAP, PlacesMap } from "./places-map";
import { StoryImage, StoryText } from "./parts";
import { STORY_PALETTE, STORY_TYPE } from "./theme";
import type { StoryTheme } from "./theme";
import type {
  BestDaySlide,
  CloseBySlide,
  FarOutSlide,
  StoryPlace,
  TopEmotionsSlide,
  WeekMoodSlide,
} from "./types";
import type { SlideContext } from "./slides";

/** Wait after a slide shows before its headline starts writing itself. */
const TITLE_DELAY_MS = 700;
/** Gap between items that come in one after another. */
const STAGGER_MS = 220;

/** Time until a headline started at `TITLE_DELAY_MS` is fully written. */
const afterTitle = (title: string) =>
  TITLE_DELAY_MS + getTextRevealDuration(title);

/** Sky slides: `paper` by day, `night` in dark mode, as `getSlideTheme`. */
const skyTheme = (isDark: boolean): StoryTheme => (isDark ? "night" : "paper");

/**
 * Quiet text on the sky. Gray looks washed out on blue, so by day it is a
 * deep blue of the sky's hue. The night sky keeps the night muted color.
 */
const skyMuted = (isDark: boolean) =>
  isDark ? STORY_PALETTE.night.muted : "#2A4A6B";

/** Tiles on the sky: light fill, 1 pt outline, as summary tiles. */
const useSkyTile = () => {
  const colors = useColors();
  const isDark = useColorScheme() === "dark";
  return {
    backgroundColor: isDark
      ? STORY_PALETTE.night.surface
      : "rgba(255,255,255,0.82)",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  };
};

/** Fill and 1 pt outline of a mood pixel, from the user's scale. */
interface PixelShade {
  fill: string;
  border: string;
}

/** Shade of a rating key, and of a day without check-in. */
const useScaleShades = () => {
  const colors = useColors();
  const { settings } = useSettings();
  const scale = colors.scales[settings.scaleType];
  return {
    rating: (key: (typeof RATING_KEYS)[number]): PixelShade => ({
      fill: scale[key].background,
      border: scale[key].border,
    }),
    empty: { fill: scale.empty.background, border: scale.empty.border },
  };
};

/** Mood shade per day: the rounded mean rating, as in the calendar. */
const useDayShades = (days: RecapDay[]) => {
  const shades = useScaleShades();
  const map = new Map<DateKey, PixelShade>();
  for (const day of days) {
    const rating = getAverageMood(day.items);
    if (rating) {
      map.set(day.date, shades.rating(rating));
    }
  }
  return { map, empty: shades.empty };
};

/** Square mood pixel with its 1 pt outline, readable on any background. */
const ShadedPixel = ({ size, shade }: { size: number; shade: PixelShade }) => (
  <View
    style={{
      width: size,
      height: size,
      borderRadius: Math.max(3, size * 0.22),
      backgroundColor: shade.fill,
      borderWidth: 1,
      borderColor: shade.border,
    }}
  />
);

/** Drifting sky behind sky slides. One sky across slides in a row. */
const StorySky = () => {
  const speed = useSharedValue(SKY_DRIFT_SPEED);
  return <Sky speed={speed} resumeKey="recap-story" />;
};

/** Beams from the sun, top right, fanning down to the left. */
const BEAMS = [
  { spread: 0.1, angle: 0.62, opacity: 0.55 },
  { spread: 0.06, angle: 0.78, opacity: 0.4 },
  { spread: 0.12, angle: 0.98, opacity: 0.5 },
  { spread: 0.05, angle: 1.16, opacity: 0.35 },
  { spread: 0.09, angle: 1.34, opacity: 0.45 },
];

/** Widths of one beam's layers: overlapping, they fade out at the edges. */
const SOFT_EDGES = [0.4, 0.8, 1.3, 1.9];

/** Slow breathing between 0 and 1. Reduced motion keeps it still. */
const useBreathing = (durationMs: number) => {
  const isReducedMotion = useReducedMotion();
  const value = useSharedValue(0);
  useEffect(() => {
    if (isReducedMotion) {
      return;
    }
    value.set(
      withRepeat(
        withTiming(1, {
          duration: durationMs,
          easing: Easing.inOut(Easing.sin),
        }),
        -1,
        true
      )
    );
  }, [durationMs, isReducedMotion, value]);
  return value;
};

/** Sun comes in after the best day headline, and goes on the next slide. */
const SUN_IN_DELAY_MS = 1800;
const SUN_FADE_MS = 2200;

/**
 * Sunlight over the day sky: a warm glow and soft beams that break through
 * the clouds. `in` lets it rise after the headline; `out` lets it set.
 */
const SunRays = ({ direction }: { direction: "in" | "out" }) => {
  const { width, height } = useWindowDimensions();
  const first = useBreathing(5200);
  const second = useBreathing(7400);
  const presence = useSharedValue(direction === "in" ? 0 : 1);
  useEffect(() => {
    presence.set(
      direction === "in"
        ? withDelay(
            SUN_IN_DELAY_MS,
            withTiming(1, {
              duration: SUN_FADE_MS,
              easing: Easing.out(Easing.quad),
            })
          )
        : withTiming(0, {
            duration: SUN_FADE_MS,
            easing: Easing.in(Easing.quad),
          })
    );
  }, [direction, presence]);
  const presenceStyle = useAnimatedStyle(() => ({ opacity: presence.get() }));
  const firstStyle = useAnimatedStyle(() => ({
    opacity: 0.6 + first.get() * 0.4,
  }));
  const secondStyle = useAnimatedStyle(() => ({
    opacity: 1 - second.get() * 0.5,
  }));
  const sun = { x: width * 0.92, y: height * 0.04 };
  const length = Math.hypot(width, height) * 1.1;
  const beam = (spread: number, angle: number) => {
    const point = (offset: number) =>
      `${sun.x + Math.cos(Math.PI / 2 + angle + offset) * length},${
        sun.y + Math.sin(Math.PI / 2 + angle + offset) * length
      }`;
    return `${sun.x},${sun.y} ${point(-spread / 2)} ${point(spread / 2)}`;
  };
  const layer = (index: number) =>
    BEAMS.filter((_, beamIndex) => beamIndex % 2 === index).flatMap((item) =>
      // Nested wider copies at low opacity blur the beam's edges.
      SOFT_EDGES.map((widen) => (
        <Polygon
          key={`${item.angle}-${widen}`}
          points={beam(item.spread * widen, item.angle)}
          fill="url(#beam)"
          opacity={(item.opacity * 2) / SOFT_EDGES.length}
        />
      ))
    );
  const defs = (
    <Defs>
      <LinearGradient
        id="beam"
        x1={sun.x}
        y1={sun.y}
        x2={sun.x - width * 0.7}
        y2={sun.y + height * 0.75}
        gradientUnits="userSpaceOnUse"
      >
        <Stop offset="0" stopColor="#FFF6D8" stopOpacity="0.8" />
        <Stop offset="0.55" stopColor="#FFFFFF" stopOpacity="0.25" />
        <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
      </LinearGradient>
      <RadialGradient
        id="glow"
        cx={sun.x}
        cy={sun.y}
        r={width * 0.75}
        gradientUnits="userSpaceOnUse"
      >
        <Stop offset="0" stopColor="#FFF8E1" stopOpacity="0.95" />
        <Stop offset="0.25" stopColor="#FFE9B0" stopOpacity="0.45" />
        <Stop offset="1" stopColor="#FFE9B0" stopOpacity="0" />
      </RadialGradient>
    </Defs>
  );
  return (
    <Animated.View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, presenceStyle]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, firstStyle]}>
        <Svg width={width} height={height}>
          {defs}
          {layer(0)}
          <Rect width={width} height={height} fill="url(#glow)" />
        </Svg>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, secondStyle]}>
        <Svg width={width} height={height}>
          {defs}
          {layer(1)}
        </Svg>
      </Animated.View>
    </Animated.View>
  );
};

/**
 * Sky behind a sky slide. `sun`: rises after the best day headline, or sets
 * when the slide before had it. Night skies never show the sun.
 */
export const SkyBackdrop = ({ sun }: { sun: "in" | "out" | null }) => {
  const isDark = useColorScheme() === "dark";
  return (
    <>
      <StorySky />
      {sun && !isDark && <SunRays direction={sun} />}
    </>
  );
};

/**
 * Headline that writes itself after a short pause. Only for what the story
 * reveals about the user's week, never for a fixed label.
 */
const RevealTitle = ({
  theme,
  delay = TITLE_DELAY_MS,
  children,
}: {
  theme: StoryTheme;
  delay?: number;
  children: string;
}) => (
  <TextReveal
    accessibilityRole="header"
    delay={delay}
    style={[STORY_TYPE.title, { color: STORY_PALETTE[theme].text }]}
  >
    {children}
  </TextReveal>
);

/** Fixed label above a title, in the quiet color of its background. */
const Eyebrow = ({
  theme,
  color,
  children,
}: {
  theme: StoryTheme;
  color?: string;
  children: string;
}) => (
  <StoryText
    kind="eyebrow"
    theme={theme}
    tone="muted"
    style={color ? { color } : undefined}
  >
    {children}
  </StoryText>
);

/** Emotion name for a sentence: lowercase, except names like "FOMO". */
const emotionInSentence = (key: string) => {
  const name = tDynamic(`log_emotion_${key}`);
  return name === name.toUpperCase() ? name : name.toLowerCase();
};

/** Emotion icon plus name, as an outlined chip on a photo or the sky. */
const EmotionChip = ({
  emotionKey,
  theme,
}: {
  emotionKey: string;
  theme: StoryTheme;
}) => {
  const tile = useSkyTile();
  const emotion = EMOTIONS.find((item) => item.key === emotionKey);
  if (!emotion) {
    return null;
  }
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingHorizontal: 12,
          paddingVertical: 7,
          borderRadius: RADIUS.full,
        },
        theme === "photo"
          ? {
              backgroundColor: STORY_PALETTE.photo.surface,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.22)",
            }
          : tile,
      ]}
    >
      <EmotionIndicator emotion={emotion} size={16} />
      <StoryText kind="label" theme={theme}>
        {tDynamic(`log_emotion_${emotion.key}`)}
      </StoryText>
    </View>
  );
};

// ---------------------------------------------------------------- best day

/** Best day: over its photo, or over the sunlit sky without one. */
export const BestDay = ({
  slide,
  ctx,
}: {
  slide: BestDaySlide;
  ctx: SlideContext;
}) => {
  const theme = slide.photo ? "photo" : skyTheme(ctx.isDark);
  const title = t("recaps_story_best_day_title", {
    day: weekdayName(slide.date),
  });
  const chipsAt = afterTitle(title);
  const chips = (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
      {slide.emotions.map((key, index) => (
        <Animated.View
          key={key}
          entering={FadeInDown.delay(chipsAt + index * STAGGER_MS * 2)}
        >
          <EmotionChip emotionKey={key} theme={theme} />
        </Animated.View>
      ))}
    </View>
  );
  const header = (
    <View style={{ gap: 8 }}>
      <Eyebrow
        theme={theme}
        color={slide.photo ? undefined : skyMuted(ctx.isDark)}
      >
        {t("recaps_story_best_day_eyebrow")}
      </Eyebrow>
      <RevealTitle theme={theme}>{title}</RevealTitle>
    </View>
  );
  return slide.photo ? (
    <>
      <View style={{ flex: 1 }} />
      {header}
      <View style={{ height: 16 }} />
      {chips}
    </>
  ) : (
    <>
      {header}
      <View style={{ flex: 1 }} />
      {chips}
    </>
  );
};

// ---------------------------------------------------------------- week mood

/** Most pixels in one column: the best rating step plus one. */
const TOWER_MAX = RATING_MAPPING.extremely_good + 1;
const TOWER_GAP = 6;

/**
 * Pixel that falls from the sky and bounces into its place. Reduced motion
 * shows it in place.
 */
const FallingPixel = ({
  size,
  shade,
  delay,
  fall,
}: {
  size: number;
  shade: PixelShade;
  delay: number;
  /** Distance above its place where the pixel starts. */
  fall: number;
}) => {
  const isReducedMotion = useReducedMotion();
  const offset = useSharedValue(isReducedMotion ? 0 : -fall);
  const opacity = useSharedValue(isReducedMotion ? 1 : 0);
  useEffect(() => {
    if (isReducedMotion) {
      return;
    }
    opacity.set(withDelay(delay, withTiming(1, { duration: 120 })));
    offset.set(
      withDelay(delay, withSpring(0, { damping: 9, stiffness: 140, mass: 0.8 }))
    );
  }, [delay, isReducedMotion, offset, opacity]);
  const style = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ translateY: offset.get() }],
  }));
  return (
    <Animated.View style={style}>
      <ShadedPixel size={size} shade={shade} />
    </Animated.View>
  );
};

/** One pixel column per day, as tall as the day's mood, on the sky. */
export const WeekMood = ({
  slide,
  ctx,
}: {
  slide: WeekMoodSlide;
  ctx: SlideContext;
}) => {
  const theme = skyTheme(ctx.isDark);
  const shades = useDayShades(ctx.days);
  const [area, setArea] = useState({ width: 0, height: 0 });
  const rated = slide.days.filter((day) => day.rating !== null);
  const good = rated.filter(
    (day) => (day.rating ?? 0) >= THRESHOLDS.storyBrightMinRating
  ).length;
  const title =
    good > 0
      ? t("recaps_story_week_mood_good", { count: good, total: rated.length })
      : t("recaps_story_week_mood_title");
  const fallAt = good > 0 ? afterTitle(title) : TITLE_DELAY_MS;
  const columns = slide.days.length;
  const size = Math.floor(
    Math.min(
      (area.width - TOWER_GAP * (columns - 1)) / columns,
      (area.height - 24 - TOWER_GAP * (TOWER_MAX - 1)) / TOWER_MAX
    )
  );
  return (
    <>
      <View style={{ gap: 8 }}>
        <Eyebrow theme={theme} color={skyMuted(ctx.isDark)}>
          {t("recaps_story_week_mood_eyebrow")}
        </Eyebrow>
        {/* Good days are news; a week without one keeps the fixed title. */}
        {good > 0 ? (
          <RevealTitle theme={theme}>{title}</RevealTitle>
        ) : (
          <StoryText kind="title" theme={theme}>
            {title}
          </StoryText>
        )}
      </View>
      <View
        style={{ flex: 1, marginTop: 24, justifyContent: "flex-end" }}
        onLayout={(event) => setArea(event.nativeEvent.layout)}
      >
        {size > 0 && (
          <View
            style={{
              flexDirection: "row",
              gap: TOWER_GAP,
              justifyContent: "center",
              alignItems: "flex-end",
            }}
          >
            {slide.days.map((day, column) => {
              const count =
                day.rating === null ? 0 : Math.round(day.rating) + 1;
              const shade = shades.map.get(day.date) ?? shades.empty;
              const pixels: PixelShade[] =
                count === 0
                  ? [shades.empty]
                  : Array.from({ length: count }, () => shade);
              return (
                <View key={day.date} style={{ alignItems: "center", gap: 8 }}>
                  <View style={{ gap: TOWER_GAP }}>
                    {pixels.map((pixelShade, pixel) => (
                      <FallingPixel
                        // Pixels never reorder; the index is their identity.
                        // oxlint-disable-next-line react/no-array-index-key -- see comment above.
                        key={pixel}
                        size={size}
                        shade={pixelShade}
                        fall={area.height + 120}
                        // Bottom pixel first, then up the column.
                        delay={
                          fallAt +
                          column * 260 +
                          (pixels.length - 1 - pixel) * 90
                        }
                      />
                    ))}
                  </View>
                  <StoryText
                    kind="label"
                    theme={theme}
                    style={{ color: skyMuted(ctx.isDark) }}
                  >
                    {weekdayShort(day.date)}
                  </StoryText>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </>
  );
};

// ---------------------------------------------------------------- emotions

/** Bubble spots by rank: center and size as shares of the area width. */
const BUBBLES = [
  { x: 0.5, y: 0.2, size: 0.46 },
  { x: 0.22, y: 0.5, size: 0.36 },
  { x: 0.78, y: 0.48, size: 0.32 },
  { x: 0.48, y: 0.74, size: 0.32 },
  { x: 0.84, y: 0.8, size: 0.25 },
  { x: 0.16, y: 0.84, size: 0.24 },
];

/**
 * Bubble that flies in from the side, overshoots a little like a bump into
 * its neighbors, settles, then drifts in place. Reduced motion: still.
 */
const FlyingBubble = ({
  index,
  from,
  delay,
  children,
}: {
  index: number;
  /** Start offset: off screen to the left or right. */
  from: number;
  delay: number;
  children: React.ReactNode;
}) => {
  const isReducedMotion = useReducedMotion();
  const x = useSharedValue(isReducedMotion ? 0 : from);
  const drift = useBreathing(3200 + index * 600);
  useEffect(() => {
    if (isReducedMotion) {
      return;
    }
    x.set(withDelay(delay, withSpring(0, { damping: 11, stiffness: 90 })));
  }, [delay, isReducedMotion, x]);
  const style = useAnimatedStyle(() => ({
    transform: [
      {
        translateX:
          x.get() + (index % 2 === 0 ? 4 : -4) * (drift.get() * 2 - 1),
      },
      { translateY: (index % 3 === 0 ? -6 : 6) * (drift.get() * 2 - 1) },
    ],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
};

/** Emotions as bubbles that fly in one by one and settle on the sky. */
export const TopEmotions = ({
  slide,
  ctx,
}: {
  slide: TopEmotionsSlide;
  ctx: SlideContext;
}) => {
  const theme = skyTheme(ctx.isDark);
  const tile = useSkyTile();
  const { width } = useWindowDimensions();
  const [area, setArea] = useState({ width: 0, height: 0 });
  const [top] = slide.counts;
  const title = top
    ? t("recaps_story_emotions_title", {
        emotion: emotionInSentence(top.emotion),
      })
    : "";
  const flyAt = afterTitle(title);
  return (
    <>
      <View style={{ gap: 8 }}>
        <Eyebrow theme={theme} color={skyMuted(ctx.isDark)}>
          {t("recaps_story_emotions_eyebrow")}
        </Eyebrow>
        {top && <RevealTitle theme={theme}>{title}</RevealTitle>}
      </View>
      <View
        style={{ flex: 1, marginTop: 16 }}
        onLayout={(event) => setArea(event.nativeEvent.layout)}
      >
        {area.width > 0 &&
          slide.counts.map((count, index) => {
            const spot = BUBBLES[index];
            const emotion = EMOTIONS.find((item) => item.key === count.emotion);
            if (!spot || !emotion) {
              return null;
            }
            const size = Math.min(area.width * spot.size, area.height * 0.4);
            const name = tDynamic(`log_emotion_${emotion.key}`);
            const days = t("recaps_story_days", { count: count.days });
            const left = area.width * spot.x - size / 2;
            const delay = flyAt + index * STAGGER_MS * 2;
            return (
              <Animated.View
                key={count.emotion}
                entering={FadeIn.delay(delay)}
                accessible
                accessibilityLabel={`${name}, ${days}`}
                style={{
                  position: "absolute",
                  left,
                  top: area.height * spot.y - size / 2,
                }}
              >
                <FlyingBubble
                  index={index}
                  from={
                    index % 2 === 1 ? -(left + size + 24) : width - left + 24
                  }
                  delay={delay}
                >
                  <View
                    style={[
                      tile,
                      {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 4,
                      },
                    ]}
                  >
                    <EmotionIndicator
                      emotion={emotion}
                      size={Math.round(size * 0.3)}
                    />
                    <StoryText
                      kind="label"
                      theme={theme}
                      numberOfLines={1}
                      style={{ fontSize: index < 2 ? 14 : 12 }}
                    >
                      {name}
                    </StoryText>
                    <StoryText
                      kind="label"
                      theme={theme}
                      style={{
                        fontSize: 12,
                        lineHeight: 14,
                        color: skyMuted(ctx.isDark),
                      }}
                    >
                      {days}
                    </StoryText>
                  </View>
                </FlyingBubble>
              </Animated.View>
            );
          })}
      </View>
    </>
  );
};

// ---------------------------------------------------------------- places

/** Rating key of a mean rating, rounded as the calendar colors a day. */
const ratingKey = (rating: number) =>
  RATING_KEYS.find((key) => RATING_MAPPING[key] === Math.round(rating)) ??
  "neutral";

/** Pin shade: the mood of good places, the empty shade for every other. */
const usePlaceShade = () => {
  const shades = useScaleShades();
  return (place: StoryPlace) =>
    place.rating >= THRESHOLDS.storyBrightMinRating
      ? shades.rating(ratingKey(place.rating))
      : shades.empty;
};

const PIN_PHOTO = 54;
const PIN_PIXEL = 30;
/** Space above a map point for its pin, and below it for the name. */
const PIN_ABOVE = PIN_PHOTO + 8;
const PIN_BELOW = 34;
/** Space between pins and the screen edges, so names fit. */
const PIN_INSET = 24;
/** Share of the screen the bottom fade covers, for the title and line. */
const FADE_SHARE = 0.36;
/** Lift, so pins stand out on a busy map. */
const PIN_SHADOW = "0 4px 14px rgba(0,0,0,0.35)";
/** Time between two pins dropping onto the map. */
const PIN_STAGGER_MS = 650;
/** First pin drops after the map settled. */
const PIN_START_MS = 500;

/** When the places headline starts: after the last pin. */
const placesTitleDelay = (count: number) =>
  PIN_START_MS + count * PIN_STAGGER_MS + 200;

/** Photo in a white ring, or the mood pixel, with the name in a pill. */
const Pin = ({
  place,
  shade,
  point,
  index,
}: {
  place: StoryPlace;
  shade: PixelShade;
  point: { x: number; y: number };
  index: number;
}) => {
  const tile = useSkyTile();
  const isDark = useColorScheme() === "dark";
  return (
    <Animated.View
      entering={ZoomIn.delay(PIN_START_MS + index * PIN_STAGGER_MS)
        .springify()
        .damping(12)}
      style={{
        position: "absolute",
        left: point.x - 70,
        top: point.y - (place.photo ? PIN_PHOTO : PIN_PIXEL / 2),
        width: 140,
        alignItems: "center",
      }}
    >
      {place.photo ? (
        <View
          style={{
            width: PIN_PHOTO,
            height: PIN_PHOTO,
            borderRadius: PIN_PHOTO / 2,
            padding: 3,
            backgroundColor: "#FFFFFF",
            boxShadow: PIN_SHADOW,
          }}
        >
          <StoryImage
            photo={place.photo.photo}
            style={{ flex: 1, borderRadius: PIN_PHOTO / 2 }}
          />
        </View>
      ) : (
        <View
          style={{
            padding: 3,
            borderRadius: 11,
            backgroundColor: "#FFFFFF",
            boxShadow: PIN_SHADOW,
          }}
        >
          <ShadedPixel size={PIN_PIXEL - 6} shade={shade} />
        </View>
      )}
      <View
        style={[
          tile,
          {
            marginTop: 5,
            paddingHorizontal: 9,
            paddingVertical: 3,
            borderRadius: RADIUS.full,
            backgroundColor: isDark ? STORY_PALETTE.night.surface : "#FFFFFF",
            boxShadow: PIN_SHADOW,
          },
        ]}
      >
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.2}
          style={{
            fontSize: 13,
            fontWeight: "700",
            color: isDark ? "#FFFFFF" : "#0A0A0A",
          }}
        >
          {place.name}
        </Text>
      </View>
    </Animated.View>
  );
};

/** Full-screen map that fits every place above the bottom fade. */
const PlacesMapBackdrop = ({
  places,
  context,
  maxZoom,
}: {
  places: StoryPlace[];
  /** Points that frame the map without a pin. */
  context: MapPoint[];
  maxZoom: number;
}) => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const placeShade = usePlaceShade();
  const camera = fitCamera(
    [...context, ...places],
    {
      width,
      height,
      top: insets.top + 76 + PIN_ABOVE + PIN_INSET,
      bottom: height * FADE_SHARE + PIN_BELOW,
      left: PIN_INSET * 3,
      right: PIN_INSET * 3,
    },
    maxZoom
  );
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <PlacesMap center={camera.center} zoom={camera.zoom} />
      {places.map((place, index) => (
        <Pin
          key={place.name}
          place={place}
          shade={placeShade(place)}
          point={camera.project(place)}
          index={index}
        />
      ))}
    </View>
  );
};

/** Street level for a single place. */
const CLOSE_MAX_ZOOM = 14;
/** City level for a trip with nothing else around. */
const FAR_MAX_ZOOM = 9;

/** Map behind a places slide on iOS, the sky elsewhere. */
export const PlacesBackdrop = ({
  slide,
}: {
  slide: CloseBySlide | FarOutSlide;
}) => {
  if (!HAS_PLACES_MAP) {
    return <StorySky />;
  }
  return slide.type === "close-by" ? (
    <PlacesMapBackdrop
      places={slide.places}
      context={[]}
      maxZoom={CLOSE_MAX_ZOOM}
    />
  ) : (
    <PlacesMapBackdrop
      places={slide.trips}
      context={slide.around}
      maxZoom={FAR_MAX_ZOOM}
    />
  );
};

/** Headline and line of a places slide: what the week's places reveal. */
const placesCopy = (slide: CloseBySlide | FarOutSlide) => {
  if (slide.type === "far-out") {
    const [first] = slide.trips;
    const city = first?.name ?? "";
    return {
      title:
        slide.trips.length === 1
          ? t("recaps_story_far_title_single", { city })
          : t("recaps_story_far_title_many", { city }),
      text: first ? t("recaps_story_days", { count: first.days }) : "",
    };
  }
  const count = slide.places.length;
  const place = slide.places[0]?.name ?? "";
  if (count === 1) {
    return { title: t("recaps_story_close_title_single", { place }), text: "" };
  }
  return {
    title: t("recaps_story_close_title", { place }),
    text:
      count <= THRESHOLDS.storyCloseByFewMax
        ? t("recaps_story_close_text_few")
        : t("recaps_story_close_text_many"),
  };
};

/**
 * Map fades into the slide color at the bottom, over at least a third of
 * the screen, so headline, line, and the story actions read on a calm
 * ground. Drawn with the content: the native map hides views behind it.
 */
const MapFade = ({ theme }: { theme: StoryTheme }) => {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const fade = height * FADE_SHARE + 80;
  const color = STORY_PALETTE[theme].background;
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: -24,
        right: -24,
        bottom: -(insets.bottom + 84),
        height: fade,
      }}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0" />
            <Stop offset="0.3" stopColor={color} stopOpacity="0.9" />
            <Stop offset="0.42" stopColor={color} stopOpacity="1" />
            <Stop offset="1" stopColor={color} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#fade)" />
      </Svg>
    </View>
  );
};

/**
 * Pins drop one after another, then the headline writes itself. Map slide:
 * headline over the bottom fade. Sky slide: headline and a place list.
 */
export const Places = ({
  slide,
  ctx,
}: {
  slide: CloseBySlide | FarOutSlide;
  ctx: SlideContext;
}) => {
  const placeShade = usePlaceShade();
  const tile = useSkyTile();
  const copy = placesCopy(slide);
  const theme = skyTheme(ctx.isDark);
  const places = slide.type === "close-by" ? slide.places : slide.trips;
  const titleAt = placesTitleDelay(places.length);
  const textAt = titleAt + getTextRevealDuration(copy.title);
  const title = (
    <RevealTitle theme={theme} delay={titleAt}>
      {copy.title}
    </RevealTitle>
  );
  const text = (color?: string) =>
    copy.text ? (
      <Animated.View entering={FadeIn.delay(textAt).duration(600)}>
        <StoryText
          kind="body"
          theme={theme}
          tone="muted"
          style={color ? { color } : undefined}
        >
          {copy.text}
        </StoryText>
      </Animated.View>
    ) : null;
  if (HAS_PLACES_MAP) {
    return (
      <>
        <MapFade theme={theme} />
        <View style={{ flex: 1 }} />
        <View style={{ gap: 6, marginBottom: 8 }}>
          {title}
          {text()}
        </View>
      </>
    );
  }
  return (
    <>
      <View style={{ gap: 8 }}>
        {title}
        {text(skyMuted(ctx.isDark))}
      </View>
      <View style={{ flex: 1 }} />
      <View style={{ gap: 8 }}>
        {places.map((place, index) => (
          <Animated.View
            key={place.name}
            entering={FadeInDown.delay(PIN_START_MS + index * PIN_STAGGER_MS)}
            style={[
              tile,
              {
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                padding: 8,
                borderRadius: RADIUS.md,
                borderCurve: "continuous",
              },
            ]}
          >
            {place.photo ? (
              <StoryImage
                photo={place.photo.photo}
                style={{ width: 40, height: 40, borderRadius: 10 }}
              />
            ) : (
              <ShadedPixel size={40} shade={placeShade(place)} />
            )}
            <StoryText kind="label" theme={theme} style={{ flex: 1 }}>
              {place.name}
            </StoryText>
            <StoryText
              kind="label"
              theme={theme}
              style={{ marginRight: 6, color: skyMuted(ctx.isDark) }}
            >
              {t("recaps_story_days", { count: place.days })}
            </StoryText>
          </Animated.View>
        ))}
      </View>
    </>
  );
};
