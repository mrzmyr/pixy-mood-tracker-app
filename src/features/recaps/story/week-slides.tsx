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
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
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
import { RADIUS } from "@/constants/radius";
import { RATING_KEYS, RATING_MAPPING } from "@/constants/ratings";
import { EmotionIndicator, EMOTIONS } from "@/features/logger";
import { t, tDynamic } from "@/lib/translation";
import { THRESHOLDS } from "../thresholds";
import { weekdayName, weekdayShort } from "./format";
import { fitCamera } from "./map-camera";
import type { MapPoint } from "./map-camera";
import { HAS_PLACES_MAP, PlacesMap } from "./places-map";
import {
  Pixel,
  StoryImage,
  StoryText,
  useDayColors,
  useRatingColor,
} from "./parts";
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

/** Sky slides: `paper` by day, `night` in dark mode, as `getSlideTheme`. */
const skyTheme = (isDark: boolean): StoryTheme => (isDark ? "night" : "paper");

/**
 * Quiet text on the sky. Gray looks washed out on blue, so by day it is a
 * deep blue of the sky's hue. The night sky keeps the night muted color.
 */
const skyMuted = (isDark: boolean) =>
  isDark ? STORY_PALETTE.night.muted : "#2A4A6B";

/** Drifting sky behind slides without a photo or a map. */
export const StorySky = () => {
  const speed = useSharedValue(SKY_DRIFT_SPEED);
  return <Sky speed={speed} />;
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

/** Slow breathing of the beams. Reduced motion keeps them still. */
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

/**
 * Sunlight over the day sky: a warm glow and soft beams that break through
 * the clouds and slowly fade in and out. Night skies stay without it.
 */
export const SunRays = () => {
  const { width, height } = useWindowDimensions();
  const first = useBreathing(5200);
  const second = useBreathing(7400);
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
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}
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
    </View>
  );
};

/** Sky with sunlight by day; the night sky in dark mode, as `Sky`. */
export const BestDaySky = () => {
  const isDark = useColorScheme() === "dark";
  return (
    <>
      <StorySky />
      {!isDark && <SunRays />}
    </>
  );
};

/**
 * Title that writes itself. Only for what the story reveals about the
 * user's week, never for a fixed label.
 */
const RevealTitle = ({
  theme,
  delay = 200,
  style,
  children,
}: {
  theme: StoryTheme;
  delay?: number;
  style?: object;
  children: string;
}) => (
  <TextReveal
    accessibilityRole="header"
    delay={delay}
    style={[STORY_TYPE.title, { color: STORY_PALETTE[theme].text }, style]}
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

/** Emotion icon plus name, as a chip on a photo or the sky. */
const EmotionChip = ({
  emotionKey,
  theme,
}: {
  emotionKey: string;
  theme: StoryTheme;
}) => {
  const emotion = EMOTIONS.find((item) => item.key === emotionKey);
  if (!emotion) {
    return null;
  }
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: RADIUS.full,
        backgroundColor:
          theme === "paper"
            ? "rgba(255,255,255,0.8)"
            : STORY_PALETTE.photo.surface,
      }}
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
  const chips = (
    <Animated.View
      entering={FadeInDown.delay(1200)}
      style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}
    >
      {slide.emotions.map((key) => (
        <EmotionChip key={key} emotionKey={key} theme={theme} />
      ))}
    </Animated.View>
  );
  const header = (
    <View style={{ gap: 8 }}>
      <Eyebrow
        theme={theme}
        color={slide.photo ? undefined : skyMuted(ctx.isDark)}
      >
        {t("recaps_story_best_day_eyebrow")}
      </Eyebrow>
      <RevealTitle theme={theme}>
        {t("recaps_story_best_day_title", { day: weekdayName(slide.date) })}
      </RevealTitle>
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

/** One pixel column per day, as tall as the day's mood, on the sky. */
export const WeekMood = ({
  slide,
  ctx,
}: {
  slide: WeekMoodSlide;
  ctx: SlideContext;
}) => {
  const theme = skyTheme(ctx.isDark);
  const dayColors = useDayColors(ctx.days);
  const [area, setArea] = useState({ width: 0, height: 0 });
  const rated = slide.days.filter((day) => day.rating !== null);
  const good = rated.filter(
    (day) => (day.rating ?? 0) >= THRESHOLDS.storyBrightMinRating
  ).length;
  const columns = slide.days.length;
  const size = Math.floor(
    Math.min(
      (area.width - TOWER_GAP * (columns - 1)) / columns,
      (area.height - 24 - TOWER_GAP * (TOWER_MAX - 1)) / TOWER_MAX
    )
  );
  const empty = ctx.isDark
    ? STORY_PALETTE.night.empty
    : "rgba(255,255,255,0.55)";
  return (
    <>
      <View style={{ gap: 8 }}>
        <Eyebrow theme={theme} color={skyMuted(ctx.isDark)}>
          {t("recaps_story_week_mood_eyebrow")}
        </Eyebrow>
        {/* Good days are news; a week without one keeps the fixed title. */}
        {good > 0 ? (
          <RevealTitle theme={theme}>
            {t("recaps_story_week_mood_good", {
              count: good,
              total: rated.length,
            })}
          </RevealTitle>
        ) : (
          <StoryText kind="title" theme={theme}>
            {t("recaps_story_week_mood_title")}
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
            {slide.days.map((day, index) => {
              const count =
                day.rating === null ? 0 : Math.round(day.rating) + 1;
              const color = dayColors.get(day.date) ?? empty;
              return (
                <View key={day.date} style={{ alignItems: "center", gap: 8 }}>
                  <Animated.View
                    entering={FadeInDown.delay(250 + index * 120)}
                    style={{ gap: TOWER_GAP }}
                  >
                    {count === 0 ? (
                      <Pixel size={size} color={empty} />
                    ) : (
                      Array.from({ length: count }, (_, pixel) => (
                        <Pixel key={pixel} size={size} color={color} />
                      ))
                    )}
                  </Animated.View>
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

/** Slow drift of a bubble in place. Reduced motion keeps it still. */
const Floating = ({
  index,
  children,
}: {
  index: number;
  children: React.ReactNode;
}) => {
  const drift = useBreathing(3200 + index * 600);
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: (index % 2 === 0 ? 4 : -4) * (drift.get() * 2 - 1) },
      { translateY: (index % 3 === 0 ? -6 : 6) * (drift.get() * 2 - 1) },
    ],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
};

/** Emotions as bubbles that drift in place on the sky, biggest first. */
export const TopEmotions = ({
  slide,
  ctx,
}: {
  slide: TopEmotionsSlide;
  ctx: SlideContext;
}) => {
  const theme = skyTheme(ctx.isDark);
  const [area, setArea] = useState({ width: 0, height: 0 });
  const [top] = slide.counts;
  return (
    <>
      <View style={{ gap: 8 }}>
        <Eyebrow theme={theme} color={skyMuted(ctx.isDark)}>
          {t("recaps_story_emotions_eyebrow")}
        </Eyebrow>
        {top && (
          <RevealTitle theme={theme}>
            {t("recaps_story_emotions_title", {
              emotion: tDynamic(`log_emotion_${top.emotion}`),
            })}
          </RevealTitle>
        )}
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
            return (
              <Animated.View
                key={count.emotion}
                entering={ZoomIn.delay(600 + index * 140)}
                accessible
                accessibilityLabel={`${name}, ${days}`}
                style={{
                  position: "absolute",
                  left: area.width * spot.x - size / 2,
                  top: area.height * spot.y - size / 2,
                }}
              >
                <Floating index={index}>
                  <View
                    style={{
                      width: size,
                      height: size,
                      borderRadius: size / 2,
                      backgroundColor: ctx.isDark
                        ? STORY_PALETTE.night.surface
                        : "rgba(255,255,255,0.78)",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                    }}
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
                      tone="muted"
                      style={{ fontSize: 12, lineHeight: 14 }}
                    >
                      {days}
                    </StoryText>
                  </View>
                </Floating>
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

/** Pin color: the mood of good places, gray for every other place. */
const usePlaceColor = () => {
  const ratingColor = useRatingColor();
  return (place: StoryPlace) =>
    place.rating >= THRESHOLDS.storyBrightMinRating
      ? ratingColor(ratingKey(place.rating))
      : "#D4D4D8";
};

const PIN_PHOTO = 54;
const PIN_PIXEL = 30;
/** Space above a map point for its pin, and below it for the name. */
const PIN_ABOVE = PIN_PHOTO + 8;
const PIN_BELOW = 24;
/** Space between pins and the screen edges, so names fit. */
const PIN_INSET = 24;
/** Share of the screen the bottom fade covers, for the title and line. */
const FADE_SHARE = 0.36;
/** Dark ring and lift, so pins stand out on a busy map. */
const PIN_SHADOW = "0 0 0 1px rgba(0,0,0,0.3), 0 4px 14px rgba(0,0,0,0.35)";

/** Pin name with a halo in the map's ground color, light or dark. */
const pinLabelStyle = (isDark: boolean) =>
  ({
    textAlign: "center",
    color: isDark ? "#FFFFFF" : "#0A0A0A",
    fontWeight: "800",
    textShadowColor: isDark ? "#000000" : "#FFFFFF",
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 0 },
  }) as const;

/** Photo in a white ring, or the mood pixel, with the name below. */
const Pin = ({
  place,
  color,
  point,
  index,
}: {
  place: StoryPlace;
  color: string;
  point: { x: number; y: number };
  index: number;
}) => {
  const isDark = useColorScheme() === "dark";
  return (
    <Animated.View
      entering={ZoomIn.delay(300 + index * 150)}
      style={{
        position: "absolute",
        left: point.x - 60,
        top: point.y - (place.photo ? PIN_PHOTO : PIN_PIXEL / 2),
        width: 120,
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
            width: PIN_PIXEL,
            height: PIN_PIXEL,
            borderRadius: 8,
            borderWidth: 3,
            borderColor: "#FFFFFF",
            backgroundColor: color,
            boxShadow: PIN_SHADOW,
          }}
        />
      )}
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={1.2}
        style={[pinLabelStyle(isDark), { marginTop: 4, fontSize: 13 }]}
      >
        {place.name}
      </Text>
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
  const placeColor = usePlaceColor();
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
          color={placeColor(place)}
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

/** Title and line of a places slide: what the week's places reveal. */
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
 * the screen, so title, line, and the story actions read on a calm ground.
 * Drawn with the content: the native map hides views in its backdrop.
 */
const MapFade = ({ theme }: { theme: StoryTheme }) => {
  const { width, height } = useWindowDimensions();
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
      <Svg width={width} height={fade}>
        <Defs>
          <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0" />
            <Stop offset="0.3" stopColor={color} stopOpacity="0.9" />
            <Stop offset="0.42" stopColor={color} stopOpacity="1" />
            <Stop offset="1" stopColor={color} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect width={width} height={fade} fill="url(#fade)" />
      </Svg>
    </View>
  );
};

/** Map slide: title over the bottom fade. Sky slide: title and place list. */
export const Places = ({
  slide,
  ctx,
}: {
  slide: CloseBySlide | FarOutSlide;
  ctx: SlideContext;
}) => {
  const placeColor = usePlaceColor();
  const copy = placesCopy(slide);
  const theme = skyTheme(ctx.isDark);
  const places = slide.type === "close-by" ? slide.places : slide.trips;
  const text = copy.text ? (
    <Animated.View entering={FadeInDown.delay(1200)}>
      <StoryText kind="body" theme={theme} tone="muted">
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
          <RevealTitle theme={theme} delay={600}>
            {copy.title}
          </RevealTitle>
          {text}
        </View>
      </>
    );
  }
  return (
    <>
      <View style={{ gap: 8 }}>
        <RevealTitle theme={theme}>{copy.title}</RevealTitle>
        {copy.text ? (
          <StoryText
            kind="body"
            theme={theme}
            style={{ color: skyMuted(ctx.isDark) }}
          >
            {copy.text}
          </StoryText>
        ) : null}
      </View>
      <View style={{ flex: 1 }} />
      <View style={{ gap: 8 }}>
        {places.map((place, index) => (
          <Animated.View
            key={place.name}
            entering={FadeInDown.delay(600 + index * 120)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              padding: 8,
              borderRadius: RADIUS.md,
              borderCurve: "continuous",
              backgroundColor: ctx.isDark
                ? STORY_PALETTE.night.surface
                : "rgba(255,255,255,0.8)",
            }}
          >
            {place.photo ? (
              <StoryImage
                photo={place.photo.photo}
                style={{ width: 40, height: 40, borderRadius: 10 }}
              />
            ) : (
              <Pixel size={40} color={placeColor(place)} />
            )}
            <StoryText kind="label" theme={theme} style={{ flex: 1 }}>
              {place.name}
            </StoryText>
            <StoryText
              kind="label"
              theme={theme}
              tone="muted"
              style={{ marginRight: 6 }}
            >
              {t("recaps_story_days", { count: place.days })}
            </StoryText>
          </Animated.View>
        ))}
      </View>
    </>
  );
};
