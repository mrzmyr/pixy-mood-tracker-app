import dayjs from "dayjs";
import { View } from "react-native";
import { RADIUS } from "@/constants/radius";
import type { Person } from "@/features/people";
import type { Tag } from "@/features/tags";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import type { DateKey, Period, RecapDay } from "../types";
import { dayRange, monthName } from "./format";
import {
  MonthGrid,
  Pixel,
  SlideHeader,
  StoryImage,
  StoryText,
  TagLabel,
  useDayColors,
} from "./parts";
import { Orbit } from "./orbit";
import { SkyBackdrop } from "./sky-backdrop";
import { StoryIntro } from "./story-intro";
import { STORY_PALETTE } from "./theme";
import type {
  ComingUpSlide,
  CoverSlide,
  NegativeTagsSlide,
  PositiveTagsSlide,
  StorySlide,
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

// ---------------------------------------------------------------- cover

const Cover = ({ slide, ctx }: { slide: CoverSlide; ctx: SlideContext }) => {
  const dayColors = useDayColors(ctx.days);
  const isWeek = ctx.period.kind === "week";
  const month = monthName(ctx.period.start);
  const eyebrow = isWeek
    ? dayRange(ctx.period.start, ctx.period.end)
    : `${month} ${dayjs(ctx.period.start).format("YYYY")}`;
  const byDate = new Map(slide.photos.map((item) => [item.date, item.photo]));
  return (
    <>
      <SlideHeader
        theme="night"
        eyebrow={eyebrow}
        title={
          <>
            <StoryText kind="number" theme="night">
              {slide.checkIns}
            </StoryText>
            {"\n"}
            {isWeek
              ? t("recaps_story_cover_pixels_title_week")
              : t("recaps_story_cover_pixels_title", { month })}
          </>
        }
      />
      <View style={{ marginTop: 28 }}>
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
      </View>
    </>
  );
};

// ---------------------------------------------------------------- tags

/**
 * Tags that felt lighter (`positive-tags`) or heavier (`negative-tags`)
 * than days without them. Bars show the size of the effect.
 */
const TagEffects = ({
  slide,
  ctx,
}: {
  slide: PositiveTagsSlide | NegativeTagsSlide;
  ctx: SlideContext;
}) => {
  const colors = useColors();
  const [top] = slide.rows;
  const topTag = top && ctx.tags.get(top.tagId);
  if (!topTag) {
    return null;
  }
  const isPositive = slide.type === "positive-tags";
  const max = Math.max(...slide.rows.map((row) => Math.abs(row.delta)));
  return (
    <>
      <SlideHeader
        theme="night"
        eyebrow={
          isPositive
            ? t("recaps_story_lifted_eyebrow", {
                month: monthName(ctx.period.start),
              })
            : t("recaps_story_hard_eyebrow")
        }
        title={
          isPositive
            ? t("recaps_story_lifted_title", { tag: topTag.title })
            : t("recaps_story_hard_title", { tag: topTag.title })
        }
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
                    width: `${Math.max(12, (Math.abs(row.delta) / max) * 100)}%`,
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

/** Full-screen layer behind sky slides, under the padded content. */
export const SlideBackdrop = ({ slide }: { slide: StorySlide }) =>
  slide.type === "share" || slide.type === "intro" ? <SkyBackdrop /> : null;

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
    case "positive-tags":
    case "negative-tags": {
      return <TagEffects slide={slide} ctx={ctx} />;
    }
    case "orbit": {
      return <Orbit slide={slide} ctx={ctx} />;
    }
    case "coming-up": {
      return <ComingUp slide={slide} ctx={ctx} />;
    }
    case "intro": {
      return <StoryIntro ctx={ctx} />;
    }
    default: {
      return null;
    }
  }
};
