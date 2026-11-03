import { PixelRatio, useWindowDimensions, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { RADIUS } from "@/constants/radius";
import { SHADOW } from "@/constants/shadow";
import { t } from "@/lib/translation";
import { addDays, daysBetween } from "../days";
import type { Period } from "../types";
import { monthName } from "./format";
import {
  MonthGrid,
  Reveal,
  RevealText,
  SlideCard,
  SlideHeader,
  StoryText,
  useDayColors,
  useMonthLead,
} from "./parts";
import type { SlideContext } from "./slides";
import {
  getStoryTheme,
  revealTextMs,
  STORY_PALETTE,
  STORY_SCREEN_PADDING,
  titleRevealEnd,
} from "./theme";
import type { PlacesSlide, PlacesTrip } from "./types";

const GRID_GAP = 8;
/** Same cap as the cover: only stops tablets. */
const MAX_PIXEL = 56;
/** Band reaches this far past the stay's pixels on each side. */
const BAND_OUTSET = 5;
const BAND_RADIUS = RADIUS.md;
/** Room above the grid for a name tag on the first week. */
const TAG_SPACE = 24;
const TAG_HEIGHT = 20;
/** Time between two stays, after the grid has built. */
const STAY_STEP_MS = 220;

/** One week row of a stay: column, row, and width in days. */
interface Run {
  col: number;
  row: number;
  days: number;
}

/**
 * Week rows a stay covers, start to end, including days without a
 * check-in. A stay across a week break gives two runs.
 */
const getRuns = (trip: PlacesTrip, period: Period, lead: number) => {
  const runs: Run[] = [];
  for (let date = trip.start; date <= trip.end; date = addDays(date, 1)) {
    const cell = lead + daysBetween(period.start, date);
    const col = cell % 7;
    const row = Math.floor(cell / 7);
    const last = runs.at(-1);
    if (last?.row === row) {
      last.days += 1;
    } else {
      runs.push({ col, row, days: 1 });
    }
  }
  return runs;
};

/**
 * The cover's pixel calendar again. Once it has built, a glass band
 * settles behind each stay, so its days keep their mood colors, and the
 * city name sits on top of the band. No mark on home days.
 */
export const HomeAway = ({
  slide,
  ctx,
}: {
  slide: PlacesSlide;
  ctx: SlideContext;
}) => {
  const theme = getStoryTheme(ctx.isDark);
  const palette = STORY_PALETTE[theme];
  const dayColors = useDayColors(ctx.days, "glass");
  const dayOutlines = useDayColors(ctx.days, "glassEdge");
  const lead = useMonthLead(ctx.period.start);
  const { width: screen } = useWindowDimensions();
  const inner = screen - 2 * STORY_SCREEN_PADDING;
  // Same pixel size as the cover, so the grid reads as the same month.
  const size = Math.min(
    MAX_PIXEL,
    PixelRatio.roundToNearestPixel((inner - 6 * GRID_GAP) / 7)
  );
  const step = size + GRID_GAP;
  const gridWidth = 7 * size + 6 * GRID_GAP;
  const title = t("recaps_story_places_title", {
    month: monthName(ctx.period.start),
  });
  const away = t("recaps_story_days", { count: slide.awayDays });
  const text =
    slide.homeDays > 0
      ? t("recaps_story_places_text", {
          away,
          home: t("recaps_story_days", { count: slide.homeDays }),
          city: slide.home,
        })
      : t("recaps_story_places_text_away", { away });
  const textAt = titleRevealEnd(title);
  const gridAt = textAt + revealTextMs(text);
  // Bands start once the grid has built, day by day at 30 ms.
  const staysAt =
    gridAt + (daysBetween(ctx.period.start, ctx.period.end) + 1) * 30 + 200;
  return (
    <>
      <View style={{ gap: 8 }}>
        <SlideHeader theme={theme} title={title} />
        <RevealText
          text={text}
          at={textAt}
          kind="body"
          theme={theme}
          tone="muted"
        />
      </View>
      <SlideCard style={{ alignSelf: "flex-start" }}>
        <View style={{ paddingTop: TAG_SPACE }}>
          {slide.trips.map((trip, index) =>
            getRuns(trip, ctx.period, lead).map((run) => (
              <Animated.View
                key={`${trip.start}-${run.row}`}
                entering={FadeIn.delay(staysAt + index * STAY_STEP_MS).duration(
                  450
                )}
                style={{
                  position: "absolute",
                  left: run.col * step - BAND_OUTSET,
                  top: TAG_SPACE + run.row * step - BAND_OUTSET,
                  width: run.days * step - GRID_GAP + 2 * BAND_OUTSET,
                  height: size + 2 * BAND_OUTSET,
                  borderRadius: BAND_RADIUS,
                  borderCurve: "continuous",
                  backgroundColor: palette.glassBorder,
                  boxShadow: SHADOW.photoCard,
                }}
              />
            ))
          )}
          <MonthGrid
            period={ctx.period}
            dayColors={dayColors}
            dayOutlines={dayOutlines}
            size={size}
            gap={GRID_GAP}
            empty={palette.glass}
            emptyOutline={palette.glassBorder}
            revealAt={gridAt}
          />
          {slide.trips.map((trip, index) => {
            // Name on the stay's longest week row.
            const [run] = getRuns(trip, ctx.period, lead).sort(
              (a, b) => b.days - a.days
            );
            if (!run) {
              return null;
            }
            // Left half: tag starts at the band. Right half: tag ends there.
            const left = run.col * step;
            const right = gridWidth - (run.col + run.days) * step + GRID_GAP;
            return (
              <Reveal
                key={trip.start}
                at={staysAt + index * STAY_STEP_MS + 150}
                style={{
                  position: "absolute",
                  top: TAG_SPACE + run.row * step - TAG_HEIGHT - 2,
                  ...(run.col < 4 ? { left } : { right }),
                  height: TAG_HEIGHT,
                  paddingHorizontal: 7,
                  borderRadius: RADIUS.sm,
                  borderCurve: "continuous",
                  justifyContent: "center",
                  backgroundColor: palette.glassBorder,
                }}
              >
                <StoryText kind="label" theme={theme} numberOfLines={1}>
                  {trip.city}
                </StoryText>
              </Reveal>
            );
          })}
        </View>
      </SlideCard>
    </>
  );
};
