import dayjs from "dayjs";
import { PixelRatio, useWindowDimensions, View } from "react-native";
import type { Person } from "@/features/people";
import type { Tag } from "@/features/tags";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import type { DateKey, Period, RecapDay } from "../types";
import { monthName } from "./format";
import {
  MonthGrid,
  Pixel,
  Reveal,
  RevealBar,
  RevealText,
  SlideCard,
  SlideHeader,
  StoryImage,
  StoryText,
  TagDot,
  useDayColors,
} from "./parts";
import { Orbit } from "./orbit";
import { SkyFlightZone } from "@/components/sky-flight-zone";
import { StoryIntro } from "./story-intro";
import {
  getStoryTheme,
  STORY_BLOCK_GAP,
  STORY_PALETTE,
  STORY_SCREEN_PADDING,
  revealTextMs,
  titleRevealEnd,
} from "./theme";
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

// ---------------------------------------------------------------- cover

const GRID_GAP = 8;
const MAX_PIXEL = 56;

const Cover = ({ slide, ctx }: { slide: CoverSlide; ctx: SlideContext }) => {
  const theme = getStoryTheme(ctx.isDark);
  const palette = STORY_PALETTE[theme];
  const dayColors = useDayColors(ctx.days, "glass");
  const dayOutlines = useDayColors(ctx.days, "glassEdge");
  const isWeek = ctx.period.kind === "week";
  const month = monthName(ctx.period.start);
  const byDate = new Map(slide.photos.map((item) => [item.date, item.photo]));
  // 7 pixels a row fill the content width. The cap only stops tablets.
  const { width: screen } = useWindowDimensions();
  const inner = screen - 2 * STORY_SCREEN_PADDING;
  const size = Math.min(
    MAX_PIXEL,
    PixelRatio.roundToNearestPixel((inner - 6 * GRID_GAP) / 7)
  );
  const title = isWeek
    ? t("recaps_story_cover_pixels_title_week")
    : t("recaps_story_cover_pixels_title", { month });
  return (
    <>
      <SlideHeader
        theme={theme}
        lead={
          <StoryText kind="number" theme={theme}>
            {slide.checkIns}
          </StoryText>
        }
        title={title}
      />
      {/* Hugs the grid: on tablets the pixels stop short of the width. */}
      <SlideCard theme={theme} style={{ alignSelf: "flex-start" }}>
        <MonthGrid
          period={ctx.period}
          dayColors={dayColors}
          dayOutlines={dayOutlines}
          size={size}
          gap={GRID_GAP}
          empty={palette.glass}
          emptyOutline={palette.glassBorder}
          revealAt={titleRevealEnd(title)}
          revealStepMs={isWeek ? 90 : 30}
          render={(date) => {
            const photo = byDate.get(date);
            return photo ? (
              <StoryImage
                photo={photo}
                // oxlint-disable-next-line pixy-standards/radius-token -- story artwork, drawn at story scale
                style={{ width: size, height: size, borderRadius: 9 }}
              />
            ) : null;
          }}
        />
      </SlideCard>
    </>
  );
};

// ---------------------------------------------------------------- tags

/** Time between two tag rows of the build-up. */
const ROW_STEP_MS = 450;

/**
 * Tags that felt lighter (`positive-tags`) or heavier (`negative-tags`)
 * than days without them. Bars show the size of the effect. Each row
 * builds left to right: dot, name and days, then the bar fills.
 */
const TagEffects = ({
  slide,
  ctx,
}: {
  slide: PositiveTagsSlide | NegativeTagsSlide;
  ctx: SlideContext;
}) => {
  const theme = getStoryTheme(ctx.isDark);
  const colors = useColors();
  const [top] = slide.rows;
  const topTag = top && ctx.tags.get(top.tagId);
  if (!topTag) {
    return null;
  }
  const isPositive = slide.type === "positive-tags";
  const max = Math.max(...slide.rows.map((row) => Math.abs(row.delta)));
  const title = isPositive
    ? t("recaps_story_lifted_title", { tag: topTag.title })
    : t("recaps_story_hard_title", { tag: topTag.title });
  const start = titleRevealEnd(title);
  const rowAt = (index: number) => start + index * ROW_STEP_MS;
  const note = t("recaps_story_lifted_text", { count: ctx.days.length });
  return (
    <>
      <SlideHeader theme={theme} title={title} />
      <SlideCard theme={theme} style={{ gap: STORY_BLOCK_GAP }}>
        {slide.rows.map((row, index) => {
          const tag = ctx.tags.get(row.tagId);
          if (!tag) {
            return null;
          }
          const days = t("recaps_story_days", { count: row.days });
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
                  <Reveal at={rowAt(index)}>
                    <TagDot tag={tag} />
                  </Reveal>
                  <RevealText
                    text={tag.title}
                    at={rowAt(index)}
                    kind="label"
                    theme={theme}
                  />
                </View>
                <RevealText
                  text={days}
                  at={rowAt(index) + revealTextMs(tag.title)}
                  kind="label"
                  theme={theme}
                  tone="muted"
                />
              </View>
              <RevealBar
                share={Math.max(0.08, Math.abs(row.delta) / max)}
                color={colors.tags[tag.color]?.dot}
                theme={theme}
                at={rowAt(index) + 150}
              />
            </View>
          );
        })}
        <RevealText
          text={note}
          at={rowAt(slide.rows.length)}
          kind="body"
          theme={theme}
          tone="muted"
        />
      </SlideCard>
    </>
  );
};

// ---------------------------------------------------------------- coming up

const MONTHS = Array.from({ length: 12 }, (_, index) => index);

/** Time between two months of the build-up. */
const MONTH_STEP_MS = 90;

const ComingUp = ({
  slide,
  ctx,
}: {
  slide: ComingUpSlide;
  ctx: SlideContext;
}) => {
  const theme = getStoryTheme(ctx.isDark);
  const palette = STORY_PALETTE[theme];
  const { year } = slide;
  const yearDays = ctx.history.filter((day) => day.date.startsWith(`${year}-`));
  const dayColors = useDayColors(yearDays, "glass");
  const dayOutlines = useDayColors(yearDays, "glassEdge");
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
            backgroundColor: palette.muted,
            opacity: 0.6,
          }}
        />
      </View>
    ) : null;
  const title = t("recaps_story_coming_title", { count: slide.left, year });
  const start = titleRevealEnd(title);
  const legendAt = start + MONTHS.length * MONTH_STEP_MS + 200;
  const missed = t("recaps_story_coming_missed", { count: slide.missed });
  const left = t("recaps_story_coming_left", { count: slide.left });
  return (
    <>
      <SlideHeader theme={theme} title={title} />
      <SlideCard theme={theme}>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "space-between",
            rowGap: 22,
          }}
        >
          {MONTHS.map((month) => {
            const monthStart = dayjs(`${year}-01-01`).add(month, "month");
            const period: Period = {
              kind: "month",
              start: monthStart.format("YYYY-MM-DD"),
              end: monthStart.endOf("month").format("YYYY-MM-DD"),
            };
            return (
              <Reveal
                key={month}
                at={start + month * MONTH_STEP_MS}
                style={{ gap: 6 }}
              >
                <StoryText
                  kind="label"
                  theme={theme}
                  tone="muted"
                  style={{ fontSize: 12 }}
                >
                  {monthStart.format("MMM")}
                </StoryText>
                <MonthGrid
                  period={period}
                  dayColors={dayColors}
                  dayOutlines={dayOutlines}
                  size={size}
                  gap={2}
                  empty={palette.glass}
                  emptyOutline={palette.glassBorder}
                  render={pending}
                />
              </Reveal>
            );
          })}
        </View>
        <View
          style={{ flexDirection: "row", gap: 20, marginTop: STORY_BLOCK_GAP }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Reveal at={legendAt}>
              <Pixel
                size={10}
                color={palette.glass}
                outline={palette.glassBorder}
              />
            </Reveal>
            <RevealText
              text={missed}
              at={legendAt}
              kind="label"
              theme={theme}
              tone="muted"
              style={{ fontSize: 12 }}
            />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Reveal at={legendAt + revealTextMs(missed)}>
              <View
                style={{
                  width: 3,
                  height: 3,
                  borderRadius: 2,
                  backgroundColor: palette.muted,
                }}
              />
            </Reveal>
            <RevealText
              text={left}
              at={legendAt + revealTextMs(missed)}
              kind="label"
              theme={theme}
              tone="muted"
              style={{ fontSize: 12 }}
            />
          </View>
        </View>
      </SlideCard>
    </>
  );
};

const SlideBody = ({
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
    default: {
      return null;
    }
  }
};

/**
 * Content of one slide. The player draws background and chrome. Cloud Pixy
 * stays around: it flies in the free sky below the content.
 */
export const SlideContent = ({
  slide,
  ctx,
}: {
  slide: StorySlide;
  ctx: SlideContext;
}) =>
  slide.type === "intro" ? (
    <StoryIntro ctx={ctx} />
  ) : (
    <View style={{ flex: 1 }}>
      <SlideBody slide={slide} ctx={ctx} />
      <SkyFlightZone style={{ flex: 1, marginTop: STORY_BLOCK_GAP }} />
    </View>
  );
