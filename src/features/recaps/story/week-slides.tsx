import { useEffect, useState } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  ZoomIn,
  Easing,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Sky, SKY_DRIFT_SPEED } from "@/components/sky";
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
  SlideHeader,
  StoryImage,
  StoryText,
  useDayColors,
  useRatingColor,
} from "./parts";
import { STORY_PALETTE } from "./theme";
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

/** Drifting sky behind slides without a photo or a map. */
export const StorySky = () => {
  const speed = useSharedValue(SKY_DRIFT_SPEED);
  return <Sky speed={speed} />;
};

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
            ? "rgba(255,255,255,0.75)"
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

/** Best day: over its photo, or over the sky without one. */
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
      entering={FadeInDown.delay(400)}
      style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}
    >
      {slide.emotions.map((key) => (
        <EmotionChip key={key} emotionKey={key} theme={theme} />
      ))}
    </Animated.View>
  );
  const header = (
    <SlideHeader
      theme={theme}
      eyebrow={t("recaps_story_best_day_eyebrow")}
      title={t("recaps_story_best_day_title", {
        day: weekdayName(slide.date),
      })}
    />
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

/** One pixel column per day, as tall as the day's mood. */
export const WeekMood = ({
  slide,
  ctx,
}: {
  slide: WeekMoodSlide;
  ctx: SlideContext;
}) => {
  const dayColors = useDayColors(ctx.days);
  const [area, setArea] = useState({ width: 0, height: 0 });
  const columns = slide.days.length;
  const size = Math.floor(
    Math.min(
      (area.width - TOWER_GAP * (columns - 1)) / columns,
      (area.height - 24 - TOWER_GAP * (TOWER_MAX - 1)) / TOWER_MAX
    )
  );
  return (
    <>
      <SlideHeader
        theme="night"
        eyebrow={t("recaps_story_week_mood_eyebrow")}
        title={t("recaps_story_week_mood_title")}
      />
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
              const color =
                dayColors.get(day.date) ?? STORY_PALETTE.night.empty;
              return (
                <View key={day.date} style={{ alignItems: "center", gap: 8 }}>
                  <Animated.View
                    entering={FadeInDown.delay(250 + index * 120)}
                    style={{ gap: TOWER_GAP }}
                  >
                    {count === 0 ? (
                      <Pixel size={size} color={STORY_PALETTE.night.empty} />
                    ) : (
                      Array.from({ length: count }, (_, pixel) => (
                        <Pixel key={pixel} size={size} color={color} />
                      ))
                    )}
                  </Animated.View>
                  <StoryText kind="label" theme="night" tone="muted">
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
  const isReducedMotion = useReducedMotion();
  const drift = useSharedValue(0);
  useEffect(() => {
    if (isReducedMotion) {
      return;
    }
    drift.set(
      withRepeat(
        withTiming(1, {
          duration: 3200 + index * 600,
          easing: Easing.inOut(Easing.sin),
        }),
        -1,
        true
      )
    );
  }, [drift, index, isReducedMotion]);
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: (index % 2 === 0 ? 4 : -4) * (drift.get() * 2 - 1) },
      { translateY: (index % 3 === 0 ? -6 : 6) * (drift.get() * 2 - 1) },
    ],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
};

/** Emotions as bubbles that drift in place, biggest first. */
export const TopEmotions = ({ slide }: { slide: TopEmotionsSlide }) => {
  const [area, setArea] = useState({ width: 0, height: 0 });
  return (
    <>
      <SlideHeader
        theme="night"
        eyebrow={t("recaps_story_emotions_eyebrow")}
        title={t("recaps_story_emotions_title")}
      />
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
                entering={ZoomIn.delay(250 + index * 140)}
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
                      backgroundColor: STORY_PALETTE.night.surface,
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
                      theme="night"
                      numberOfLines={1}
                      style={{ fontSize: index < 2 ? 14 : 12 }}
                    >
                      {name}
                    </StoryText>
                    <StoryText
                      kind="label"
                      theme="night"
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
      : "#E5E5E5";
};

const PIN_PHOTO = 52;
const PIN_PIXEL = 34;
/** Space above a map point for its pin, and below it for the name. */
const PIN_ABOVE = PIN_PHOTO + 8;
const PIN_BELOW = 36;
/** Space between pins and the screen edges, so names fit. */
const PIN_INSET = 24;
/** Bottom card on map slides, roughly, so pins stay above it. */
const CARD_HEIGHT = 120;

const pinLabelStyle = {
  textAlign: "center",
  color: "#1D1D1F",
  textShadowColor: "rgba(255,255,255,0.9)",
  textShadowRadius: 3,
  textShadowOffset: { width: 0, height: 0 },
} as const;

/** Photo in a white ring, or the mood pixel, with the name below. */
const Pin = ({
  place,
  label,
  color,
  point,
  index,
}: {
  place: StoryPlace;
  label: string;
  color: string;
  point: { x: number; y: number };
  index: number;
}) => (
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
          boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
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
          borderRadius: 9,
          borderWidth: 3,
          borderColor: "#FFFFFF",
          backgroundColor: color,
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 3px 10px rgba(0,0,0,0.25)",
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: "800", color: "#0A0A0A" }}>
          {place.days}
        </Text>
      </View>
    )}
    <Text
      numberOfLines={1}
      maxFontSizeMultiplier={1.2}
      style={[pinLabelStyle, { marginTop: 3, fontSize: 12, fontWeight: "700" }]}
    >
      {place.name}
    </Text>
    <Text
      numberOfLines={1}
      maxFontSizeMultiplier={1.2}
      style={[pinLabelStyle, { fontSize: 12, fontWeight: "600", opacity: 0.7 }]}
    >
      {label}
    </Text>
  </Animated.View>
);

/** Small dark square for home on the far out map. */
const HomePin = ({ point }: { point: { x: number; y: number } }) => (
  <Animated.View
    entering={FadeIn.delay(200)}
    style={{
      position: "absolute",
      left: point.x - 60,
      top: point.y - 8,
      width: 120,
      alignItems: "center",
    }}
  >
    <View
      style={{
        width: 16,
        height: 16,
        borderRadius: 4,
        borderWidth: 2.5,
        borderColor: "#FFFFFF",
        backgroundColor: "#0A0A0A",
      }}
    />
    <Text
      style={[pinLabelStyle, { marginTop: 3, fontSize: 12, fontWeight: "700" }]}
    >
      {t("recaps_story_home")}
    </Text>
  </Animated.View>
);

/** Full-screen map that fits every place above the bottom card. */
const PlacesMapBackdrop = ({
  places,
  home,
  maxZoom,
  labelOf,
}: {
  places: StoryPlace[];
  home: MapPoint | null;
  maxZoom: number;
  labelOf: (place: StoryPlace) => string;
}) => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const placeColor = usePlaceColor();
  const camera = fitCamera(
    home ? [home, ...places] : places,
    {
      width,
      height,
      top: insets.top + 76 + PIN_ABOVE + PIN_INSET,
      bottom: insets.bottom + 84 + CARD_HEIGHT + PIN_BELOW,
      left: PIN_INSET * 3,
      right: PIN_INSET * 3,
    },
    maxZoom
  );
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <PlacesMap center={camera.center} zoom={camera.zoom} />
      {home && <HomePin point={camera.project(home)} />}
      {places.map((place, index) => (
        <Pin
          key={place.name}
          place={place}
          label={labelOf(place)}
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
/** City level for a trip close to home. */
const FAR_MAX_ZOOM = 9;

const daysLabel = (place: StoryPlace) =>
  t("recaps_story_days", { count: place.days });

/** Distance from home per trip city, for the trip labels. */
const kmLabels = (slide: FarOutSlide) => {
  const km = new Map(slide.trips.map((trip) => [trip.name, trip.km]));
  return (place: StoryPlace) =>
    t("recaps_story_far_km", { km: km.get(place.name) ?? 0 });
};

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
      home={null}
      maxZoom={CLOSE_MAX_ZOOM}
      labelOf={daysLabel}
    />
  ) : (
    <PlacesMapBackdrop
      places={slide.trips}
      home={slide.home}
      maxZoom={FAR_MAX_ZOOM}
      labelOf={kmLabels(slide)}
    />
  );
};

/** Title and line of a places slide, by how many places it shows. */
const placesCopy = (slide: CloseBySlide | FarOutSlide) => {
  if (slide.type === "far-out") {
    const [first] = slide.trips;
    return {
      eyebrow: t("recaps_story_far_eyebrow"),
      title:
        slide.trips.length === 1
          ? t("recaps_story_far_title_single")
          : t("recaps_story_far_title_many"),
      text: first
        ? t("recaps_story_city_km", { city: first.name, km: first.km })
        : "",
    };
  }
  const count = slide.places.length;
  const place = slide.places[0]?.name ?? "";
  let title = t("recaps_story_close_title_many");
  if (count === 1) {
    title = t("recaps_story_close_title_single");
  } else if (count <= THRESHOLDS.storyCloseByFewMax) {
    title = t("recaps_story_close_title_few");
  }
  return {
    eyebrow: t("recaps_story_close_eyebrow"),
    title,
    text:
      count === 1
        ? t("recaps_story_close_text_single", { place })
        : t("recaps_story_close_text", { place }),
  };
};

/** Map slide: one card at the bottom. Sky slide: header and a place list. */
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
  const labelOf = slide.type === "close-by" ? daysLabel : kmLabels(slide);
  if (HAS_PLACES_MAP) {
    return (
      <>
        <View style={{ flex: 1 }} />
        <Animated.View
          entering={FadeInDown.delay(900)}
          style={{
            gap: 4,
            padding: 18,
            borderRadius: RADIUS.lg,
            borderCurve: "continuous",
            backgroundColor: STORY_PALETTE[theme].background,
            boxShadow: "0 -4px 24px rgba(0,0,0,0.15)",
          }}
        >
          <StoryText kind="eyebrow" theme={theme} tone="muted">
            {copy.eyebrow}
          </StoryText>
          <StoryText
            kind="title"
            theme={theme}
            style={{ fontSize: 22, lineHeight: 26 }}
          >
            {copy.title}
          </StoryText>
          <StoryText kind="body" theme={theme} tone="muted">
            {copy.text}
          </StoryText>
        </Animated.View>
      </>
    );
  }
  return (
    <>
      <SlideHeader theme={theme} eyebrow={copy.eyebrow} title={copy.title} />
      <View style={{ height: 8 }} />
      <StoryText kind="body" theme={theme} tone="muted">
        {copy.text}
      </StoryText>
      <View style={{ flex: 1 }} />
      <View style={{ gap: 8 }}>
        {places.map((place, index) => (
          <Animated.View
            key={place.name}
            entering={FadeInDown.delay(300 + index * 120)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              padding: 8,
              borderRadius: RADIUS.md,
              borderCurve: "continuous",
              backgroundColor:
                theme === "paper"
                  ? "rgba(255,255,255,0.8)"
                  : STORY_PALETTE.night.surface,
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
              {labelOf(place)}
            </StoryText>
          </Animated.View>
        ))}
      </View>
    </>
  );
};
