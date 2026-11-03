import dayjs from "dayjs";
import { use, useLayoutEffect, useRef } from "react";
import { Image, Text, useWindowDimensions, View } from "react-native";
import type { View as ViewType } from "react-native";
import { getAvatarUri, getInitials } from "@/features/people";
import type { Person } from "@/features/people";
import { getPhotoFile } from "@/features/photos";
import { useProfile } from "@/features/profile";
import useColors from "@/hooks/use-colors";
import { RADIUS } from "@/constants/radius";
import { t } from "@/lib/translation";
import type { DateKey, Period } from "../types";
import { dayRange, monthName, monthYear, weekdayDay } from "./format";
import { firstName, ORBIT_SIZE, placePlanets } from "./orbit-layout";
import { MonthGrid, Pixel, TagDot, useDayColors } from "./parts";
import { ImageGateContext } from "./image-gate";
import type { ImageGate } from "./image-gate";
import { StoryBrand } from "./story-brand";
import type { SlideContext } from "./slides";
import { STORY_MAX_FONT_SCALE, STORY_TYPE } from "./theme";
import type { StoryPhoto, StorySlide } from "./types";

/** Share image: 4:5 portrait, the shape feeds and chats show in full. */
const RATIO = 1.25;
const PADDING = 28;
const GAP = 6;

/** Solid colors of the share image. Fixed: the image looks the same anywhere. */
const FRAME = {
  light: {
    background: "#FAFAF9",
    text: "#0A0A0A",
    muted: "#71717A",
    empty: "#E7E5E4",
    faint: "rgba(10,10,10,0.08)",
    logged: "#A1A1AA",
  },
  dark: {
    background: "#0A0A0A",
    text: "#FFFFFF",
    muted: "rgba(255,255,255,0.6)",
    empty: "#262626",
    faint: "rgba(255,255,255,0.1)",
    logged: "#71717A",
  },
};

type FrameColors = (typeof FRAME)["light"];

/**
 * React Native `Image`, as the logo: Android Glide in expo-image can decode
 * to hardware bitmaps, which react-native-view-shot rejects. Holds the
 * capture until it loaded or failed.
 */
const FrameImage = ({
  uri,
  size,
  radius,
  background,
}: {
  uri: string;
  size: number;
  radius: number;
  background: string;
}) => {
  const gate = use(ImageGateContext);
  const isDone = useRef(false);
  // Before the frame's first layout event, so the capture waits.
  useLayoutEffect(() => {
    gate?.add();
  }, [gate]);
  const done = () => {
    if (!isDone.current) {
      isDone.current = true;
      gate?.done();
    }
  };
  return (
    <Image
      source={{ uri }}
      resizeMode="cover"
      onLoadEnd={done}
      onError={done}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: background,
      }}
    />
  );
};

const FrameText = ({
  kind,
  color,
  children,
  numberOfLines,
  style,
}: {
  kind: keyof typeof STORY_TYPE;
  color: string;
  children: React.ReactNode;
  numberOfLines?: number;
  style?: object;
}) => (
  <Text
    maxFontSizeMultiplier={STORY_MAX_FONT_SCALE}
    numberOfLines={numberOfLines}
    style={[STORY_TYPE[kind], { color }, style]}
  >
    {children}
  </Text>
);

/** Round avatar from a file, else initials on the faint fill. */
const FrameAvatar = ({
  uri,
  initials,
  size,
  colors,
}: {
  uri: string | null;
  initials: string;
  size: number;
  colors: FrameColors;
}) =>
  uri ? (
    <FrameImage
      uri={uri}
      size={size}
      radius={size / 2}
      background={colors.faint}
    />
  ) : (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.faint,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        allowFontScaling={false}
        style={{
          fontSize: Math.round(size * 0.38),
          fontWeight: "600",
          color: colors.muted,
        }}
      >
        {initials}
      </Text>
    </View>
  );

const NO_PHOTOS: StoryPhoto[] = [];

/** Month of pixels in solid mood colors, photos in their days. */
const FrameMonth = ({
  ctx,
  width,
  colors,
  photos = NO_PHOTOS,
}: {
  ctx: SlideContext;
  width: number;
  colors: FrameColors;
  photos?: StoryPhoto[];
}) => {
  const dayColors = useDayColors(ctx.days);
  const cell = Math.floor((width - GAP * 6) / 7);
  const byDate = new Map(photos.map((item) => [item.date, item.photo]));
  return (
    <MonthGrid
      period={ctx.period}
      dayColors={dayColors}
      size={cell}
      gap={GAP}
      empty={colors.empty}
      render={(date) => {
        const photo = byDate.get(date);
        return photo ? (
          <FrameImage
            uri={getPhotoFile(photo).uri}
            size={cell}
            radius={Math.max(3, cell * 0.22)}
            background={colors.empty}
          />
        ) : null;
      }}
    />
  );
};

const FrameTags = ({
  slide,
  ctx,
  colors,
}: {
  slide: StorySlide & { type: "positive-tags" | "negative-tags" };
  ctx: SlideContext;
  colors: FrameColors;
}) => {
  const tagColors = useColors().tags;
  const max = Math.max(...slide.rows.map((row) => Math.abs(row.delta)));
  return (
    <View style={{ gap: 22 }}>
      {slide.rows.map((row) => {
        const tag = ctx.tags.get(row.tagId);
        if (!tag) {
          return null;
        }
        return (
          <View key={row.tagId} style={{ gap: 10 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  flexShrink: 1,
                }}
              >
                <TagDot tag={tag} />
                <FrameText kind="label" color={colors.text} numberOfLines={1}>
                  {tag.title}
                </FrameText>
              </View>
              <FrameText kind="label" color={colors.muted}>
                {t("recaps_story_days", { count: row.days })}
              </FrameText>
            </View>
            <View
              style={{
                height: 12,
                borderRadius: RADIUS.full,
                backgroundColor: colors.faint,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  height: 12,
                  borderRadius: RADIUS.full,
                  width: `${Math.max(0.08, Math.abs(row.delta) / max) * 100}%`,
                  backgroundColor: tagColors[tag.color]?.dot,
                }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
};

const avatarOf = (person: Person) =>
  person.avatar ? getAvatarUri(person.avatar) : null;

/** The orbit standing still: you in the middle, people on their rings. */
const FrameOrbit = ({
  slide,
  ctx,
  width,
  colors,
}: {
  slide: StorySlide & { type: "orbit" };
  ctx: SlideContext;
  width: number;
  colors: FrameColors;
}) => {
  const profile = useProfile();
  const planets = placePlanets(slide, ctx.people, width);
  const self = Math.round(width * ORBIT_SIZE.self);
  const center = width / 2;
  const radii = [
    ...new Set(planets.map((planet) => Math.round(planet.radius))),
  ];
  return (
    <View style={{ width, height: width }}>
      {radii.map((radius) => (
        <View
          key={radius}
          style={{
            position: "absolute",
            left: center - radius,
            top: center - radius,
            width: radius * 2,
            height: radius * 2,
            borderRadius: radius,
            borderWidth: 1,
            borderColor: colors.faint,
          }}
        />
      ))}
      <View
        style={{
          position: "absolute",
          left: center - self / 2,
          top: center - self / 2,
        }}
      >
        <FrameAvatar
          uri={profile.photoUri}
          initials={profile.initials}
          size={self}
          colors={colors}
        />
      </View>
      {planets.map((planet) => (
        <View
          key={planet.person.id}
          style={{
            position: "absolute",
            left: center + Math.cos(planet.angle) * planet.radius - 40,
            top:
              center + Math.sin(planet.angle) * planet.radius - planet.size / 2,
            width: 80,
            alignItems: "center",
            gap: 4,
          }}
        >
          <FrameAvatar
            uri={avatarOf(planet.person)}
            initials={getInitials(planet.person.name)}
            size={planet.size}
            colors={colors}
          />
          <FrameText kind="label" color={colors.muted} numberOfLines={1}>
            {firstName(planet.person.name)}
          </FrameText>
        </View>
      ))}
    </View>
  );
};

const MONTHS = Array.from({ length: 12 }, (_, index) => index);

/** The year as 12 small months: logged days in one neutral tone. */
const FrameYear = ({
  slide,
  ctx,
  width,
  colors,
}: {
  slide: StorySlide & { type: "coming-up" };
  ctx: SlideContext;
  width: number;
  colors: FrameColors;
}) => {
  const logged = new Map<DateKey, string>();
  for (const day of ctx.history) {
    if (day.date.startsWith(`${slide.year}-`)) {
      logged.set(day.date, colors.logged);
    }
  }
  // 3 months a row, 7 days each.
  const cell = Math.floor((width - 2 * 20 - 3 * 6 * 2) / 21);
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        rowGap: 16,
      }}
    >
      {MONTHS.map((month) => {
        const start = dayjs(`${slide.year}-01-01`).add(month, "month");
        const period: Period = {
          kind: "month",
          start: start.format("YYYY-MM-DD"),
          end: start.endOf("month").format("YYYY-MM-DD"),
        };
        return (
          <View key={month} style={{ gap: 4 }}>
            <FrameText
              kind="label"
              color={colors.muted}
              style={{ fontSize: 12 }}
            >
              {start.format("MMM")}
            </FrameText>
            <MonthGrid
              period={period}
              dayColors={logged}
              size={cell}
              gap={2}
              empty={colors.empty}
            />
          </View>
        );
      })}
    </View>
  );
};

const NEW_AVATAR = 64;

/** People new this month, side by side with their first names. */
const FramePeople = ({
  slide,
  ctx,
  colors,
}: {
  slide: StorySlide & { type: "new-people" };
  ctx: SlideContext;
  colors: FrameColors;
}) => (
  <View
    style={{
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: 20,
    }}
  >
    {slide.people.flatMap(({ personId }) => {
      const person = ctx.people.get(personId);
      return person
        ? [
            <View
              key={personId}
              style={{ width: 80, alignItems: "center", gap: 6 }}
            >
              <FrameAvatar
                uri={avatarOf(person)}
                initials={getInitials(person.name)}
                size={NEW_AVATAR}
                colors={colors}
              />
              <FrameText kind="label" color={colors.muted} numberOfLines={1}>
                {firstName(person.name)}
              </FrameText>
            </View>,
          ]
        : [];
    })}
  </View>
);

/** The best day: its date and up to 3 of its photos, else its pixel. */
const FrameBestDay = ({
  slide,
  ctx,
  width,
  colors,
}: {
  slide: StorySlide & { type: "best-day" };
  ctx: SlideContext;
  width: number;
  colors: FrameColors;
}) => {
  const day = ctx.days.find((item) => item.date === slide.date);
  const dayColors = useDayColors(day ? [day] : []);
  const photos = (day?.items ?? []).flatMap((item) => item.photos).slice(0, 3);
  const size = Math.floor((width - GAP * 2) / 3);
  return (
    <View style={{ gap: 16, alignItems: "flex-start" }}>
      <FrameText kind="title" color={colors.text}>
        {weekdayDay(slide.date)}
      </FrameText>
      {photos.length > 0 ? (
        <View style={{ flexDirection: "row", gap: GAP }}>
          {photos.map((photo) => (
            <FrameImage
              key={photo.id}
              uri={getPhotoFile(photo).uri}
              size={size}
              radius={RADIUS.md}
              background={colors.empty}
            />
          ))}
        </View>
      ) : (
        <Pixel size={size} color={dayColors.get(slide.date) ?? colors.empty} />
      )}
    </View>
  );
};

/** Month and year, "October 2026"; a week reads "Oct 26 – Nov 1". */
const periodLabel = (period: Period) =>
  period.kind === "week"
    ? dayRange(period.start, period.end)
    : monthYear(period.start);

const headingOf = (slide: StorySlide, period: Period) => {
  switch (slide.type) {
    case "cover": {
      return t("recaps_story_share_heading_cover");
    }
    case "positive-tags": {
      return t("recaps_story_share_heading_lifted");
    }
    case "negative-tags": {
      return t("recaps_story_share_heading_hard");
    }
    case "orbit": {
      return t("recaps_story_share_heading_orbit");
    }
    case "coming-up": {
      return t("recaps_story_share_heading_coming");
    }
    case "new-people": {
      return t("recaps_story_share_heading_new");
    }
    case "best-day": {
      return t("recaps_story_share_heading_best");
    }
    default: {
      return period.kind === "week"
        ? t("recaps_story_share_title_week")
        : t("recaps_story_share_title", { month: monthName(period.start) });
    }
  }
};

const FrameContent = ({
  slide,
  ctx,
  photos,
  width,
  colors,
}: {
  slide: StorySlide;
  ctx: SlideContext;
  photos: StoryPhoto[];
  width: number;
  colors: FrameColors;
}) => {
  switch (slide.type) {
    case "cover": {
      return (
        <FrameMonth
          ctx={ctx}
          width={width}
          colors={colors}
          photos={slide.photos}
        />
      );
    }
    case "positive-tags":
    case "negative-tags": {
      return <FrameTags slide={slide} ctx={ctx} colors={colors} />;
    }
    case "orbit": {
      return (
        <FrameOrbit slide={slide} ctx={ctx} width={width} colors={colors} />
      );
    }
    case "coming-up": {
      return (
        <FrameYear slide={slide} ctx={ctx} width={width} colors={colors} />
      );
    }
    case "new-people": {
      return <FramePeople slide={slide} ctx={ctx} colors={colors} />;
    }
    case "best-day": {
      return (
        <FrameBestDay slide={slide} ctx={ctx} width={width} colors={colors} />
      );
    }
    case "share": {
      const size = Math.floor((width - GAP * 2) / 3);
      return (
        <View style={{ gap: 16 }}>
          <FrameMonth ctx={ctx} width={width} colors={colors} />
          {photos.length > 0 && (
            <View style={{ flexDirection: "row", gap: GAP }}>
              {photos.map((photo) => (
                <FrameImage
                  key={photo.photo.id}
                  uri={getPhotoFile(photo.photo).uri}
                  size={size}
                  radius={RADIUS.md}
                  background={colors.empty}
                />
              ))}
            </View>
          )}
        </View>
      );
    }
    default: {
      return null;
    }
  }
};

/**
 * Image the Share button sends: a calm, solid card with the heading on top,
 * the slide's content in the middle, and the app in the bottom left. Drawn
 * behind the story only while it is captured, never on screen. Calls
 * `gate` once laid out and every image loaded.
 */
export const ShareFrame = ({
  slide,
  ctx,
  photos,
  frameRef,
  gate,
}: {
  slide: StorySlide;
  ctx: SlideContext;
  /** Photos of the last slide's card. */
  photos: StoryPhoto[];
  frameRef: React.Ref<ViewType>;
  /** From `createImageGate`: starts the capture once the frame is ready. */
  gate: ImageGate;
}) => {
  const { width } = useWindowDimensions();
  const colors = FRAME[ctx.isDark ? "dark" : "light"];
  const inner = width - PADDING * 2;
  const handleLayout = () => gate.laidOut();
  const label =
    slide.type === "coming-up" ? String(slide.year) : periodLabel(ctx.period);
  return (
    <ImageGateContext value={gate}>
      <View
        ref={frameRef}
        collapsable={false}
        testID="recap-story-share-frame"
        onLayout={handleLayout}
        style={{
          width,
          height: Math.round(width * RATIO),
          padding: PADDING,
          backgroundColor: colors.background,
          justifyContent: "space-between",
        }}
      >
        <View style={{ gap: 2 }}>
          <FrameText kind="label" color={colors.muted}>
            {label}
          </FrameText>
          <FrameText kind="title" color={colors.text}>
            {headingOf(slide, ctx.period)}
          </FrameText>
        </View>
        <View style={{ alignItems: "center" }}>
          <View style={{ width: inner }}>
            <FrameContent
              slide={slide}
              ctx={ctx}
              photos={photos}
              width={inner}
              colors={colors}
            />
          </View>
        </View>
        <StoryBrand color={colors.text} />
      </View>
    </ImageGateContext>
  );
};
