import dayjs from "dayjs";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import MapPin from "lucide-react-native/icons/map-pin";
import { RADIUS } from "@/constants/Radius";
import type { Person } from "@/features/people";
import type { Tag } from "@/features/tags";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import { CHIP } from "../chipMarker";
import { addDays, daysBetween } from "../days";
import { RingedAvatar } from "../components/RingedAvatar";
import { ChipText } from "../components/TitleChip";
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
import { STORY_PALETTE } from "./theme";
import type {
  ComingUpSlide,
  CoverSlide,
  FirstCitySlide,
  HardPatternSlide,
  LiftedSlide,
  MadeOfSlide,
  MomentsSlide,
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
}

const Gap = ({ size }: { size: number }) => <View style={{ height: size }} />;

const PhotoBackdrop = ({
  photo,
}: {
  photo: NonNullable<FirstCitySlide["photo"]>;
}) => (
  <>
    <StoryImage
      photo={photo.photo}
      style={{ ...StyleSheet.absoluteFill, borderRadius: 0 }}
    />
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
  const month = monthName(ctx.period.start);
  const eyebrow = dayjs(ctx.period.start).format("YYYY");
  const theme = slide.variant === "photo" ? "photo" : "night";
  const byDate = new Map(slide.photos.map((item) => [item.date, item.photo]));
  return (
    <>
      <SlideHeader
        theme={theme}
        eyebrow={`${month} ${eyebrow}`}
        title={
          slide.variant === "pixels" ? (
            <>
              <StoryText kind="number" theme={theme}>
                {slide.checkIns}
              </StoryText>
              {"\n"}
              {t("recaps_story_cover_pixels_title", { month })}
            </>
          ) : (
            t("recaps_story_cover_title", { month })
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
        eyebrow={t("recaps_story_made_of_eyebrow", {
          month: monthName(ctx.period.start),
        })}
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
  const theme = "paper";
  const palette = STORY_PALETTE.paper;
  const hasTag = (day: RecapDay) =>
    day.items.some((item) => item.tags.some(({ id }) => id === tag.id));
  const hardSet = new Set(slide.hardDates);
  const others = ctx.days.filter((day) => !hardSet.has(day.date));
  const hardDays = ctx.days.filter((day) => hardSet.has(day.date));
  const title = t("recaps_story_hard_title", { tag: CHIP });
  return (
    <>
      <View style={{ gap: 8 }}>
        <StoryText kind="eyebrow" theme={theme} tone="accent">
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

// ---------------------------------------------------------------- moments

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
  const count = slide.weeks.filter((week) => week.photo).length;
  return (
    <>
      <SlideHeader
        theme="night"
        eyebrow={t("recaps_story_moments_eyebrow")}
        title={t("recaps_story_moments_title", {
          month: monthName(ctx.period.start),
          count,
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
                overflow: "hidden",
                backgroundColor: STORY_PALETTE.night.surface,
              }}
            >
              {week.photo ? (
                <StoryImage
                  photo={week.photo.photo}
                  label={range}
                  style={{ ...StyleSheet.absoluteFill, borderRadius: 0 }}
                />
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

/** Full-screen photo behind photo slides, under the padded content. */
export const SlideBackdrop = ({ slide }: { slide: StorySlide }) => {
  if (slide.type === "cover" && slide.variant === "photo" && slide.photos[0]) {
    return <PhotoBackdrop photo={slide.photos[0]} />;
  }
  if (slide.type === "first-city" && slide.photo) {
    return <PhotoBackdrop photo={slide.photo} />;
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
    default: {
      return null;
    }
  }
};
