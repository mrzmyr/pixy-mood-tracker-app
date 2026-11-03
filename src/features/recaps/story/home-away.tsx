import House from "lucide-react-native/icons/house";
import { useEffect } from "react";
import { PixelRatio, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { t } from "@/lib/translation";
import { daysBetween } from "../days";
import type { DateKey } from "../types";
import { dayRange, monthName, shortDay } from "./format";
import {
  MonthGrid,
  Pixel,
  Reveal,
  RevealText,
  SlideCard,
  SlideHeader,
  StoryText,
  useDayColors,
} from "./parts";
import type { SlideContext } from "./slides";
import {
  getStoryTheme,
  revealTextMs,
  STORY_BLOCK_GAP,
  STORY_PALETTE,
  STORY_SCREEN_PADDING,
  titleRevealEnd,
} from "./theme";
import type { PlacesSlide, PlacesTrip } from "./types";

const GRID_GAP = 8;
/** Smaller than the cover's pixels, so the rows fit below the grid. */
const MAX_PIXEL = 44;
/** Home days fade to this once the grid has built; days away stay. */
const HOME_OPACITY = 0.28;
const DIM_MS = 600;
/** Trip pixels in a row, at most. */
const ROW_PIXELS = 5;
const ROW_PIXEL = 12;
/** Fixed mark column, so place names line up. */
const MARK_WIDTH = ROW_PIXELS * ROW_PIXEL + (ROW_PIXELS - 1) * 2;
/** Trip rows at most; more trips go into one "and N more" line. */
const MAX_ROWS = 3;
const ROW_STEP_MS = 250;

const dates = (trip: PlacesTrip) =>
  trip.start === trip.end
    ? shortDay(trip.start)
    : dayRange(trip.start, trip.end);

/** Day pixel that fades with the shared `dim` value: home and empty days. */
const DimPixel = ({
  dim,
  children,
}: {
  dim: SharedValue<number>;
  children: React.ReactNode;
}) => {
  const style = useAnimatedStyle(() => ({ opacity: dim.value }));
  return <Animated.View style={style}>{children}</Animated.View>;
};

/** The trip's own day pixels, as small as a glyph. */
const TripPixels = ({
  dates: keys,
  colors,
  outlines,
  empty,
}: {
  dates: DateKey[];
  colors: ReadonlyMap<DateKey, string>;
  outlines: ReadonlyMap<DateKey, string>;
  empty: string;
}) => (
  <View style={{ flexDirection: "row", gap: 2 }}>
    {keys.slice(0, ROW_PIXELS).map((date) => (
      <Pixel
        key={date}
        size={ROW_PIXEL}
        color={colors.get(date) ?? empty}
        outline={outlines.get(date)}
      />
    ))}
  </View>
);

const Row = ({
  at,
  mark,
  name,
  detail,
  ctx,
}: {
  at: number;
  mark: React.ReactNode;
  name: string;
  detail: string;
  ctx: SlideContext;
}) => {
  const theme = getStoryTheme(ctx.isDark);
  return (
    <Reveal
      at={at}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
      }}
    >
      <View style={{ width: MARK_WIDTH }}>{mark}</View>
      <StoryText
        kind="label"
        theme={theme}
        numberOfLines={1}
        style={{ flexShrink: 1 }}
      >
        {name}
      </StoryText>
      <StoryText
        kind="label"
        theme={theme}
        tone="muted"
        style={{ marginLeft: "auto" }}
      >
        {detail}
      </StoryText>
    </Reveal>
  );
};

/**
 * The cover's pixel calendar again. Once it has built, home days fade back
 * and the days away keep their color: no mark on any day. Rows below start
 * with each trip's own day pixels, then home with its days.
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
  const { width: screen } = useWindowDimensions();
  const inner = screen - 2 * STORY_SCREEN_PADDING;
  const size = Math.min(
    MAX_PIXEL,
    PixelRatio.roundToNearestPixel((inner - 6 * GRID_GAP) / 7)
  );
  const month = monthName(ctx.period.start);
  // On the move: more than half of the check-in days away.
  const title =
    slide.awayDays * 2 > ctx.days.length
      ? t("recaps_story_places_title_move", { month })
      : t("recaps_story_places_title", { count: slide.trips.length });
  const awayText = t("recaps_story_days", { count: slide.awayDays });
  const text =
    slide.homeDays > 0
      ? t("recaps_story_places_text", {
          away: awayText,
          home: t("recaps_story_days", { count: slide.homeDays }),
          city: slide.home,
        })
      : t("recaps_story_places_text_away", { away: awayText });
  const textAt = titleRevealEnd(title);
  const gridAt = textAt + revealTextMs(text);
  // Home fades once the grid has built, day by day at 30 ms.
  const dimAt =
    gridAt + (daysBetween(ctx.period.start, ctx.period.end) + 1) * 30 + 200;
  const rowsAt = dimAt + DIM_MS;
  const away = new Set(slide.trips.flatMap((trip) => trip.dates));
  const dim = useSharedValue(1);
  useEffect(() => {
    dim.set(
      withDelay(
        dimAt,
        withTiming(HOME_OPACITY, {
          duration: DIM_MS,
          easing: Easing.out(Easing.cubic),
        })
      )
    );
  }, [dim, dimAt]);
  const shown = slide.trips.slice(
    0,
    slide.trips.length > MAX_ROWS ? MAX_ROWS - 1 : MAX_ROWS
  );
  const rest = slide.trips.length - shown.length;
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
      <SlideCard theme={theme} style={{ gap: STORY_BLOCK_GAP }}>
        <View style={{ alignSelf: "flex-start" }}>
          <MonthGrid
            period={ctx.period}
            dayColors={dayColors}
            dayOutlines={dayOutlines}
            size={size}
            gap={GRID_GAP}
            empty={palette.glass}
            emptyOutline={palette.glassBorder}
            revealAt={gridAt}
            render={(date) =>
              away.has(date) ? null : (
                <DimPixel dim={dim}>
                  <Pixel
                    size={size}
                    color={dayColors.get(date) ?? palette.glass}
                    outline={dayOutlines.get(date) ?? palette.glassBorder}
                  />
                </DimPixel>
              )
            }
          />
        </View>
        <View style={{ gap: 12 }}>
          {shown.map((trip, index) => (
            <Row
              key={`${trip.city}-${trip.start}`}
              at={rowsAt + index * ROW_STEP_MS}
              mark={
                <TripPixels
                  dates={trip.dates}
                  colors={dayColors}
                  outlines={dayOutlines}
                  empty={palette.glass}
                />
              }
              name={trip.city}
              detail={dates(trip)}
              ctx={ctx}
            />
          ))}
          {rest > 0 && (
            <Row
              at={rowsAt + shown.length * ROW_STEP_MS}
              mark={
                <TripPixels
                  dates={slide.trips
                    .slice(shown.length)
                    .flatMap((trip) => trip.dates)}
                  colors={dayColors}
                  outlines={dayOutlines}
                  empty={palette.glass}
                />
              }
              name={t("recaps_story_places_more", { count: rest })}
              detail={t("recaps_story_days", {
                count: slide.trips
                  .slice(shown.length)
                  .reduce((sum, trip) => sum + trip.dates.length, 0),
              })}
              ctx={ctx}
            />
          )}
          {slide.homeDays > 0 && (
            <Row
              at={rowsAt + (shown.length + (rest > 0 ? 1 : 0)) * ROW_STEP_MS}
              mark={<House size={14} color={palette.muted} />}
              name={slide.home}
              detail={t("recaps_story_days", { count: slide.homeDays })}
              ctx={ctx}
            />
          )}
        </View>
      </SlideCard>
    </>
  );
};
