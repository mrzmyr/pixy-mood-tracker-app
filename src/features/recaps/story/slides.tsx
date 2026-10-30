import dayjs from "dayjs";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import MapPin from "lucide-react-native/icons/map-pin";
import { RADIUS } from "@/constants/radius";
import type { Person } from "@/features/people";
import type { Tag } from "@/features/tags";
import useColors from "@/hooks/use-colors";
import { EmotionIndicator, EMOTIONS } from "@/features/logger";
import { t, tDynamic } from "@/lib/translation";
import { CHIP } from "../chip-marker";
import { addDays, daysBetween } from "../days";
import { RingedAvatar } from "../components/ringed-avatar";
import { ChipText } from "../components/title-chip";
import type { DateKey, Period, RecapDay } from "../types";
import {
  dateOfWeekday,
  dayRange,
  monthName,
  shortDay,
  weekdayName,
} from "./format";
import {
  MonthGrid,
  Pixel,
  SlideHeader,
  StoryImage,
  StoryText,
  TagDot,
  TagLabel,
  TitleTag,
  useDayColors,
} from "./parts";
import { Orbit } from "./orbit";
import {
  BestDay,
  Places,
  PlacesBackdrop,
  SkyBackdrop,
  TopEmotions,
  WeekMood,
} from "./week-slides";
import { STORY_PALETTE } from "./theme";
import { getSlideDuration } from "./timing";
import type {
  CameBackSlide,
  ComingUpSlide,
  CoverSlide,
  FirstCitySlide,
  HardPatternSlide,
  LiftedSlide,
  MadeOfSlide,
  MomentsSlide,
  StoryPhoto,
  PeopleSlide,
  StorySlide,
  VsLastSlide,
  WeekdayHabitSlide,
} from "./types";

/** What every slide renderer reads besides its own data. */
export interface SlideContext {
  period: Period;
  days: RecapDay[];
  history: RecapDay[];
  today: DateKey;
  tags: ReadonlyMap<string, Tag>;
  people: ReadonlyMap<string, Person>;
  /** App in dark mode: `paper` slides draw as `night`. */
  isDark: boolean;
}

const Gap = ({ size }: { size: number }) => <View style={{ height: size }} />;

/** Photos zoom in this much while they show (Ken Burns). */
const PHOTO_ZOOM = 0.08;
/** Photos drift sideways this far while they zoom, in points. */
const PHOTO_DRIFT = 10;
/** Crossfade from one photo to the next, in milliseconds. */
const PHOTO_FADE_MS = 600;

const clamp = (value: number, min: number, max: number) => {
  "worklet";
  return Math.min(max, Math.max(min, value));
};

/**
 * One photo of the backdrop. Each photo owns an equal part of the slide's
 * `progress`: it fades in over the one before, then zooms and drifts.
 * Paused slides hold still, because `progress` does.
 */
const BackdropPhoto = ({
  photo,
  position,
  count,
  fade,
  progress,
}: {
  photo: StoryPhoto;
  position: number;
  count: number;
  /** Crossfade as a share of one photo's time. */
  fade: number;
  progress: SharedValue<number>;
}) => {
  const isReduced = useReducedMotion();
  const style = useAnimatedStyle(() => {
    // Below 0 before its turn, 0 to 1 during it.
    const local = progress.get() * count - position;
    const motion = isReduced ? 0 : clamp((local + fade) / (1 + fade), 0, 1);
    return {
      opacity: position === 0 ? 1 : clamp((local + fade) / fade, 0, 1),
      transform: [
        { scale: 1 + PHOTO_ZOOM * motion },
        { translateX: (position % 2 === 0 ? -1 : 1) * PHOTO_DRIFT * motion },
      ],
    };
  });
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <StoryImage
        photo={photo.photo}
        style={{ ...StyleSheet.absoluteFill, borderRadius: 0 }}
      />
    </Animated.View>
  );
};

/** Full-screen photos one after another, darkened at top and bottom for text. */
const PhotoBackdrop = ({
  photos,
  progress,
  durationMs,
}: {
  photos: StoryPhoto[];
  progress: SharedValue<number>;
  durationMs: number;
}) => (
  <>
    {photos.map((photo, position) => (
      <BackdropPhoto
        key={photo.photo.id}
        photo={photo}
        position={position}
        count={photos.length}
        fade={(PHOTO_FADE_MS * photos.length) / durationMs}
        progress={progress}
      />
    ))}
    <LinearGradient
      colors={["rgba(0,0,0,0.55)", "rgba(0,0,0,0)", "rgba(0,0,0,0.6)"]}
      locations={[0, 0.45, 1]}
      style={StyleSheet.absoluteFill}
    />
  </>
);

// ---------------------------------------------------------------- cover

const Cover = ({ slide, ctx }: { slide: CoverSlide; ctx: SlideContext }) => {
  const dayColors = useDayColors(ctx.days);
  const isWeek = ctx.period.kind === "week";
  const month = monthName(ctx.period.start);
  const eyebrow = isWeek
    ? dayRange(ctx.period.start, ctx.period.end)
    : `${month} ${dayjs(ctx.period.start).format("YYYY")}`;
  const theme = slide.variant === "photo" ? "photo" : "night";
  const byDate = new Map(slide.photos.map((item) => [item.date, item.photo]));
  return (
    <>
      <SlideHeader
        theme={theme}
        eyebrow={eyebrow}
        title={
          slide.variant === "pixels" ? (
            <>
              <StoryText kind="number" theme={theme}>
                {slide.checkIns}
              </StoryText>
              {"\n"}
              {isWeek
                ? t("recaps_story_cover_pixels_title_week")
                : t("recaps_story_cover_pixels_title", { month })}
            </>
          ) : (
            t(
              isWeek
                ? "recaps_story_cover_title_week"
                : "recaps_story_cover_title",
              { month }
            )
          )
        }
      />
      {slide.variant !== "photo" && (
        <View style={{ marginTop: 28, gap: 16 }}>
          <MonthGrid
            period={ctx.period}
            dayColors={dayColors}
            size={40}
            gap={6}
            empty={STORY_PALETTE.night.empty}
            render={(date) => {
              const photo = byDate.get(date);
              return photo ? (
                <StoryImage
                  photo={photo}
                  style={{ width: 40, height: 40, borderRadius: 9 }}
                />
              ) : null;
            }}
          />
          {slide.variant === "photos" && (
            <StoryText kind="body" theme={theme} tone="muted">
              {t("recaps_story_cover_photos_text", {
                count: slide.photos.length,
                days: slide.checkIns,
              })}
            </StoryText>
          )}
        </View>
      )}
    </>
  );
};

// ---------------------------------------------------------------- same weekday

const WeekdayHabit = ({
  slide,
  ctx,
}: {
  slide: WeekdayHabitSlide;
  ctx: SlideContext;
}) => {
  const colors = useColors();
  const tag = ctx.tags.get(slide.tagId);
  if (!tag) {
    return null;
  }
  const weekday = weekdayName(dateOfWeekday(slide.weekday));
  const tagged = new Set<DateKey>();
  for (const day of ctx.days) {
    if (day.items.some((item) => item.tags.some(({ id }) => id === tag.id))) {
      tagged.add(day.date);
    }
  }
  const theme = "night";
  const size = 34;
  return (
    <>
      <SlideHeader
        theme={theme}
        eyebrow={t("recaps_story_weekday_eyebrow")}
        title={t(
          slide.hits === slide.total
            ? "recaps_story_weekday_title_every"
            : "recaps_story_weekday_title_most",
          { tag: tag.title, weekday }
        )}
      />
      <View style={{ marginTop: 28 }}>
        <MonthGrid
          period={ctx.period}
          dayColors={new Map()}
          size={size}
          gap={8}
          empty={STORY_PALETTE.night.surface}
          render={(date) => {
            const isHit =
              dayjs(date).day() === slide.weekday && tagged.has(date);
            return (
              <View
                style={{
                  width: size,
                  height: size,
                  borderRadius: RADIUS.full,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isHit
                    ? colors.tags[tag.color]?.dot
                    : STORY_PALETTE.night.surface,
                }}
              >
                <Text
                  maxFontSizeMultiplier={1}
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: isHit ? "#0A0A0A" : STORY_PALETTE.night.muted,
                  }}
                >
                  {dayjs(date).date()}
                </Text>
              </View>
            );
          }}
        />
      </View>
      <Gap size={20} />
      <StoryText kind="body" theme={theme} tone="muted">
        {t("recaps_story_weekday_text", {
          hits: slide.hits,
          total: slide.total,
        })}
        {slide.previous &&
          ` ${t("recaps_story_weekday_previous", {
            month: monthName(addDays(ctx.period.start, -1)),
            hits: slide.previous.hits,
            total: slide.previous.total,
          })}`}
      </StoryText>
    </>
  );
};

// ---------------------------------------------------------------- made of

const MadeOf = ({ slide, ctx }: { slide: MadeOfSlide; ctx: SlideContext }) => {
  const colors = useColors();
  const count = daysBetween(ctx.period.start, ctx.period.end) + 1;
  const dates = Array.from({ length: count }, (_, index) =>
    addDays(ctx.period.start, index)
  );
  const tagsByDate = new Map(
    ctx.days.map((day) => [
      day.date,
      new Set(day.items.flatMap((item) => item.tags.map(({ id }) => id))),
    ])
  );
  return (
    <>
      <SlideHeader
        theme="night"
        eyebrow={
          ctx.period.kind === "week"
            ? t("recaps_story_made_of_eyebrow_week")
            : t("recaps_story_made_of_eyebrow", {
                month: monthName(ctx.period.start),
              })
        }
        title={t("recaps_story_made_of_title")}
      />
      <View style={{ marginTop: 28, gap: 18 }}>
        {slide.tagIds.map((id) => {
          const tag = ctx.tags.get(id);
          return tag ? (
            <View key={id} style={{ gap: 8 }}>
              <TagLabel tag={tag} theme="night" />
              <View style={{ flexDirection: "row", gap: 2 }}>
                {dates.map((date) => (
                  <View
                    key={date}
                    style={{
                      flex: 1,
                      height: 22,
                      borderRadius: 3,
                      backgroundColor: tagsByDate.get(date)?.has(id)
                        ? colors.tags[tag.color]?.dot
                        : STORY_PALETTE.night.surface,
                    }}
                  />
                ))}
              </View>
            </View>
          ) : null;
        })}
      </View>
    </>
  );
};

// ---------------------------------------------------------------- lifted

const Lifted = ({ slide, ctx }: { slide: LiftedSlide; ctx: SlideContext }) => {
  const colors = useColors();
  const [top] = slide.rows;
  const topTag = top && ctx.tags.get(top.tagId);
  if (!topTag) {
    return null;
  }
  const max = Math.max(...slide.rows.map((row) => row.delta));
  return (
    <>
      <SlideHeader
        theme="night"
        eyebrow={t("recaps_story_lifted_eyebrow", {
          month: monthName(ctx.period.start),
        })}
        title={t("recaps_story_lifted_title", { tag: topTag.title })}
      />
      <View style={{ marginTop: 28, gap: 16 }}>
        {slide.rows.map((row) => {
          const tag = ctx.tags.get(row.tagId);
          return tag ? (
            <View key={row.tagId} style={{ gap: 8 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <TagLabel tag={tag} theme="night" />
                <StoryText kind="label" theme="night" tone="muted">
                  {t("recaps_story_days", { count: row.days })}
                </StoryText>
              </View>
              <View
                style={{
                  height: 12,
                  borderRadius: RADIUS.full,
                  backgroundColor: STORY_PALETTE.night.surface,
                }}
              >
                <View
                  style={{
                    width: `${Math.max(12, (row.delta / max) * 100)}%`,
                    height: 12,
                    borderRadius: RADIUS.full,
                    backgroundColor: colors.tags[tag.color]?.dot,
                  }}
                />
              </View>
            </View>
          ) : null;
        })}
      </View>
      <Gap size={20} />
      <StoryText kind="body" theme="night" tone="muted">
        {t("recaps_story_lifted_text", { count: ctx.days.length })}
      </StoryText>
    </>
  );
};

// ---------------------------------------------------------------- people

const People = ({ slide, ctx }: { slide: PeopleSlide; ctx: SlideContext }) => {
  const dayColors = useDayColors(ctx.days);
  return (
    <>
      <SlideHeader
        theme="night"
        eyebrow={t("recaps_story_people_eyebrow")}
        title={t("recaps_story_people_title")}
      />
      <View style={{ marginTop: 28, gap: 22 }}>
        {slide.people.map(({ personId, days }) => {
          const person = ctx.people.get(personId);
          return person ? (
            <View key={personId} style={{ gap: 10 }}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <RingedAvatar person={person} size={36} />
                <View style={{ flexShrink: 1 }}>
                  <StoryText kind="label" theme="night" numberOfLines={1}>
                    {person.name}
                  </StoryText>
                  <StoryText kind="label" theme="night" tone="muted">
                    {t("recaps_story_people_days", { count: days.length })}
                  </StoryText>
                </View>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                {days.map((date) => (
                  <Pixel
                    key={date}
                    size={18}
                    color={dayColors.get(date) ?? STORY_PALETTE.night.empty}
                  />
                ))}
              </View>
            </View>
          ) : null;
        })}
      </View>
      <Gap size={20} />
      <StoryText kind="body" theme="night" tone="muted">
        {t("recaps_story_people_text")}
      </StoryText>
    </>
  );
};

// ---------------------------------------------------------------- harder days

const HardPattern = ({
  slide,
  ctx,
}: {
  slide: HardPatternSlide;
  ctx: SlideContext;
}) => {
  const colors = useColors();
  const tag = ctx.tags.get(slide.tagId);
  if (!tag) {
    return null;
  }
  const theme = ctx.isDark ? "night" : "paper";
  const palette = STORY_PALETTE[theme];
  const hasTag = (day: RecapDay) =>
    day.items.some((item) => item.tags.some(({ id }) => id === tag.id));
  const hardSet = new Set(slide.hardDates);
  const others = ctx.days.filter((day) => !hardSet.has(day.date));
  const hardDays = ctx.days.filter((day) => hardSet.has(day.date));
  const title = t("recaps_story_hard_title", { tag: CHIP });
  return (
    <>
      <View style={{ gap: 8 }}>
        <StoryText kind="eyebrow" theme={theme} tone="muted">
          {t("recaps_story_hard_eyebrow")}
        </StoryText>
        <Text
          accessibilityRole="header"
          accessibilityLabel={title.replace(CHIP, tag.title)}
        >
          <StoryText kind="title" theme={theme} style={{ lineHeight: 40 }}>
            <ChipText
              text={title}
              chip={<TitleTag tag={tag} theme={theme} />}
            />
          </StoryText>
        </Text>
      </View>
      <View style={{ marginTop: 24, gap: 8 }}>
        <StoryText kind="label" theme={theme} tone="muted">
          {t("recaps_story_hard_days_label", { count: hardDays.length })}
        </StoryText>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {hardDays.map((day) => (
            <View
              key={day.date}
              style={{
                width: "31%",
                minHeight: 84,
                padding: 10,
                borderRadius: 14,
                borderCurve: "continuous",
                backgroundColor: palette.surface,
              }}
            >
              {hasTag(day) && (
                <View style={{ position: "absolute", top: 10, right: 10 }}>
                  <TagDot tag={tag} />
                </View>
              )}
              <StoryText kind="label" theme={theme} style={{ fontSize: 16 }}>
                {shortDay(day.date)}
              </StoryText>
              <StoryText kind="label" theme={theme} tone="muted">
                {weekdayName(day.date)}
              </StoryText>
            </View>
          ))}
        </View>
        <Gap size={10} />
        <StoryText kind="label" theme={theme} tone="muted">
          {t("recaps_story_hard_other_label", { count: others.length })}
        </StoryText>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
          {others.map((day) => (
            <Pixel
              key={day.date}
              size={14}
              color={
                hasTag(day)
                  ? (colors.tags[tag.color]?.dot ?? palette.empty)
                  : "#E4E4E7"
              }
            />
          ))}
        </View>
      </View>
      <Gap size={16} />
      <StoryText kind="body" theme={theme} tone="muted">
        {t(
          slide.tagOther === 0
            ? "recaps_story_hard_text_none"
            : "recaps_story_hard_text",
          {
            hard: slide.tagHard,
            total: slide.hardDates.length,
            other: slide.tagOther,
            otherDays: slide.otherDays,
          }
        )}
      </StoryText>
    </>
  );
};

// ---------------------------------------------------------------- first city

const FirstCity = ({
  slide,
  ctx,
}: {
  slide: FirstCitySlide;
  ctx: SlideContext;
}) => {
  const theme = slide.photo ? "photo" : "night";
  const dayColors = useDayColors(ctx.days);
  const there = ctx.days.filter(
    (day) =>
      day.date >= slide.date &&
      day.items.some((item) => item.location?.name?.endsWith(slide.city))
  );
  return (
    <>
      <SlideHeader
        theme={theme}
        eyebrow={t("recaps_story_city_eyebrow")}
        title={t("recaps_story_city_title", { city: slide.city })}
      />
      <View style={{ flex: 1 }} />
      <View style={{ flexDirection: "row", gap: 6, marginBottom: 12 }}>
        {there.map((day) => (
          <Pixel
            key={day.date}
            size={28}
            color={dayColors.get(day.date) ?? STORY_PALETTE.night.empty}
          />
        ))}
      </View>
      <View
        style={{
          alignSelf: "flex-start",
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingHorizontal: 12,
          paddingVertical: 7,
          borderRadius: RADIUS.full,
          backgroundColor: STORY_PALETTE.photo.surface,
        }}
      >
        <MapPin width={14} height={14} color="#FFFFFF" />
        <StoryText kind="label" theme="photo">
          {slide.km === null
            ? slide.city
            : t("recaps_story_city_km", { city: slide.city, km: slide.km })}
        </StoryText>
      </View>
    </>
  );
};

// ---------------------------------------------------------------- vs last month

const VsLast = ({ slide, ctx }: { slide: VsLastSlide; ctx: SlideContext }) => {
  const previous = monthName(slide.previousStart);
  return (
    <>
      <SlideHeader
        theme="night"
        eyebrow={t("recaps_story_vs_eyebrow", {
          month: monthName(ctx.period.start),
          previous,
        })}
        title={t("recaps_story_vs_title")}
      />
      <View style={{ marginTop: 28, gap: 8 }}>
        {slide.rows.map((row) => {
          const tag = ctx.tags.get(row.tagId);
          return tag ? (
            <View
              key={row.tagId}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderRadius: RADIUS.md,
                borderCurve: "continuous",
                backgroundColor: STORY_PALETTE.night.surface,
              }}
            >
              <View style={{ flex: 1 }}>
                <TagLabel tag={tag} theme="night" />
              </View>
              <StoryText kind="label" theme="night" style={{ fontSize: 17 }}>
                {row.days}
              </StoryText>
              <StoryText
                kind="label"
                theme="night"
                tone={row.change > 0 ? "accent" : "muted"}
                style={{ width: 36, textAlign: "right" }}
              >
                {row.change > 0 ? `+${row.change}` : `${row.change}`}
              </StoryText>
            </View>
          ) : null;
        })}
      </View>
      <Gap size={16} />
      <StoryText kind="body" theme="night" tone="muted">
        {t("recaps_story_vs_text", { previous })}
      </StoryText>
    </>
  );
};

// ---------------------------------------------------------------- came back

/** Emotion category color as a round dot, like the check-in dots. */
const EmotionDot = ({ emotionKey }: { emotionKey: string }) => {
  const emotion = EMOTIONS.find((item) => item.key === emotionKey);
  return emotion ? <EmotionIndicator emotion={emotion} /> : null;
};

const CameBack = ({
  slide,
  ctx,
}: {
  slide: CameBackSlide;
  ctx: SlideContext;
}) => {
  const rows = [
    ...slide.emotions.map((back) => ({
      key: `emotion-${back.emotion}`,
      marker: <EmotionDot emotionKey={back.emotion} />,
      name: tDynamic(`log_emotion_${back.emotion}`),
      line: t("recaps_came_back_emotion", { date: shortDay(back.lastDate) }),
    })),
    ...slide.tags.flatMap((back) => {
      const tag = ctx.tags.get(back.tagId);
      return tag
        ? [
            {
              key: `tag-${tag.id}`,
              marker: <TagDot tag={tag} size={14} />,
              name: tag.title,
              line: t("recaps_came_back_tag", {
                count: back.days,
                weeks: back.weeks,
              }),
            },
          ]
        : [];
    }),
  ];
  return (
    <>
      <SlideHeader
        theme="night"
        eyebrow={t("recaps_came_back_title_week")}
        title={t("recaps_story_came_back_title")}
      />
      <Gap size={24} />
      <View style={{ gap: 18 }}>
        {rows.map((row) => (
          <View
            key={row.key}
            accessible
            accessibilityLabel={`${row.name}, ${row.line}`}
            style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}
          >
            <View style={{ width: 18, paddingTop: 6, alignItems: "center" }}>
              {row.marker}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <StoryText
                kind="title"
                theme="night"
                style={{ fontSize: 22, lineHeight: 26 }}
              >
                {row.name}
              </StoryText>
              <StoryText kind="body" theme="night" tone="muted">
                {row.line}
              </StoryText>
            </View>
          </View>
        ))}
      </View>
    </>
  );
};

// ---------------------------------------------------------------- moments

/** Space between photos inside one week. */
const COLLAGE_GAP = 2;

/**
 * Up to 4 photos of one week in a tile: 1 fills it, 2 split it, 3 put the
 * brightest left and two stacked right, 4 make a grid.
 */
const WeekCollage = ({
  photos,
  label,
}: {
  photos: StoryPhoto[];
  label: string;
}) => {
  // Screen readers hear the week once, on the first photo.
  const image = (photo: StoryPhoto) => (
    <StoryImage
      key={photo.photo.id}
      photo={photo.photo}
      label={photo === photos[0] ? label : undefined}
      style={{ flex: 1, borderRadius: 0 }}
    />
  );
  const [first, ...rest] = photos;
  if (!first) {
    return null;
  }
  if (photos.length === 4) {
    return (
      <View style={{ flex: 1, gap: COLLAGE_GAP }}>
        <View style={{ flex: 1, flexDirection: "row", gap: COLLAGE_GAP }}>
          {photos.slice(0, 2).map(image)}
        </View>
        <View style={{ flex: 1, flexDirection: "row", gap: COLLAGE_GAP }}>
          {photos.slice(2).map(image)}
        </View>
      </View>
    );
  }
  return (
    <View style={{ flex: 1, flexDirection: "row", gap: COLLAGE_GAP }}>
      {image(first)}
      {rest.length > 0 && (
        <View style={{ flex: 1, gap: COLLAGE_GAP }}>{rest.map(image)}</View>
      )}
    </View>
  );
};

const Moments = ({
  slide,
  ctx,
}: {
  slide: MomentsSlide;
  ctx: SlideContext;
}) => {
  const dayColors = useDayColors(ctx.days);
  const { width } = useWindowDimensions();
  // Two tiles per row inside the 24 pt slide padding, 8 pt apart.
  const tile = (width - 48 - 8) / 2;
  return (
    <>
      <SlideHeader
        theme="night"
        eyebrow={t("recaps_story_weeks_eyebrow")}
        title={t("recaps_story_weeks_title", {
          month: monthName(ctx.period.start),
        })}
      />
      <View
        style={{
          marginTop: 24,
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        {slide.weeks.map((week) => {
          const range = dayRange(week.start, week.end);
          return (
            <View
              key={week.start}
              style={{
                width: tile,
                height: tile,
                borderRadius: RADIUS.md,
                borderCurve: "continuous",
                overflow: "hidden",
                backgroundColor: STORY_PALETTE.night.surface,
              }}
            >
              {week.photos.length > 0 ? (
                <WeekCollage photos={week.photos} label={range} />
              ) : (
                <View
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    flexWrap: "wrap",
                    alignContent: "center",
                    justifyContent: "center",
                    gap: 4,
                    padding: 16,
                  }}
                >
                  {Array.from(
                    { length: daysBetween(week.start, week.end) + 1 },
                    (_, index) => addDays(week.start, index)
                  ).map((date) => (
                    <Pixel
                      key={date}
                      size={16}
                      color={dayColors.get(date) ?? STORY_PALETTE.night.empty}
                    />
                  ))}
                </View>
              )}
              <View
                style={{
                  position: "absolute",
                  left: 8,
                  bottom: 8,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: RADIUS.full,
                  backgroundColor: "rgba(0,0,0,0.55)",
                }}
              >
                <StoryText kind="label" theme="photo" style={{ fontSize: 12 }}>
                  {range}
                </StoryText>
              </View>
            </View>
          );
        })}
      </View>
    </>
  );
};

// ---------------------------------------------------------------- coming up

const MONTHS = Array.from({ length: 12 }, (_, index) => index);

const ComingUp = ({
  slide,
  ctx,
}: {
  slide: ComingUpSlide;
  ctx: SlideContext;
}) => {
  const { year } = slide;
  const yearDays = ctx.history.filter((day) => day.date.startsWith(`${year}-`));
  const dayColors = useDayColors(yearDays);
  const size = 9;
  const pending = (date: DateKey) =>
    date > ctx.today ? (
      <View
        style={{
          width: size,
          height: size,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            width: 3,
            height: 3,
            borderRadius: 2,
            backgroundColor: "rgba(255,255,255,0.35)",
          }}
        />
      </View>
    ) : null;
  return (
    <>
      <SlideHeader
        theme="night"
        eyebrow={t("recaps_story_coming_eyebrow")}
        title={t("recaps_story_coming_title", { count: slide.left, year })}
      />
      <View
        style={{
          marginTop: 24,
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "space-between",
          rowGap: 14,
        }}
      >
        {MONTHS.map((month) => {
          const start = dayjs(`${year}-01-01`).add(month, "month");
          const period: Period = {
            kind: "month",
            start: start.format("YYYY-MM-DD"),
            end: start.endOf("month").format("YYYY-MM-DD"),
          };
          return (
            <View key={month} style={{ gap: 4 }}>
              <StoryText
                kind="label"
                theme="night"
                tone="muted"
                style={{ fontSize: 12 }}
              >
                {start.format("MMM")}
              </StoryText>
              <MonthGrid
                period={period}
                dayColors={dayColors}
                size={size}
                gap={2}
                empty="#262626"
                render={pending}
              />
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: "row", gap: 16, marginTop: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Pixel size={10} color="#262626" />
          <StoryText
            kind="label"
            theme="night"
            tone="muted"
            style={{ fontSize: 12 }}
          >
            {t("recaps_story_coming_missed", { count: slide.missed })}
          </StoryText>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View
            style={{
              width: 3,
              height: 3,
              borderRadius: 2,
              backgroundColor: "rgba(255,255,255,0.5)",
            }}
          />
          <StoryText
            kind="label"
            theme="night"
            tone="muted"
            style={{ fontSize: 12 }}
          >
            {t("recaps_story_coming_left", { count: slide.left })}
          </StoryText>
        </View>
      </View>
    </>
  );
};

/** Full-screen photos behind photo slides, under the padded content. */
export const SlideBackdrop = ({
  slide,
  previous,
  progress,
}: {
  slide: StorySlide;
  /** Slide before, so a sky can carry on from it. */
  previous?: StorySlide;
  progress: SharedValue<number>;
}) => {
  const durationMs = getSlideDuration(slide);
  if (slide.type === "cover" && slide.variant === "photo") {
    return (
      <PhotoBackdrop
        photos={slide.photos}
        progress={progress}
        durationMs={durationMs}
      />
    );
  }
  if (slide.type === "best-day") {
    return slide.photo ? (
      <PhotoBackdrop
        photos={[slide.photo]}
        progress={progress}
        durationMs={durationMs}
      />
    ) : (
      <SkyBackdrop sun="in" />
    );
  }
  if (slide.type === "week-mood" || slide.type === "top-emotions") {
    // The sun of a sky best day sets while the sky stays.
    const hadSun = previous?.type === "best-day" && !previous.photo;
    return <SkyBackdrop sun={hadSun ? "out" : null} />;
  }
  if (slide.type === "share") {
    return <SkyBackdrop sun={null} />;
  }
  if (slide.type === "close-by" || slide.type === "far-out") {
    return <PlacesBackdrop slide={slide} />;
  }
  if (slide.type === "first-city" && slide.photo) {
    return (
      <PhotoBackdrop
        photos={[slide.photo]}
        progress={progress}
        durationMs={durationMs}
      />
    );
  }
  return null;
};

/** Content of one slide. The player draws background and chrome. */
export const SlideContent = ({
  slide,
  ctx,
}: {
  slide: StorySlide;
  ctx: SlideContext;
}) => {
  switch (slide.type) {
    case "cover": {
      return <Cover slide={slide} ctx={ctx} />;
    }
    case "weekday-habit": {
      return <WeekdayHabit slide={slide} ctx={ctx} />;
    }
    case "made-of": {
      return <MadeOf slide={slide} ctx={ctx} />;
    }
    case "lifted": {
      return <Lifted slide={slide} ctx={ctx} />;
    }
    case "people": {
      return <People slide={slide} ctx={ctx} />;
    }
    case "orbit": {
      return <Orbit slide={slide} ctx={ctx} />;
    }
    case "hard-pattern": {
      return <HardPattern slide={slide} ctx={ctx} />;
    }
    case "first-city": {
      return <FirstCity slide={slide} ctx={ctx} />;
    }
    case "vs-last": {
      return <VsLast slide={slide} ctx={ctx} />;
    }
    case "moments": {
      return <Moments slide={slide} ctx={ctx} />;
    }
    case "coming-up": {
      return <ComingUp slide={slide} ctx={ctx} />;
    }
    case "came-back": {
      return <CameBack slide={slide} ctx={ctx} />;
    }
    case "best-day": {
      return <BestDay slide={slide} ctx={ctx} />;
    }
    case "week-mood": {
      return <WeekMood slide={slide} ctx={ctx} />;
    }
    case "top-emotions": {
      return <TopEmotions slide={slide} ctx={ctx} />;
    }
    case "close-by":
    case "far-out": {
      return <Places slide={slide} ctx={ctx} />;
    }
    default: {
      return null;
    }
  }
};
